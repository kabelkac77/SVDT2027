-- Shared crew V1. Schema-only migration; never imports local personnel records.
create table public.crew_members (
 edition_id uuid not null references public.editions, user_id uuid not null references auth.users,
 role text not null check(role in ('admin','coordinator','member')), enabled boolean not null default true,
 can_finance boolean not null default false, version integer not null default 1 check(version>0),
 primary key(edition_id,user_id), check(not can_finance or role in ('admin','coordinator'))
);
create table public.crew_categories (
 id uuid primary key default gen_random_uuid(), edition_id uuid not null references public.editions,
 name text not null check(length(btrim(name)) between 1 and 100), color text not null default 'cat-0' check(color ~ '^cat-([0-9]|1[01])$'),
 required_count integer check(required_count between 0 and 10000), required_term text not null default '' check(length(required_term)<=1000),
 version integer not null default 1 check(version>0), unique(id,edition_id), unique(edition_id,name)
);
create table public.crew_roster (
 id uuid primary key default gen_random_uuid(), edition_id uuid not null references public.editions,
 category_id uuid not null, person_id uuid references public.people, linked_user_id uuid,
 kind text not null default 'unresolved' check(kind in ('person','group','unresolved')),
 name text not null check(length(btrim(name)) between 1 and 200),
 position text not null default '' check(length(position)<=500), owner_label text not null default '' check(length(owner_label)<=500),
 email text not null default '' check(length(email)<=500), phone text not null default '' check(length(phone)<=500),
 status text not null default 'candidate' check(status in ('candidate','contacted','confirmed','declined','unknown')),
 term text not null default '' check(length(term)<=1000), friday text not null default '' check(length(friday)<=100), saturday text not null default '' check(length(saturday)<=100),
 notes text not null default '' check(length(notes)<=10000), archived boolean not null default false,
 version integer not null default 1 check(version>0), unique(id,edition_id),
 foreign key(category_id,edition_id) references public.crew_categories(id,edition_id),
 foreign key(edition_id,linked_user_id) references public.crew_members(edition_id,user_id),
 check((kind='person')=(person_id is not null)), check(status<>'confirmed' or btrim(term)<>'')
);
create table public.crew_compensation (
 roster_id uuid primary key, edition_id uuid not null,
 estimate bigint check(estimate between 0 and 99999999999), agreed bigint check(agreed between 0 and 99999999999),
 total bigint check(total between 0 and 99999999999), paid bigint check(paid between 0 and 99999999999),
 barter text not null default '' check(length(barter)<=4000), merch text not null default '' check(length(merch)<=2000),
 version integer not null default 1 check(version>0), foreign key(roster_id,edition_id) references public.crew_roster(id,edition_id)
);
create table public.crew_audit (
 id uuid primary key default gen_random_uuid(), edition_id uuid not null references public.editions,
 actor_id uuid not null references auth.users, kind text not null, entity_id uuid not null,
 old_data jsonb, new_data jsonb not null, created_at timestamptz not null default now()
);
create table public.crew_requests (
 edition_id uuid not null references public.editions, actor_id uuid not null references auth.users,
 request_id uuid not null, fingerprint text not null, response jsonb not null,
 primary key(edition_id,actor_id,request_id)
);
create index crew_roster_edition_idx on public.crew_roster(edition_id,category_id);
create index crew_roster_link_idx on public.crew_roster(linked_user_id,edition_id);
create index crew_members_user_idx on public.crew_members(user_id,edition_id);
create function public.crew_role(e uuid) returns text language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from public.edition_members where edition_id=e and user_id=auth.uid() and role='admin') then 'admin'
 else (select role from public.crew_members where edition_id=e and user_id=auth.uid() and enabled) end;
