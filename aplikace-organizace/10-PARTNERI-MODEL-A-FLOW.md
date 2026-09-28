# Partneři — datový model a UI/flow V1

Navazuje na `10-PARTNERI.md`, `07-DATOVY-MODEL.md` a `APP_ARCHITECTURE.md`.
Datum: 2026-09-28. Níže jsou implementační rozhodnutí pro interní V1, nikoli změna cílového rozsahu aplikace.

## Hranice první dodávky

Interní seznam partnerů pro vybraný ročník, hledání a filtry, založení/úprava organizace a oslovení, potvrzení partnerství, evidence plnění a URL důkazů, audit změn. Přihlášení přes Supabase Auth a oprávnění v PostgreSQL RLS. Samostatné demo s fiktivními daty pro kontrolu UI bez backendu.

Partner Portal, questionnaire, upload souborů/fotek, VIP QR a post-event report zůstávají dalšími kroky modulu Partneři. V1 k nim nesmí předstírat funkční přístup. Finance začnou po načtení existujícího Excelu; částky ani účetní strukturu nyní nevymýšlíme.

## Entity a integrita

Všechny entity mají UUID. Provozní tabulky nesou `edition_id`; čas je UTC timestamptz, datum dalšího kontaktu je date (bez časového posunu). `version` je monotonní čítač pro ochranu před přepsáním změn jiného uživatele.

| Entita | Pole a vazby | Pravidla |
| --- | --- | --- |
| Event | id, name | Centrální projekt. |
| Edition | id, event_id, year, name, archived | Unikátní event + year. Archiv je pouze ke čtení. |
| Person | id, name, email, phone | Centrální kontaktní osoba; kontakt nemusí mít login. E-mail není globální unikátní identifikátor. |
| Organization | id, name, country_code, registration_id, website, primary_contact_id, version | Centrální profil. IČO/registrační číslo je text; unikátní země + vyplněné číslo. Nevyplněná čísla se ukládají jako NULL. Jméno nemusí být unikátní. |
| EditionMember | edition_id, user_id → auth.users, display_name, role | Interní přístup; role admin / manager / viewer. Owner musí být admin nebo manager daného ročníku. Uživatelské členství se nikdy nezakládá registrací samo. |
| PartnerProspect | id, edition_id, organization_id, owner_id, status, internal_note, next_contact_on, version | Unikátní edition + organization. Status osloven / potvrzen / zamítnut. Interní obchodní údaje jsou ročníkové, ne globální. |
| EditionPartnership | id, edition_id, prospect_id, confirmed_at | Vznikne atomicky při prvním potvrzení, právě jednou. ID je budoucí vazba pro Finance a Portal. |
| PartnerDeliverable | id, edition_id, partnership_id, title, status, due_on, evidence_url, version | Nesplněno / v řešení / splněno. Důkaz je volitelný HTTP(S) odkaz; soubory později přes Document. |
| AuditLog | id, edition_id, actor_id, entity, entity_id, action, old_data, new_data, created_at | Interní append-only historie; autor odvozen z ověřené identity, ne z formuláře. |

V1 má jeden hlavní kontakt organizace přes Person. Více kontaktních osob a vazba Person ↔ Organization budou rozšířením před questionnaire. Nevytváříme falešnou shodu lidí pouze podle jména/e-mailu. Při úpravě kontaktu přes tuto obrazovku se upravuje hlavní kontakt organizace, sdílený mezi jejími ročníky.

## Životní cyklus a souběh

