-- Internal Partners V1. Apply to a new Supabase project as migration owner.
create table public.events (
  id uuid primary key default gen_random_uuid(), name text not null check (length(btrim(name)) between 1 and 200)
);
create table public.editions (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events,
  year integer not null check (year between 2000 and 2200), name text not null,
  archived boolean not null default false, unique(event_id, year)
);
create table public.edition_members (
  edition_id uuid not null references public.editions, user_id uuid not null references auth.users,
  display_name text not null, role text not null check (role in ('admin','manager','viewer')),
  primary key(edition_id,user_id)
);
create table public.people (
  id uuid primary key default gen_random_uuid(), name text not null check(length(btrim(name)) between 1 and 200),
  email text not null default '' check(length(email)<=320), phone text not null default '' check(length(phone)<=80)
);
create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null check(length(btrim(name)) between 1 and 200),
  country_code text not null default 'CZ' check(country_code ~ '^[A-Z]{2}$'),
  registration_id text check(length(registration_id) between 1 and 40),
  website text not null default '' check(website = '' or (website ~ '^https?://[^[:space:]]+$' and length(website)<=2000)),
  primary_contact_id uuid references public.people, version integer not null default 1,
  unique(country_code, registration_id)
);
create table public.partner_prospects (
  id uuid primary key default gen_random_uuid(), edition_id uuid not null references public.editions,
  organization_id uuid not null references public.organizations,
  owner_id uuid not null, status text not null default 'osloven' check(status in ('osloven','potvrzen','zamítnut')),
  internal_note text not null default '' check(length(internal_note)<=10000), next_contact_on date,
  version integer not null default 1, unique(edition_id,organization_id), unique(id,edition_id),
  foreign key(edition_id,owner_id) references public.edition_members(edition_id,user_id)
);
create table public.edition_partnerships (
  id uuid primary key default gen_random_uuid(), edition_id uuid not null references public.editions,
  prospect_id uuid not null unique, confirmed_at timestamptz not null default now(), unique(id,edition_id),
  foreign key(prospect_id,edition_id) references public.partner_prospects(id,edition_id)
);
create table public.partner_deliverables (
  id uuid primary key default gen_random_uuid(), edition_id uuid not null references public.editions,
  partnership_id uuid not null, title text not null check(length(btrim(title)) between 1 and 300),
  status text not null default 'nesplněno' check(status in ('nesplněno','v řešení','splněno')),
  due_on date, evidence_url text not null default '' check(evidence_url = '' or (evidence_url ~ '^https?://[^[:space:]]+$' and length(evidence_url)<=2000)),
  version integer not null default 1,
  foreign key(partnership_id,edition_id) references public.edition_partnerships(id,edition_id)
);
create table public.audit_log (
  id uuid primary key default gen_random_uuid(), edition_id uuid not null references public.editions,
  actor_id uuid not null references auth.users, entity text not null, entity_id uuid not null,
  action text not null, old_data jsonb, new_data jsonb not null, created_at timestamptz not null default now()
);
create index prospects_organization_idx on public.partner_prospects(organization_id);
create index prospects_next_contact_idx on public.partner_prospects(edition_id,next_contact_on);
create index deliverables_partnership_idx on public.partner_deliverables(partnership_id);
create index audit_edition_idx on public.audit_log(edition_id,created_at desc);
create index members_user_idx on public.edition_members(user_id);

create function public.is_edition_member(e uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.edition_members where edition_id=e and user_id=auth.uid());
$$;
create function public.can_read_organization(o uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.partner_prospects p join public.edition_members m on m.edition_id=p.edition_id where p.organization_id=o and m.user_id=auth.uid());
$$;
create function public.require_edition_editor(e uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.edition_members where edition_id=e and user_id=auth.uid() and role in ('admin','manager')) then
   raise exception 'ACCESS_DENIED' using errcode='42501';
 end if;
 -- Serialize archival against an in-flight write.
 perform 1 from public.editions where id=e and not archived for share;
 if not found then raise exception 'EDITION_ARCHIVED' using errcode='42501'; end if;
