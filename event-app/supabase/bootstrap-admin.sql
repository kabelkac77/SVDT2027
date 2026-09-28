-- Spustit po migraci Partneru a vytvoreni vlastniho Auth uctu.
-- Nahradit YOUR_AUTH_USER_UUID identifikatorem vlastniho uctu z Authentication > Users.
-- Skript nevytvari hesla, neposila pozvanky a nemeni existujici clenske role.
begin;
do $$
declare
  target_user uuid := 'YOUR_AUTH_USER_UUID';
  target_event uuid;
  target_edition uuid;
  event_count integer;
begin
  if not exists (select 1 from auth.users where id=target_user and email_confirmed_at is not null) then
    raise exception 'Vlastni potvrzeny Auth ucet nebyl nalezen. Zkontroluj UUID.';
  end if;
  select count(*) into event_count from public.events where name='Svatohorský Downtown Příbram';
  if event_count > 1 then raise exception 'Vice stejnojmennych akci: vyber musi zkontrolovat spravce.'; end if;
  select id into target_event from public.events where name='Svatohorský Downtown Příbram';
  if target_event is null then
    insert into public.events(name) values ('Svatohorský Downtown Příbram') returning id into target_event;
  end if;
  insert into public.editions(event_id,year,name) values(target_event,2027,'SVDT 2027')
    on conflict(event_id,year) do nothing;
  select id into target_edition from public.editions where event_id=target_event and year=2027;
  if exists(select 1 from public.editions where id=target_edition and archived) then raise exception 'Rocnik je archivovany.'; end if;
  if exists(select 1 from public.edition_members where edition_id=target_edition and user_id=target_user and role<>'admin') then
    raise exception 'Ucet uz ma jinou roli. Zmenu musi zkontrolovat spravce.';
  end if;
  insert into public.edition_members(edition_id,user_id,display_name,role)
    values(target_edition,target_user,'Vojta','admin') on conflict(edition_id,user_id) do nothing;
end $$;
commit;