1. Nejprve vyhledat existující organizaci; založit lze i bez IČO a bez kontaktu. Název a owner jsou povinní.
2. Oslovení patří ročníku. Stejná organizace může mít v roce 2027 potvrzeno a v roce 2028 teprve osloven.
3. Uložení profilu, kontaktu a oslovení je jedna DB transakce. Při aktualizaci ověřit verzi organizace i oslovení. Při konfliktu se změny neuloží a uživatel načte aktuální data.
4. Potvrzení ve stejné transakci vytvoří partnerství. Opakované uložení nevytvoří duplicitu.
5. Oprava stavu zpět na osloven/zamítnut partnerství ani důkazy nemaže. Plnění zůstávají viditelná interně, ale lze je upravovat jen při potvrzeném stavu. Opětovné potvrzení použije původní partnerství. Nejde o účetní storno; smluvní zrušení a finanční dopady se dopracují s Financemi.
6. Mazání historických záznamů ve V1 není. Archivace ročníku blokuje všechny jeho provozní zápisy. Globální profil organizace může dále žít v aktivním ročníku; historické změny jsou v auditu.

## Oprávnění

Admin a manager mohou spravovat Partnery svého aktivního ročníku; viewer pouze čte. Všichni interní členové ročníku vidí jeho partnery a interní audit. Změna ownera nemění práva uživatele. Přístup k centrální organizaci/kontaktu plyne z účasti v alespoň jednom dostupném ročníku.

Přímé zápisy klienta do tabulek jsou zakázané; mutace probíhají přes omezené RPC funkce, které ověří členství, ročník, verze a vazby. RLS chrání čtení. Nečlen, anonym ani budoucí partner účet nedostane interní údaje. Klient používá pouze veřejný publishable key; service_role klíč do aplikace nepatří. Zpřístupnění portálu bude samostatná implementace s explicitním grantem pro konkrétní partnerství a bezpečnou projekcí bez interních poznámek/auditu/rozpočtu.

## Obrazovky a flow

- **Seznam:** ročník, počty dle stavu, hledání názvu/IČO/kontaktu, filtr stavu/ownera a termínu (po termínu, dnes, všechny). Tabulka desktop, kompaktní zobrazení mobil. Prázdný seznam má akci Přidat partnera; prázdný výsledek filtrů nabízí jejich zrušení.
- **Nový partner:** vybrat existující organizaci nebo novou; název, země, IČO, web, hlavní kontakt; owner, stav, další kontakt a interní poznámka. Rozlišit globální profil a ročníkové údaje.
- **Detail:** profil + ročníkové údaje, úprava, plnění, historie. Potvrzení stavu aktivuje plnění. Změna jiného ročníku nepřenáší potvrzení ani staré úkoly.
- **Plnění:** název, termín, tři stavy, volitelný URL důkaz. Odkaz otevírat bezpečně v novém panelu; povolit pouze HTTP(S). Splnění bez důkazu je přípustné podle původního zadání.
- **Stavy UI:** načítání, chyba s opakováním, ukládání bez dvojitého odeslání, úspěch, konflikt verzí s načtením aktuálních dat, nepovolený přístup, archiv pouze ke čtení. Chyba ukládání zachová formulář.
- **Přístupnost:** pojmenované vstupy, klávesnice, viditelný focus, stav vyjádřen textem, responsivní rozložení.

## Technický krok

Implementace v `event-app/`: Next.js + TypeScript, Supabase Auth/PostgreSQL/PostgREST RPC. Datový model a bezpečnost zůstávají v SQL migraci. Přihlášení klientským SDK; citlivá data neposílá SSR a autorizaci vždy vynucuje DB. Demo je oddělená route, nesmí fungovat jako fallback po chybě produkčního připojení. Vizuál vychází ze sdílených SVDT tokenů a fontu Exo; provozní obrazovky používají kompaktnější mezery než marketingový web.

## OPEN před dalšími etapami

- Skutečný seznam partnerů a historie, partnerské formuláře, pravidla balíčků a finanční/barterové dohody.
- Více kontaktů organizace, partner pozvánky a přístupová matice externího portálu.
- Storage souborů, Synology integrace, retenční pravidla, více důkazů jednoho plnění.
- VIP QR/accreditation kontrakt, questionnaire, post-event report a finance dle Excelu.
- Produkční Supabase projekt, uživatelské účty/členství, hosting a backup. Žádná služba se tímto dokumentem nezakládá ani neobjednává.