end;
$$;

alter table public.events enable row level security;
alter table public.editions enable row level security;
alter table public.edition_members enable row level security;
alter table public.people enable row level security;
alter table public.organizations enable row level security;
alter table public.partner_prospects enable row level security;
alter table public.edition_partnerships enable row level security;
alter table public.partner_deliverables enable row level security;
alter table public.audit_log enable row level security;
create policy event_read on public.events for select to authenticated using (exists(select 1 from public.editions e where e.event_id=events.id and public.is_edition_member(e.id)));
create policy edition_read on public.editions for select to authenticated using (public.is_edition_member(id));
create policy members_read on public.edition_members for select to authenticated using (public.is_edition_member(edition_id));
create policy org_read on public.organizations for select to authenticated using (public.can_read_organization(id));
create policy people_read on public.people for select to authenticated using (exists(select 1 from public.organizations o where o.primary_contact_id=people.id and public.can_read_organization(o.id)));
create policy prospect_read on public.partner_prospects for select to authenticated using (public.is_edition_member(edition_id));
create policy partnership_read on public.edition_partnerships for select to authenticated using (public.is_edition_member(edition_id));
create policy deliverable_read on public.partner_deliverables for select to authenticated using (public.is_edition_member(edition_id));
create policy audit_read on public.audit_log for select to authenticated using (public.is_edition_member(edition_id));

