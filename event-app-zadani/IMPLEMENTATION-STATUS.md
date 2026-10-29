# Stav implementace

## 2026-10-29 — PÁ a SO v hlavním personálním řádku

**IMPLEMENTED / ověřeno místně:** sloupce PÁ (od–do) a SO (od–do), editace v detailu pod řádkem a trvalé ukládání v 2027. Starší otevřené okno, které nová pole neposílá, zachová uložené časy; explicitní prázdná hodnota je smaže. Bez automatického potvrzení účasti nebo přebírání minulých časů. Claude dodal omezený serverový krok, host integraci a nezávislé testy: 96 Python + 28 Node testů prošlo. Prohlížeč ověřil uložení přes restart serveru, reload, CSV i mobil 390 px bez vodorovného přetékání. Místní aplikace aktualizovaná se snímkem a soukromě doloženým zachováním celé DB. [26](26-CREW-PATEK-SOBOTA.md), [evidence](crew-days-verification.json). Ruční vzhled/časové domluvy zůstávají na později; zadání souhrnu kategorií 25 čeká v backlogu.

## 2026-10-29 — filtrovaný CSV přehled lidí

**IMPLEMENTED / ověřeno místně:** tlačítko Export CSV stáhne uložené řádky podle právě vybraného ročníku a filtrů, včetně členů sbalených kategorií a všech zdrojových sloupců. Rozepsané změny chrání nedestruktivní blokace. Historie zůstává pouze pro čtení. Claude dodal serializátor a opravu podle připnutého review; Codex integraci, nezávislé review a testy. 80 Python + 19 Node testů prošlo; prohlížeč ověřen na oddělených fiktivních datech. [24](24-CSV-PREHLED-A-ODLOZENE-KONTROLY.md) a [evidence](crew-csv-verification.json). Desktopový Excel nebyl spuštěn; CSV není bezeztrátová záloha. Ruční potvrzení uživatele jsou výslovně odložená v backlogu. Bez aktivace plánovače, cloudového importu nebo merge.

## 2026-10-28 — verzovaný pracovní přehled a atomické snímky

Dodaný obecný místní pracovní přehled a oprava SQLite snímků v navazujícím Draft PR #19. Claude návrh/opravný krok, Codex nezávislé review, hostitelské revizní opravy a skutečné testy: 73/73 prošlo, včetně poruch, souběhu a obnovy do nové složky. Čtyři syntaktické JS kontroly a úplnost HTML odkazů prošly; nový browser běh se při nezměněném rozhraní netvrdí. Skutečné podklady nejsou ve veřejném zdroji. [23](23-PRACOVNI-EVIDENCE-A-SNIMKY.md) rozlišuje dodávku, důkazy a ruční otevřené kroky. Bez merge, produkční migrace nebo aktivace plánovaných kompletních záloh.

## 2026-10-28 — místní spolupráce Codex a Claude Code

Dodaný a nainstalovaný projektový skill/runner, oddělené strojové vazby mimo Git, ověřené přístupy, samostatná větev a Draft PR #17 pro issue #16. Skutečný nativní návrh, nezávislé připnuté review tří reprodukovaných chyb a oprava ve stejné větvi dokončené. Codex ověřil 40 syntetických testů + 41 dalších negativních případů; kontrola formátu skillu prošla. Zdroj pravdy a důkazy v [22](22-CODEX-CLAUDE-SPOLUPRACE.md). Nové CI testuje jen veřejné syntetické nástroje bez modelového/produkčního přístupu; finální check v PR. Personální pracovní verze, historické údaje, původní index/HEAD, frontend, SQL a produkce se tímto nemění. Denní úplné zálohy nebyly aktivované.

Aktuálně: WhatsApp/Twilio jsou na pokyn uživatele odložené do backlogu. Připravený kód není aktivovaná služba; veřejný flag zůstává standardně vypnutý.

## 2026-09-28 — interní Partneři V1

Zdroj v `event-app/`. Postup a spuštění v `event-app/README.md`.

### Implementováno

