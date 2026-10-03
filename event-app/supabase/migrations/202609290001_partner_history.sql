-- Historical evidence belongs to the organization, while the current pipeline
-- stays attached to the selected event edition.
alter table public.partner_prospects
  drop constraint partner_prospects_status_check,
  add constraint partner_prospects_status_check
    check (status in ('neosloven','osloven','potvrzen','zamítnut'));

create table public.partner_historical_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations,
  event_name text not null default 'SVDT',
  year integer not null check (year between 2000 and 2200),
  cash_amount_czk bigint check (cash_amount_czk is null or cash_amount_czk >= 0),
  fulfillment text not null default '',
  position text not null default '',
  source_ref text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, event_name, year, source_ref)
);

create index partner_history_organization_idx
  on public.partner_historical_records(organization_id, year desc);

alter table public.partner_historical_records enable row level security;
create policy partner_history_read on public.partner_historical_records
  for select to authenticated
  using (public.can_read_organization(organization_id));

revoke all on public.partner_historical_records from anon, authenticated;
grant select on public.partner_historical_records to authenticated;