create function public.save_partner(e uuid, payload jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 p public.partner_prospects; o public.organizations; c public.people;
 previous jsonb; oid uuid; pid uuid; cid uuid; own uuid;
begin
 perform public.require_edition_editor(e);
 own := (payload->>'owner_id')::uuid;
 if not exists(select 1 from public.edition_members where edition_id=e and user_id=own and role in ('admin','manager')) then raise exception 'INVALID_OWNER'; end if;
 pid := nullif(payload->>'id','')::uuid;
 oid := nullif(payload->>'organization_id','')::uuid;
 if pid is not null then
  select * into p from public.partner_prospects where id=pid and edition_id=e for update;
  if not found then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  if p.version is distinct from (payload->>'version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  if oid is distinct from p.organization_id then raise exception 'ORGANIZATION_IMMUTABLE'; end if;
 end if;
 if oid is not null then
  if not public.can_read_organization(oid) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select * into o from public.organizations where id=oid for update;
  if o.version is distinct from (payload->>'organization_version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  select * into c from public.people where id=o.primary_contact_id;
 end if;
 previous := case when pid is null then null else jsonb_build_object('prospect',to_jsonb(p),'organization',to_jsonb(o),'contact',to_jsonb(c)) end;
 -- One primary contact in V1. Existing Person identity is kept across editions.
 cid := o.primary_contact_id;
 if length(btrim(coalesce(payload->>'contact_name',''))) > 0 then
  if cid is null then
   insert into public.people(name,email,phone) values(btrim(payload->>'contact_name'),btrim(coalesce(payload->>'contact_email','')),btrim(coalesce(payload->>'contact_phone',''))) returning id into cid;
  else
   update public.people set name=btrim(payload->>'contact_name'),email=btrim(coalesce(payload->>'contact_email','')),phone=btrim(coalesce(payload->>'contact_phone','')) where id=cid;
  end if;
 elsif coalesce(payload->>'contact_email','')<>'' or coalesce(payload->>'contact_phone','')<>'' then
  raise exception 'CONTACT_NAME_REQUIRED';
 else cid := null;
 end if;
 if oid is null then
  insert into public.organizations(name,country_code,registration_id,website,primary_contact_id)
  values(btrim(payload->>'name'),upper(payload->>'country_code'),nullif(btrim(payload->>'registration_id'),''),btrim(coalesce(payload->>'website','')),cid) returning * into o;
  oid := o.id;
 else
  update public.organizations set name=btrim(payload->>'name'),country_code=upper(payload->>'country_code'),registration_id=nullif(btrim(payload->>'registration_id'),''),website=btrim(coalesce(payload->>'website','')),primary_contact_id=cid,version=version+1 where id=oid returning * into o;
 end if;
 if pid is null then
  insert into public.partner_prospects(edition_id,organization_id,owner_id,status,internal_note,next_contact_on)
  values(e,oid,own,payload->>'status',coalesce(payload->>'internal_note',''),nullif(payload->>'next_contact_on','')::date) returning * into p;
  pid := p.id;
 else
  update public.partner_prospects set owner_id=own,status=payload->>'status',internal_note=coalesce(payload->>'internal_note',''),next_contact_on=nullif(payload->>'next_contact_on','')::date,version=version+1 where id=pid returning * into p;
 end if;
 if p.status='potvrzen' then
  insert into public.edition_partnerships(edition_id,prospect_id) values(e,pid) on conflict(prospect_id) do nothing;
 end if;
 select * into c from public.people where id=cid;
 insert into public.audit_log(edition_id,actor_id,entity,entity_id,action,old_data,new_data)
 values(e,auth.uid(),'partner',pid,case when previous is null then 'created' else 'updated' end,previous,jsonb_build_object('prospect',to_jsonb(p),'organization',to_jsonb(o),'contact',to_jsonb(c)));
 return pid;
end;
$$;

create function public.save_deliverable(e uuid, payload jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare d public.partner_deliverables; old_d jsonb; did uuid; part uuid;
begin
 perform public.require_edition_editor(e);
 part := (payload->>'partnership_id')::uuid;
 -- Lock the prospect, so status changes cannot race with fulfillment updates.
 perform 1 from public.partner_prospects p join public.edition_partnerships s on s.prospect_id=p.id
 where s.id=part and s.edition_id=e and p.status='potvrzen' for update of p;
 if not found then raise exception 'PARTNERSHIP_NOT_CONFIRMED'; end if;
 did := nullif(payload->>'id','')::uuid;
 if did is not null then
  select * into d from public.partner_deliverables where id=did and edition_id=e and partnership_id=part for update;
  if not found then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  if d.version is distinct from (payload->>'version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  old_d := to_jsonb(d);
  update public.partner_deliverables set title=btrim(payload->>'title'),status=payload->>'status',due_on=nullif(payload->>'due_on','')::date,evidence_url=btrim(coalesce(payload->>'evidence_url','')),version=version+1 where id=did returning * into d;
 else
  insert into public.partner_deliverables(edition_id,partnership_id,title,status,due_on,evidence_url)
  values(e,part,btrim(payload->>'title'),payload->>'status',nullif(payload->>'due_on','')::date,btrim(coalesce(payload->>'evidence_url',''))) returning * into d;
 end if;
 insert into public.audit_log(edition_id,actor_id,entity,entity_id,action,old_data,new_data)
 values(e,auth.uid(),'deliverable',d.id,case when old_d is null then 'created' else 'updated' end,old_d,to_jsonb(d));
 return d.id;
end;
$$;

-- No table writes from the browser; even authenticated members must use checked RPCs.
revoke all on public.events,public.editions,public.edition_members,public.people,public.organizations,public.partner_prospects,public.edition_partnerships,public.partner_deliverables,public.audit_log from anon,authenticated;
grant select on public.events,public.editions,public.edition_members,public.people,public.organizations,public.partner_prospects,public.edition_partnerships,public.partner_deliverables,public.audit_log to authenticated;
revoke all on function public.is_edition_member(uuid),public.can_read_organization(uuid),public.require_edition_editor(uuid),public.save_partner(uuid,jsonb),public.save_deliverable(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.is_edition_member(uuid),public.can_read_organization(uuid),public.save_partner(uuid,jsonb),public.save_deliverable(uuid,jsonb) to authenticated;