- WhatsApp OTP klient: telefon s předvolbou → odeslání → ověření kódu, chybové stavy a odstup dalších žádostí; zobrazení jen při Phone provideru a explicitním veřejném flagu. Twilio/odesílatel a serverové limity ještě nejsou nakonfigurované, žádné skutečné doručení nebylo ověřené. Postup v `PRIHLASOVANI.md`.
- Google, Apple a Facebook OAuth v klientu; zobrazení jen providerů zapnutých v Supabase, návrat na `/`, bezpečná zpráva při zrušení a vyčištění chyb z URL, retry načtení dostupných metod. Provider credentials zatím nejsou nastavené; reálné sociální přihlášení nebylo ověřeno. Konfigurace: `PRIHLASOVANI.md`.
- Základ Next.js/TypeScript aplikace, sdílené SVDT tokeny a lokální font Exo.
- Supabase klient, přihlášení e-mail/heslo, výběr dostupného ročníku. Bez konfigurace bezpečná informační obrazovka; žádný fallback do dema.
- PostgreSQL migrace: Event/Edition, členství, Organization/Person, ročníkové oslovení, potvrzené partnerství, plnění a audit.
- RLS pro čtení, zápisy přes transakční RPC, ověření ownera a ročníkových vazeb, optimistické verze, ochrana archivu, autentizovaný autor v auditu.
- Seznam Partnerů s hledáním a filtry; formulář profilu/oslovení; detail, plnění s termínem a URL důkazem; interní historie.
- Samostatné demo s fiktivními daty a lokální persistence. Demo neslouží ke sdílené práci týmu.
- Read-only filtr dodaného Excelu; soukromá lokální fronta podkladů, zachování všech zdrojových řádků a kontaktů. Uložení jednotlivého zkontrolovaného podkladu až přihlášeným editorem se zvoleným stavem a ownerem.
- Pravidlo souběžného zápisu důležitých rozhodnutí do dokumentace.

### Ověřeno

- Po doplnění WhatsApp prošel TypeScript, produkční build a všech 12 browser scénářů. Tři nové testy ověřují telefon/kód a nepřidělení členství, chybu doručení s omezením opakování a skrytí při vypnutém Phone. OTP požadavky jsou mockované, placené doručení neproběhlo.
- 4 nové browser scénáře OAuth s mockovaným Auth: správný provider a pevný redirect, zrušení/skryté neaktivní metody, návrat a persistence session bez členství, výpadek settings a retry. V této fázi šlo o 9 browser scénářů; po WhatsApp scénářích celkem 12. Skutečné provider účty musí projít akceptací po konfiguraci.
- TypeScript bez chyb a produkční Next.js build.
- 4 databázové scénáře na PGlite (PostgreSQL): idempotentní potvrzení, rollback konfliktů, RLS a zákaz zápisu cizího účtu/čtenáře, přímé zápisy a audit, izolace ročníků, archiv, kontrola ownera/plnění/důkazů.
- 4 Playwright scénáře v Chrome: celé CRUD/confirmation/fulfillment flow, audit a archiv; mobil a prázdné filtry; lokální intake bez automatického importu či POST; desktopový náhled.
- Vizuálně prohlédnutý desktop a mobil. Zdrojový i stažený partnerský Excel mají shodný SHA-256.

Kvůli velmi pomalému čtení závislostí v pracovním adresáři proběhl finální build a browser testy v dočasné kopii `/private/tmp/svdt-verification`. Zdroj zůstává v repozitáři; dočasná kopie není nový zdroj pravdy. Lokální náhled běží jen po dobu dané relace.

### Ještě nehotovo

- Supabase je připojené; uživatel potvrdil Success po migraci/členství a funkční přihlášení. Zbývá kompletní ověření rolí a operací end-to-end proti skutečné službě. SQL testy simulují Auth identitu, ne kompletní službu. Hosting a automatické zálohování nejsou nasazené; existuje pouze jednorázový archiv zdrojů v iCloud složce.
- Žádní skuteční partneři nebyli automaticky vloženi do databáze a nikomu se neposlala zpráva/pozvánka.
- Partner Portal, questionnaire, více kontaktů, uploady/Document, VIP QR, post-event report.
- Finance: Excel načten, nyní implementované propojené lokální demo s fiktivními daty (položky, plán/potvrzená částka, částečné úhrady, barter, osobní proplacení, historie, vazba na partnera). Model a hranice: `11-FINANCE-MODEL-A-FLOW.md`. Zbývá finanční backend, oprávnění, pokročilé doklady/schvalování/storna a ostrý import.
- PWA/offline synchronizace a realtime nejsou zatím implementované; ostatní moduly zůstávají v backlogu.