$$;
create function public.crew_editor(e uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.crew_role(e) in ('admin','coordinator'),false);
$$;
create function public.crew_finance(e uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.crew_role(e)='admin',false) or exists(select 1 from public.crew_members where edition_id=e and user_id=auth.uid() and enabled and can_finance and role='coordinator');
$$;
create function public.require_crew_writer(e uuid, k text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not (case when k='member' then coalesce(public.crew_role(e)='admin',false) when k='compensation' then public.crew_finance(e) else public.crew_editor(e) end) then raise exception 'CREW_ACCESS_DENIED' using errcode='42501'; end if;
 if k='member' then perform 1 from public.editions where id=e and not archived for update; else perform 1 from public.editions where id=e and not archived for share; end if;
 if not found then raise exception 'CREW_EDITION_ARCHIVED' using errcode='42501'; end if;
 if not (case when k='member' then coalesce(public.crew_role(e)='admin',false) when k='compensation' then public.crew_finance(e) else public.crew_editor(e) end) then raise exception 'CREW_ACCESS_DENIED' using errcode='42501'; end if;
end;
$$;
alter table public.crew_members enable row level security;
alter table public.crew_categories enable row level security;
alter table public.crew_roster enable row level security;
alter table public.crew_compensation enable row level security;
alter table public.crew_audit enable row level security;
alter table public.crew_requests enable row level security;
create policy crew_editions_read on public.editions for select to authenticated using(public.crew_role(id) is not null);
create policy crew_event_read on public.events for select to authenticated using(exists(select 1 from public.editions where event_id=events.id and public.crew_role(id) is not null));
create policy crew_members_read on public.crew_members for select to authenticated using(public.crew_role(edition_id)='admin' or (user_id=auth.uid() and enabled));
create policy crew_categories_read on public.crew_categories for select to authenticated using(public.crew_role(edition_id) is not null);
create policy crew_roster_read on public.crew_roster for select to authenticated using(public.crew_editor(edition_id) or (public.crew_role(edition_id) is not null and linked_user_id=auth.uid()));
create policy crew_compensation_read on public.crew_compensation for select to authenticated using(public.crew_finance(edition_id));
create policy crew_audit_read on public.crew_audit for select to authenticated using(public.crew_role(edition_id)='admin');
-- No requests policy: even old cached write responses remain private to checked RPC execution.
create function public.crew_write(e uuid,k text,p jsonb,request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); rid uuid; v integer; previous jsonb; result jsonb; fp text; cached public.crew_requests;
 allowed text[]; strings text[]; key text; target uuid; pid uuid; role_value text; enabled_value boolean; finance_value boolean;
begin
 if k not in ('category','roster','compensation','member') or k is null then raise exception 'CREW_INVALID_KIND' using errcode='22023'; end if;
 perform public.require_crew_writer(e,k);
 if request_id is null or p is null or jsonb_typeof(p)<>'object' then raise exception 'CREW_INVALID_INPUT' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(e::text||uid::text||request_id::text,0));
 fp:=encode(sha256(convert_to(k||p::text,'UTF8')),'hex');
 select * into cached from public.crew_requests q where q.edition_id=e and q.actor_id=uid and q.request_id=crew_write.request_id;
 if found then
  if cached.fingerprint<>fp then raise exception 'CREW_REQUEST_REUSED' using errcode='40001'; end if;
  return cached.response;
 end if;
 allowed:=case k when 'category' then array['id','version','name','color','required_count','required_term']
 when 'roster' then array['id','version','category_id','person_id','linked_user_id','kind','name','position','owner_label','email','phone','status','term','friday','saturday','notes','archived']
 when 'compensation' then array['id','version','estimate','agreed','total','paid','barter','merch']
 else array['user_id','email','version','role','enabled','can_finance'] end;
 if exists(select 1 from jsonb_object_keys(p) x where not(x=any(allowed))) or not(p ? 'version') or jsonb_typeof(p->'version')<>'number' or (p->>'version') !~ '^(0|[1-9][0-9]*)$' then raise exception 'CREW_INVALID_INPUT' using errcode='22023'; end if;
 v:=(p->>'version')::integer;
 strings:=case k when 'category' then array['name','color','required_term'] when 'roster' then array['kind','name','position','owner_label','email','phone','status','term','friday','saturday','notes'] when 'compensation' then array['barter','merch'] else array['email','role'] end;
 foreach key in array strings loop
  if p ? key and jsonb_typeof(p->key)<>'string' then raise exception 'CREW_INVALID_INPUT' using errcode='22023'; end if;
 end loop;
 foreach key in array array['archived','enabled','can_finance'] loop
  if p ? key and jsonb_typeof(p->key)<>'boolean' then raise exception 'CREW_INVALID_INPUT' using errcode='22023'; end if;
 end loop;
 foreach key in array array['required_count','estimate','agreed','total','paid'] loop
  if p ? key and jsonb_typeof(p->key)<>'null' and (jsonb_typeof(p->key)<>'number' or (p->>key) !~ '^(0|[1-9][0-9]*)$') then raise exception 'CREW_INVALID_INPUT' using errcode='22023'; end if;
 end loop;
 if k='member' then
  if nullif(p->>'email','') is not null then
   select id into target from auth.users where lower(email)=lower(btrim(p->>'email'));
   if not found then raise exception 'CREW_ACCOUNT_NOT_FOUND' using errcode='22023'; end if;
  else target:=nullif(p->>'user_id','')::uuid; end if;
  if target is null then raise exception 'CREW_ACCOUNT_NOT_FOUND' using errcode='22023'; end if;
  if p ? 'user_id' and nullif(p->>'user_id','')::uuid is distinct from target then raise exception 'CREW_INVALID_INPUT' using errcode='22023'; end if;
  role_value:=p->>'role';enabled_value:=coalesce((p->>'enabled')::boolean,true);finance_value:=coalesce((p->>'can_finance')::boolean,false);
  if exists(select 1 from public.edition_members where edition_id=e and user_id=target and role='admin') and (role_value is distinct from 'admin' or not enabled_value) then raise exception 'CREW_INHERITED_ADMIN' using errcode='42501'; end if;
  select to_jsonb(m) into previous from public.crew_members m where edition_id=e and user_id=target for update;
  if coalesce((previous->>'version')::integer,0)<>v then raise exception 'CREW_VERSION_CONFLICT' using errcode='40001'; end if;
  if not(enabled_value and role_value='admin') and previous->>'role'='admin' and not exists(select 1 from public.edition_members where edition_id=e and role='admin') and not exists(select 1 from public.crew_members where edition_id=e and user_id<>target and role='admin' and enabled) then raise exception 'CREW_LAST_ADMIN' using errcode='42501'; end if;
  insert into public.crew_members values(e,target,role_value,enabled_value,finance_value,v+1) on conflict(edition_id,user_id) do update set role=excluded.role,enabled=excluded.enabled,can_finance=excluded.can_finance,version=excluded.version returning to_jsonb(crew_members.*) into result;
  rid:=target;
 else
  rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());
  perform pg_advisory_xact_lock(hashtextextended(k||rid::text,1));
  if k='category' then
   select to_jsonb(c) into previous from public.crew_categories c where id=rid and edition_id=e for update;
   if not found and exists(select 1 from public.crew_categories where id=rid) then raise exception 'CREW_ACCESS_DENIED' using errcode='42501'; end if;
   if coalesce((previous->>'version')::integer,0)<>v then raise exception 'CREW_VERSION_CONFLICT' using errcode='40001'; end if;
   insert into public.crew_categories values(rid,e,btrim(p->>'name'),coalesce(p->>'color','cat-0'),(p->>'required_count')::integer,coalesce(p->>'required_term',''),v+1) on conflict(id) do update set name=excluded.name,color=excluded.color,required_count=excluded.required_count,required_term=excluded.required_term,version=excluded.version returning to_jsonb(crew_categories.*) into result;
  elsif k='roster' then
   select to_jsonb(r) into previous from public.crew_roster r where id=rid and edition_id=e for update;
   if not found and exists(select 1 from public.crew_roster where id=rid) then raise exception 'CREW_ACCESS_DENIED' using errcode='42501'; end if;
   if coalesce((previous->>'version')::integer,0)<>v then raise exception 'CREW_VERSION_CONFLICT' using errcode='40001'; end if;
   if not exists(select 1 from public.crew_categories where id=(p->>'category_id')::uuid and edition_id=e) then raise exception 'CREW_CATEGORY_INVALID' using errcode='22023'; end if;
   target:=case when p ? 'linked_user_id' then nullif(p->>'linked_user_id','')::uuid else nullif(previous->>'linked_user_id','')::uuid end;
   if target is distinct from nullif(previous->>'linked_user_id','')::uuid and public.crew_role(e)<>'admin' then raise exception 'CREW_ACCESS_DENIED' using errcode='42501'; end if;
   pid:=case when p ? 'person_id' then nullif(p->>'person_id','')::uuid else nullif(previous->>'person_id','')::uuid end;
   if p->>'kind'='person' then
    if pid is null then insert into public.people(name) values(btrim(p->>'name')) returning id into pid;
    elsif not exists(select 1 from public.crew_roster where edition_id=e and person_id=pid) then raise exception 'CREW_PERSON_INVALID' using errcode='22023'; end if;
   elsif pid is not null then raise exception 'CREW_PERSON_INVALID' using errcode='22023'; end if;
   insert into public.crew_roster values(rid,e,(p->>'category_id')::uuid,pid,target,coalesce(p->>'kind','unresolved'),btrim(p->>'name'),coalesce(p->>'position',''),coalesce(p->>'owner_label',''),coalesce(p->>'email',''),coalesce(p->>'phone',''),coalesce(p->>'status','candidate'),coalesce(p->>'term',''),btrim(coalesce(p->>'friday','')),btrim(coalesce(p->>'saturday','')),coalesce(p->>'notes',''),coalesce((p->>'archived')::boolean,false),v+1)
   on conflict(id) do update set category_id=excluded.category_id,person_id=excluded.person_id,linked_user_id=excluded.linked_user_id,kind=excluded.kind,name=excluded.name,position=excluded.position,owner_label=excluded.owner_label,email=excluded.email,phone=excluded.phone,status=excluded.status,term=excluded.term,friday=excluded.friday,saturday=excluded.saturday,notes=excluded.notes,archived=excluded.archived,version=excluded.version returning to_jsonb(crew_roster.*) into result;
  else
   if not exists(select 1 from public.crew_roster where id=rid and edition_id=e) then raise exception 'CREW_ROSTER_INVALID' using errcode='22023'; end if;
   select to_jsonb(c) into previous from public.crew_compensation c where roster_id=rid and edition_id=e for update;
   if coalesce((previous->>'version')::integer,0)<>v then raise exception 'CREW_VERSION_CONFLICT' using errcode='40001'; end if;
   insert into public.crew_compensation values(rid,e,(p->>'estimate')::bigint,(p->>'agreed')::bigint,(p->>'total')::bigint,(p->>'paid')::bigint,coalesce(p->>'barter',''),coalesce(p->>'merch',''),v+1) on conflict(roster_id) do update set estimate=excluded.estimate,agreed=excluded.agreed,total=excluded.total,paid=excluded.paid,barter=excluded.barter,merch=excluded.merch,version=excluded.version returning to_jsonb(crew_compensation.*) into result;
  end if;
 end if;
 insert into public.crew_audit(edition_id,actor_id,kind,entity_id,old_data,new_data) values(e,uid,k,rid,previous,result);
 insert into public.crew_requests values(e,uid,request_id,fp,result);
 return result;
