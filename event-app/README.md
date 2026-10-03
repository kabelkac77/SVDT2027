# SVDT — interní Partneři V1

Zdroj zadání: `../event-app-zadani/`. Model, oprávnění a hranice dodávky: `10-PARTNERI-MODEL-A-FLOW.md`; podklady: `10-PARTNERI-IMPORT.md`.

## Lokální spuštění

Node 22+ (ověřeno na Node 26). V tomto adresáři:

```sh
npm ci
npm run dev
```

- `/`: skutečná evidence; bez konfigurace zobrazí instrukci, nikoli falešný backend.
- `/demo`: propojené Partneři a Finance s fiktivními daty v localStorage, oddělené od Supabase. Obnovit demo resetuje oba moduly. Finance zatím nejsou ve skutečné evidenci.
- `/podklady`: lokální read-only kontrola JSON podkladu. Bez přihlášení neumí ukládat do evidence a nikam soubor neodesílá.

## Připojení skutečné evidence

1. V existujícím nebo novém Supabase projektu aplikovat `supabase/migrations/202609280001_partners.sql` standardním migračním postupem. Migrace je pro prázdné tabulky tohoto modulu, není opakovatelný reset. Produkční projekt ani hosting nebyly tímto commitem vytvořeny.
2. Zkopírovat `.env.example` do `.env.local`, vyplnit project URL a veřejný publishable key. Nikdy nepoužívat service_role/secret key v `NEXT_PUBLIC_*` ani v Git.
3. Připravit přihlašování dle `../event-app-zadani/PRIHLASOVANI.md`: Google, Apple, Facebook přes Supabase OAuth; e-mail/heslo zůstává záloha pro připravené účty. Tlačítka se zobrazí po aktivaci v Supabase. Pro první sociální přihlášení nových uživatelů musí Auth dovolovat vytvoření účtu; tento účet nezískává členství. Crew samoobsluha ani zvání z UI zatím nejsou implementované.
4. Přidat Event, Edition a členství v SQL editoru jako správce. Příklad níže používá placeholder pro UUID **existujícího Auth uživatele**; nejprve jej nahraď.

```sql
with ev as (
  insert into public.events(name) values ('Svatohorský Downtown Příbram') returning id
), ed as (
  insert into public.editions(event_id, year, name)
  select id, 2027, 'SVDT 2027' from ev returning id
)
insert into public.edition_members(edition_id,user_id,display_name,role)
select id, 'AUTH_USER_UUID'::uuid, 'Vojta', 'admin' from ed;
```

Další členy přidat s konkrétním edition_id a Auth UUID, role admin / manager / viewer. Vojta a Vlasta mají dle zadání admin, owner může být pouze admin/manager daného ročníku. V1 členství spravuje administrátor mimo UI. Pro další ročník použít existující Event, nevytvářet nový projekt téhož závodu.

5. Restartovat lokální server, přihlásit se a ověřit vytvoření partnera. Před nasazením otestovat na skutečném Supabase projektu dva účty s rozdílným členstvím; lokální SQL testy simulují `auth.uid()`, nikoli celou službu Auth/PostgREST.

## Partnerský Excel

Read-only filtr je přizpůsoben dodanému workbooku a kontroluje očekávané hlavičky. Vyžaduje Python + openpyxl. Spouští se z kořene repozitáře:

```sh
python3 event-app/scripts/filter_partners.py /path/to/PARTNERS_2026.xlsx .local/partners-intake.json
```

V aplikaci vybrat **Podklady k importu**, otevřít JSON, zkontrolovat řádky a předvyplnit formulář. Vybrat existující organizaci, pokud už byla založena, a ručně určit ownera a pravdivý status 2027. Více původních e-mailů se zachová v interní poznámce; hlavní kontaktní osobu doplnit podle známé identity. Formulář neoznačí kandidáta automaticky za osloveného. Opakovaný import bez IČO může vytvořit stejnojmenné organizace; V1 vyžaduje ruční kontrolu identity, nepředstírá automatickou deduplikaci.

Soukromé podklady jsou v kořenovém `.local/` ignorovaném Gitem. Nekopírovat je do `public/`, demo fixture, README ani zdrojového bundle.

## Kontroly

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

DB testy používají skutečný PostgreSQL engine PGlite: RLS, RPC transakce, izolace ročníků, potvrzení, konflikty verzí, rollback, audit, archiv a plnění. Playwright kontroluje uživatelské flow a mobilní viewport; výchozí je nainstalovaný Google Chrome. Pro samostatný Chromium použij `npx playwright install chromium` a `PLAYWRIGHT_CHANNEL=chromium npm run test:e2e`.

## Technické poznámky

Klientské Supabase SDK udržuje přihlášení; žádná citlivá data nejsou součástí SSR. DB je autorita oprávnění. Přímé zápisy klienta jsou odebrané, RPC vždy kontrolují členství. Auth UUID pochází z `auth.uid()`. Privilegované funkce mají prázdný search_path a explicitní schema. Audit je pro klienta pouze ke čtení. Global organization profil má samostatnou verzi proti souběhu mezi ročníky. Nenačítáme tajné klíče na server ani do klienta.

Design tokeny se importují přímo z `../design-system/tokens/svdt-tokens.css`; Exo fonty jsou lokální kopie repozitářových assetů s přiloženou OFL licencí. Zelená označuje úspěšný stav, červená značku a hlavní akci. Menší rozestupy jsou přizpůsobení provoznímu UI.

**Navazující rozsah:** externí Partner Portal, více kontaktů, questionnaire, uploady/Document, VIP QR, post-event report; finanční backend a kontrolovaný import. Finance lze zkoušet lokálně dle `../event-app-zadani/11-FINANCE-MODEL-A-FLOW.md`. Offline synchronizace, real-time odběry a PWA cache zatím nejsou implementované. Toto není hotová produkční eventová aplikace.

Implementační reference: [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation), [Supabase JS](https://supabase.com/docs/reference/javascript/introduction), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
