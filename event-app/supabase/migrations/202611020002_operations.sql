-- Operational modules. No seed rows, external messages or actual event import.
create table public.operations_grants (
 edition_id uuid not null,user_id uuid not null,can_registration boolean not null default false,
 version integer not null default 1 check(version>0),primary key(edition_id,user_id),
 foreign key(edition_id,user_id) references public.crew_members(edition_id,user_id)
);
create table public.operations_zones (
 id uuid primary key default gen_random_uuid(),edition_id uuid not null references public.editions,
 name text not null check(length(btrim(name)) between 1 and 150),instructions text not null default '' check(length(instructions)<=10000),
 color text not null default 'cat-0' check(color ~ '^cat-([0-9]|1[01])$'),
 leader_roster_id uuid,contact_name text not null default '' check(length(contact_name)<=200),contact_phone text not null default '' check(length(contact_phone)<=100),
 map_x numeric(7,3) check(map_x between 0 and 100),map_y numeric(7,3) check(map_y between 0 and 100),
 archived boolean not null default false,version integer not null default 1 check(version>0),unique(id,edition_id),
 foreign key(leader_roster_id,edition_id) references public.crew_roster(id,edition_id),check((map_x is null)=(map_y is null))
);
create table public.operations_tasks (
 id uuid primary key default gen_random_uuid(),edition_id uuid not null references public.editions,
 title text not null check(length(btrim(title)) between 1 and 200),description text not null default '' check(length(description)<=10000),
 status text not null default 'todo' check(status in ('todo','in_progress','blocked','done','cancelled')),
 assignee_roster_id uuid,zone_id uuid,starts_at timestamp without time zone,ends_at timestamp without time zone,due_at timestamp without time zone,
 archived boolean not null default false,version integer not null default 1 check(version>0),unique(id,edition_id),
 foreign key(assignee_roster_id,edition_id) references public.crew_roster(id,edition_id),foreign key(zone_id,edition_id) references public.operations_zones(id,edition_id),
 check(starts_at is null or ends_at is null or ends_at>=starts_at)
);
create table public.operations_registrations (
 id uuid primary key default gen_random_uuid(),edition_id uuid not null references public.editions,
 full_name text not null check(length(btrim(full_name)) between 1 and 200),email text not null default '' check(length(email)<=500),phone text not null default '' check(length(phone)<=500),
 category_label text not null default '' check(length(category_label)<=150),bib text not null default '' check(length(bib)<=30),
 status text not null default 'new' check(status in ('new','review','confirmed','cancelled')),
 fee_due bigint check(fee_due between 0 and 99999999999),fee_paid bigint check(fee_paid between 0 and 99999999999),
 notes text not null default '' check(length(notes)<=10000),archived boolean not null default false,version integer not null default 1 check(version>0),unique(id,edition_id)
);
create index operations_task_edition_idx on public.operations_tasks(edition_id,starts_at);
create index operations_registration_edition_idx on public.operations_registrations(edition_id,status);
create function public.operations_registration_access(e uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.crew_role(e)='admin',false) or (public.crew_role(e) is not null and exists(select 1 from public.operations_grants where edition_id=e and user_id=auth.uid() and can_registration));
$$;
alter table public.operations_grants enable row level security;
alter table public.operations_zones enable row level security;
alter table public.operations_tasks enable row level security;
alter table public.operations_registrations enable row level security;
create policy operations_grants_read on public.operations_grants for select to authenticated using(public.crew_role(edition_id)='admin' or (user_id=auth.uid() and public.crew_role(edition_id) is not null));
create policy operations_zones_read on public.operations_zones for select to authenticated using(public.crew_role(edition_id) is not null);
create policy operations_tasks_read on public.operations_tasks for select to authenticated using(public.crew_editor(edition_id) or (public.crew_role(edition_id) is not null and exists(select 1 from public.crew_roster r where r.id=assignee_roster_id and r.edition_id=operations_tasks.edition_id and r.linked_user_id=auth.uid())));
create policy operations_registrations_read on public.operations_registrations for select to authenticated using(public.operations_registration_access(edition_id));
create function public.operations_write(e uuid,k text,p jsonb,request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid();rid uuid;v integer;previous jsonb;result jsonb;fp text;cached public.crew_requests;allowed text[];strings text[];key text;
begin
 if k is null or k not in ('zone','task','registration','registration_grant') then raise exception 'OPERATIONS_INVALID_INPUT' using errcode='22023'; end if;
 if k='registration_grant' then perform public.require_crew_writer(e,'member');
 elsif k='registration' then
  if not public.operations_registration_access(e) then raise exception 'OPERATIONS_ACCESS_DENIED' using errcode='42501'; end if;
  perform 1 from public.editions where id=e and not archived for share;
  if not found then raise exception 'OPERATIONS_EDITION_ARCHIVED' using errcode='42501'; end if;
  if not public.operations_registration_access(e) then raise exception 'OPERATIONS_ACCESS_DENIED' using errcode='42501'; end if;
 else perform public.require_crew_writer(e,'roster');end if;
 if uid is null or request_id is null or p is null or jsonb_typeof(p)<>'object' then raise exception 'OPERATIONS_INVALID_INPUT' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(e::text||uid::text||request_id::text,0));fp:=encode(sha256(convert_to('operations:'||k||p::text,'UTF8')),'hex');
 select * into cached from public.crew_requests q where q.edition_id=e and q.actor_id=uid and q.request_id=operations_write.request_id;
 if found then if cached.fingerprint<>fp then raise exception 'OPERATIONS_REQUEST_REUSED' using errcode='40001';end if;return cached.response;end if;
 allowed:=case k when 'zone' then array['id','version','name','instructions','color','leader_roster_id','contact_name','contact_phone','map_x','map_y','archived']
 when 'task' then array['id','version','title','description','status','assignee_roster_id','zone_id','starts_at','ends_at','due_at','archived']
 when 'registration' then array['id','version','full_name','email','phone','category_label','bib','status','fee_due','fee_paid','notes','archived']
 else array['user_id','version','can_registration'] end;
 if exists(select 1 from jsonb_object_keys(p) x where not(x=any(allowed))) or not(p ? 'version') or jsonb_typeof(p->'version')<>'number' or (p->>'version') !~ '^(0|[1-9][0-9]*)$' then raise exception 'OPERATIONS_INVALID_INPUT' using errcode='22023';end if;
 v:=(p->>'version')::integer;
 strings:=case k when 'zone' then array['name','instructions','color','contact_name','contact_phone'] when 'task' then array['title','description','status'] when 'registration' then array['full_name','email','phone','category_label','bib','status','notes'] else array[]::text[] end;
 foreach key in array strings loop if p ? key and jsonb_typeof(p->key)<>'string' then raise exception 'OPERATIONS_INVALID_INPUT' using errcode='22023';end if;end loop;
 foreach key in array array['archived','can_registration'] loop if p ? key and jsonb_typeof(p->key)<>'boolean' then raise exception 'OPERATIONS_INVALID_INPUT' using errcode='22023';end if;end loop;
 foreach key in array array['fee_due','fee_paid'] loop if p ? key and jsonb_typeof(p->key)<>'null' and (jsonb_typeof(p->key)<>'number' or (p->>key) !~ '^(0|[1-9][0-9]*)$') then raise exception 'OPERATIONS_INVALID_INPUT' using errcode='22023';end if;end loop;
 foreach key in array array['map_x','map_y'] loop if p ? key and jsonb_typeof(p->key) not in ('number','null') then raise exception 'OPERATIONS_INVALID_INPUT' using errcode='22023';end if;if jsonb_typeof(p->key)='number' and ((p->>key)::numeric<0 or (p->>key)::numeric>100) then raise exception 'OPERATIONS_INVALID_INPUT' using errcode='22023';end if;end loop;
 foreach key in array array['starts_at','ends_at','due_at'] loop
  if p ? key and jsonb_typeof(p->key)<>'null' and (jsonb_typeof(p->key)<>'string' or ((p->>key)<>'' and (p->>key) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[T ]([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$')) then raise exception 'OPERATIONS_INVALID_INPUT' using errcode='22023';end if;
 end loop;
 if k='registration_grant' then rid:=(p->>'user_id')::uuid;else rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());end if;
 if rid is null then raise exception 'OPERATIONS_INVALID_INPUT' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('operations:'||k||rid::text,1));
 if k='zone' then
  select to_jsonb(z) into previous from public.operations_zones z where id=rid and edition_id=e for update;
  if not found and exists(select 1 from public.operations_zones where id=rid) then raise exception 'OPERATIONS_ACCESS_DENIED' using errcode='42501';end if;
  if coalesce((previous->>'version')::integer,0)<>v then raise exception 'OPERATIONS_VERSION_CONFLICT' using errcode='40001';end if;
  insert into public.operations_zones values(rid,e,btrim(p->>'name'),coalesce(p->>'instructions',''),coalesce(p->>'color','cat-0'),nullif(p->>'leader_roster_id','')::uuid,coalesce(p->>'contact_name',''),coalesce(p->>'contact_phone',''),(p->>'map_x')::numeric,(p->>'map_y')::numeric,coalesce((p->>'archived')::boolean,false),v+1)
  on conflict(id) do update set name=excluded.name,instructions=excluded.instructions,color=excluded.color,leader_roster_id=excluded.leader_roster_id,contact_name=excluded.contact_name,contact_phone=excluded.contact_phone,map_x=excluded.map_x,map_y=excluded.map_y,archived=excluded.archived,version=excluded.version returning to_jsonb(operations_zones.*) into result;
 elsif k='task' then
  select to_jsonb(t) into previous from public.operations_tasks t where id=rid and edition_id=e for update;
  if not found and exists(select 1 from public.operations_tasks where id=rid) then raise exception 'OPERATIONS_ACCESS_DENIED' using errcode='42501';end if;
  if coalesce((previous->>'version')::integer,0)<>v then raise exception 'OPERATIONS_VERSION_CONFLICT' using errcode='40001';end if;
  insert into public.operations_tasks values(rid,e,btrim(p->>'title'),coalesce(p->>'description',''),coalesce(p->>'status','todo'),nullif(p->>'assignee_roster_id','')::uuid,nullif(p->>'zone_id','')::uuid,nullif(p->>'starts_at','')::timestamp,nullif(p->>'ends_at','')::timestamp,nullif(p->>'due_at','')::timestamp,coalesce((p->>'archived')::boolean,false),v+1)
  on conflict(id) do update set title=excluded.title,description=excluded.description,status=excluded.status,assignee_roster_id=excluded.assignee_roster_id,zone_id=excluded.zone_id,starts_at=excluded.starts_at,ends_at=excluded.ends_at,due_at=excluded.due_at,archived=excluded.archived,version=excluded.version returning to_jsonb(operations_tasks.*) into result;
 elsif k='registration' then
  select to_jsonb(r) into previous from public.operations_registrations r where id=rid and edition_id=e for update;
  if not found and exists(select 1 from public.operations_registrations where id=rid) then raise exception 'OPERATIONS_ACCESS_DENIED' using errcode='42501';end if;
  if coalesce((previous->>'version')::integer,0)<>v then raise exception 'OPERATIONS_VERSION_CONFLICT' using errcode='40001';end if;
  insert into public.operations_registrations values(rid,e,btrim(p->>'full_name'),coalesce(p->>'email',''),coalesce(p->>'phone',''),coalesce(p->>'category_label',''),coalesce(p->>'bib',''),coalesce(p->>'status','new'),(p->>'fee_due')::bigint,(p->>'fee_paid')::bigint,coalesce(p->>'notes',''),coalesce((p->>'archived')::boolean,false),v+1)
  on conflict(id) do update set full_name=excluded.full_name,email=excluded.email,phone=excluded.phone,category_label=excluded.category_label,bib=excluded.bib,status=excluded.status,fee_due=excluded.fee_due,fee_paid=excluded.fee_paid,notes=excluded.notes,archived=excluded.archived,version=excluded.version returning to_jsonb(operations_registrations.*) into result;
 else
  select to_jsonb(g) into previous from public.operations_grants g where edition_id=e and user_id=rid for update;
  if coalesce((previous->>'version')::integer,0)<>v then raise exception 'OPERATIONS_VERSION_CONFLICT' using errcode='40001';end if;
  insert into public.operations_grants values(e,rid,coalesce((p->>'can_registration')::boolean,false),v+1) on conflict(edition_id,user_id) do update set can_registration=excluded.can_registration,version=excluded.version returning to_jsonb(operations_grants.*) into result;
 end if;
 insert into public.crew_audit(edition_id,actor_id,kind,entity_id,old_data,new_data) values(e,uid,'operations:'||k,rid,previous,result);
 insert into public.crew_requests values(e,uid,request_id,fp,result);return result;
exception when unique_violation then raise exception 'OPERATIONS_DUPLICATE' using errcode='23505';
 when check_violation or not_null_violation or foreign_key_violation or invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow or invalid_datetime_format then raise exception 'OPERATIONS_INVALID_INPUT' using errcode='22023';
end;
$$;
revoke all on public.operations_grants,public.operations_zones,public.operations_tasks,public.operations_registrations from public,anon,authenticated;
grant select on public.operations_grants,public.operations_zones,public.operations_tasks,public.operations_registrations to authenticated;
revoke all on function public.operations_registration_access(uuid),public.operations_write(uuid,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.operations_registration_access(uuid),public.operations_write(uuid,text,jsonb,uuid) to authenticated;