## Ověření propojeného náhledu 2026-09-28

Historický běh před doplněním OAuth: prošel produkční build, 7 databázových/doménových testů a 5 browser scénářů. Ověřené částečné úhrady, osobní výdaje, reload a přechod Finance → Partner. Ověřováno ve stejné dočasné kopii jako výše. Později uživatel potvrdil přihlášení do skutečného Supabase; to nenahrazuje úplný live test oprávnění. Aktuální počet browser scénářů je 12.

## Předání Claude Code

Připravené `event-app/CLAUDE.md`, místní `event-app/AGENTS.md`, čtyři projektové skills v `event-app/.claude/skills/` a `HANDOFF-CLAUDE.md`. Instrukce se týkají pouze aplikace, nikoli ostatních složek repozitáře. Samotné předání nepřidává implementaci modulu, migraci ani produkční změnu. Následný pokyn uživatele z 2026-09-28 zahrnuje publikování aplikace, dokumentace a skills do stávajícího GitHub repozitáře. Jejich načtení skutečnou Claude relací zatím nebylo ověřeno.

## 2026-10-03 — uzavření lokálních změn Partnerů

Implementováno: pracovní tabulka s úpravami stavu/ownera/termínu/poznámky/kontaktu, `neosloven`, pouze čitelná historie organizace a kompatibilita již uloženého dema. Chybový draft zůstává zachovaný; souběžný zápis řádku se blokuje. Historické NULL a překryvy se nezobrazují jako nula nebo automatický součet. Rozhodnutí: `10-PARTNERI-MODEL-A-FLOW.md`, `DECISIONS.md`.

Ověřeno na shodné dočasné kopii `/private/tmp/svdt2027-verify/event-app` bez konfigurace a skutečných dat:

- `npm run typecheck` a `npm run build` prošly.
- `node --import tsx --test tests/*.test.ts`: **10/10** (5 DB scénářů v PGlite, 3 Finance, 2 Partner model/kompatibilita). Tento ekvivalent `npm test` obchází sandboxem blokovaný IPC socket spouštěče tsx.
- `npm run test:e2e`: **15/15** v Chrome, včetně 3 nových scénářů řádků, pomalého RPC/konfliktu a čtenáře/historie. Backend, OAuth a OTP jsou mockované; neodeslaly se skutečné platby, OTP ani partnerské mutace.
- Vizuální kontrola desktopu a mobilu; SHA-256 shoda aplikačních zdrojů ověřovací kopie. `next dev/build` v kopii generuje `next-env.d.ts` a vlastní blok v `AGENTS.md`; tyto generované úpravy se do zdroje nepřenášejí.

Migrace `202609290001_partner_history.sql` je součástí kódu, testuje se po původní migraci. Nebyla zde aplikována do produkce; stav jejího dřívějšího použití není ověřen. Skutečný Auth/PostgREST a více souběžných účtů dál vyžadují izolovanou live akceptaci. Finance zůstávají demo; tento krok nepřidává jejich backend ani ostrý import.

## 2026-10-03 — Finance: detailní implementační plán

Připraven `11-FINANCE-IMPLEMENTACNI-PLAN.md`: konkrétní tabulky/vazby, samostatná oprávnění a audit, schvalování, peněžní veličiny a NULL, osobní plátci/proplacení, RPC/souběh/idempotence, opravy, soukromé doklady, importní provenance, export/obnova, UI a etapy B0–B6 s akceptací. Modelové závěry jsou současně v `11-FINANCE-MODEL-A-FLOW.md` a `DECISIONS.md`; odkazy/backlog byly sjednocené.

Jde pouze o dokumentovaný návrh. Nebyla vytvořena finanční migrace, aktivována služba, změněn produkční grant ani importován skutečný finanční řádek. Konkrétní role osob, self-approval, význam daňových částek a provozní volby zůstávají otevřené podle plánu. První doporučená implementace je B1 po uzavření B0 v izolovaném prostředí.