exception when unique_violation then raise exception 'CREW_DUPLICATE' using errcode='23505';
 when check_violation or not_null_violation or foreign_key_violation or invalid_text_representation or numeric_value_out_of_range then raise exception 'CREW_INVALID_INPUT' using errcode='22023';
end;
$$;
revoke all on public.crew_members,public.crew_categories,public.crew_roster,public.crew_compensation,public.crew_audit,public.crew_requests from public,anon,authenticated;
grant select on public.crew_members,public.crew_categories,public.crew_roster,public.crew_compensation,public.crew_audit to authenticated;
revoke all on function public.crew_role(uuid),public.crew_editor(uuid),public.crew_finance(uuid),public.require_crew_writer(uuid,text),public.crew_write(uuid,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.crew_role(uuid),public.crew_editor(uuid),public.crew_finance(uuid),public.crew_write(uuid,text,jsonb,uuid) to authenticated;

-- Account emails are available only to the crew administrator, scoped to members.
create function public.crew_member_directory(e uuid) returns table(edition_id uuid,user_id uuid,role text,enabled boolean,can_finance boolean,version integer,email text) language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(public.crew_role(e),'')<>'admin' then raise exception 'CREW_ACCESS_DENIED' using errcode='42501'; end if;
 return query select m.edition_id,m.user_id,m.role,m.enabled,m.can_finance,m.version,u.email::text from public.crew_members m join auth.users u on u.id=m.user_id where m.edition_id=e order by m.user_id;
end;
$$;
revoke all on function public.crew_member_directory(uuid) from public,anon,authenticated;
grant execute on function public.crew_member_directory(uuid) to authenticated;
