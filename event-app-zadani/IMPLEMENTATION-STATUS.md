# Stav implementace

## 2026-11-05 — dokončený kolektor příloh a příprava převodu crew

IMPLEMENTED / ověřeno synteticky: Storage kolektor29e/g/h porovnává oddělenou úplnou autoritu se stránkovaným inventářem, stahuje a kontroluje všechny bajty/SHA a opakuje inventář po stažení. Zachovává aktuální verzi objektu, původní klíče a nastavení bucketů; nepodporované verzované/archivované historie odmítá. Nalezené chyby metadat/limitů/vlastnictví bajtů opravené hostem. Všech11 původně připravených Storage scénářů bylo přesunuto do běžných testů a rozšířeno; integrovaný průchod nyní používá skutečný Storage kolektor. SDK, pg_dump executable a vzdálený cíl jsou stále syntetické adaptéry, ne důkaz cloudové obnovy.

Pro sdílenou crew je implementovaný a synteticky ověřený soukromý náhled převodu podle [33](33-CREW-PREVOD-A-NAHLED.md): zachování všech tabulek, původních sloupců, historie/auditu, NULL/0 a oddělených odměn. Nejasné osoby/skupiny a účty se automaticky neslučují. Současné sdílené schéma ještě nemá neveřejný provenance/historický model pro všechny zdrojové údaje; jeho doplnění a akceptace zůstávají podmínkou ostrého importu. Náhled není import nebo grant.

Ověření: 229 aplikačních testů, TypeScript a produkční build, 131 hostitelských Python a37 původních Node kontrol prošlo. Soukromý náhled byl uložený nad dnešním ověřeným SQLite snímkem; source bytes beze změny a žádný cílový zápis. Přesné hashe a hranice v [evidenci](backup-collectors-verification.json).

Úplné automatické vzdálené zálohy a živý sdílený provoz stále nejsou aktivované. Chybí potvrzený dostupný projekt a serverové přístupy, skutečný provider/executor a oddělený klíč, scheduler/monitoring/retence a ověřená obnova DB/Auth/Storage; rovněž cílové UUID/role, mapování a browser průchod. Uživatel chce pokračovat bez otázek; vše potřebné k pozdějšímu projití je v [31](31-AKTIVACE-A-RUCNI-KONTROLY.md), postup aktivace v [32](32-PREDPROVOZNI-KONTROLA.md).


## 2026-11-05 — kolektory záloh a příprava sdíleného provozu

Implementováno: explicitní sběr obecných zdrojů/vstupů, konzistentní SQLite snímek a úplné JSON/CSV exporty, PostgreSQL custom dump s kontrolou obsahu, koordinátor šesti zdrojů s exkluzivním zámkem, šifrováním a povinným zpětným čtením vzdálené kopie. Konkrétní připojení vzdáleného cíle a plánovač nejsou aktivované. Kolektor Storage a propojené ověření mají stav v [evidenci](backup-collectors-verification.json); nepočítat připravené, nespouštěné testy jako úspěšné.

Ověření 2026-11-05: 194 aplikačních testů, TypeScript a produkční build, 110 Python a 37 původních Node kontrol prošlo. Integrační průchod skutečně obnovuje syntetickou SQLite a bajty přes šifrovaný balíček; PostgreSQL executable, Storage kolektor a vzdálený cíl jsou fixture. Storage modul stále není implementovaný a jeho 11 připravených testů nebylo spuštěno.

Skutečná místní SQLite byla soukromě nasnímkovaná a obnova ověřená; pracovní DB/WAL zůstaly beze změny. Zdroje a dostupné soukromé vstupy mají místní kopii s inventářem. Původní personální sešit na dříve uvedené cestě nebyl dostupný; celkový inventář podkladů proto není potvrzený jako úplný. Tyto kopie nejsou důkazem vzdálené nebo automatické úplné zálohy.

Pro sdílený provoz je připravený katalogový READ ONLY preflight a inventář čtyř migrací se SHA-256. Tři syntetické databázové scénáře ověřily, že diagnostika nečte provozní řádky ani nemění data. Na skutečném projektu nebylo spuštěné DDL, přidělené členství, import ani nasazení. Podrobný aktivační postup je v [32](32-PREDPROVOZNI-KONTROLA.md).

Dále samostatně: propojené testy kolektorů a obnovy, příprava náhledu převodu místní crew bez slučování identit, provozní integrace podle potvrzeného cíle. Později společně: správný dostupný projekt, serverové přístupy k DB/Storage, vzdálený vykonavatel/cíl a úschova klíče, retence/plán a skutečná obnova, konkrétní účty/oprávnění a mapování importu. Vše zůstává otevřené v [31](31-AKTIVACE-A-RUCNI-KONTROLY.md); nyní bez dotazů a bez automatického udělení přístupů.


## 2026-11-02 — první provozní moduly v aplikaci

IMPLEMENTED / synteticky ověřeno: úkoly a denní harmonogram v místním čase akce, zóny s explicitním pracovním kontaktem a orientačním plánem, ruční registrace závodníků se samostatným oprávněním a mobilní Moje služba. Editory otevíráme přímo pod řádkem. Auth a ročník sdílejí stávající crew; člen vidí vlastní přiřazení/úkoly, správce řídí přístup Registrace. Rozepsané údaje chrání navigace a ukládání používá plný fingerprint se stabilní identitou požadavku při opakování po chybě. Historický ročník je provozně readonly, přístup lze odebrat i v archivu.

Ověření:147/147 testů aplikace, úplný TypeScript, čistá instalace z lockfilu a produkční build prošly. [Evidence](operations-ui-verification.json). Nový browser/E2E průchod neproběhl, místní browser je vypnutý.

Toto je první funkční rozsah, nikoli dokončený Race Control nebo celé financování závodu. Registrace nemají automatickou banku, kapacity, přidělování čísel nebo neodsouhlasený import. Plán nemá skutečný uliční podklad/polohy. Samoobslužné potvrzení příchodu a dokončení členem crew zůstává otevřené; průběžná/offline synchronizace není implementovaná. Rozsah [30](30-PROVOZNI-MODULY.md), aktivace a ruční kontroly [31](31-AKTIVACE-A-RUCNI-KONTROLY.md).

Sdílený provoz ani úplné automatické zálohy nejsou aktivované. Migrace, konkrétní účty/granty, převod skutečné místní evidence, reálné OAuth, hosting a vzdálené zálohovací přístupy musí projít pozdější aktivací; uživatel požádal nyní práci nepřerušovat otázkami. Pracovní SQLite/historie zůstávají zachované.


## 2026-11-02 — šifrovaný zálohovací balíček a bezpečná obnova

IMPLEMENTED / synteticky ověřeno: knihovna `backup-bundle.js`, šest povinných inventářů, AES-256-GCM, kontrola SHA-256 a obnova pouze do nové soukromé složky. Patnáct testů ověřuje skutečné šifrování, poškození, úplnost, cesty, zákaz přepsání a úklid při I/O chybě bez odstranění cizích souborů. Testy jsou součástí běžného `npm test` a CI.

**Úplné automatické zálohy mimo tento počítač nejsou aktivované.** Chybí kolektory, přístup k úplnému databázovému dumpu a Storage, úschova klíče, vzdálený vykonavatel, důkaz vzdálené kopie, plán a ověření obnovy databáze. Rozsah [29](29-ZALOHY-IMPLEMENTACE.md), odložené aktivace [31](31-AKTIVACE-A-RUCNI-KONTROLY.md). Další nezávislá práce: provozní moduly; zálohovací integrace pokračuje podle dostupných přístupů.


## 2026-11-02 — sdílená crew V1 v kódu

IMPLEMENTED / synteticky ověřeno: samostatná `/crew`, existující Auth včetně povolených sociálních metod a návratu do crew, ročníky, sbalené kategorie, osm sloupců včetně PÁ/SO, detail pod řádkem, cíle obsazenosti, oddělené odměny a admin správa existujících účtů. Oprávnění, verze, idempotentní RPC a neveřejný audit v nové schema-only migraci. Role člena vidí vlastní přiřazení, odměny jen oprávněné role. Archiv zamyká provozní data, správce může odebrat přístup i v archivu.

Ověření: 66 testů současné aplikace (včetně 17 SSR scénářů tabulky), TypeScript a produkční build prošly; samostatně 17 testů připraveného provozního modelu. Hostitelské nástroje:104 Python a37 Node kontrol. Nový browser/E2E průchod neproběhl, protože místní prohlížeč je vypnutý. Code review opravil ochranu draftů, plný fingerprint těla požadavku, rozdělené ukládání odměn a znepřístupnění dat po odebrání role.

**Není aktivovaný sdílený provoz:** migrace na skutečný projekt, individuální granty, převod místní evidence a nasazení neproběhly. Uložená adresa projektu při diagnostice nešla přeložit v DNS; dostupný klíč je veřejný klientský, nikoli přístup k úplnému dumpu. Skutečná SQLite 2027 a historie2026/2025 zůstávají zachované. Úplné automatické zálohy mimo počítač nejsou aktivní. [Model a stav](28-SDILENA-CREW-A-OPRAVNENI.md), [aktivace a ruční kontroly](31-AKTIVACE-A-RUCNI-KONTROLY.md).

Další pořadí: šifrovaný úplný zálohovací balíček/obnova, kolektory a vzdálené ověření podle dostupných přístupů; potom adaptéry/rozhraní úkolů, registrací, zón a provozního mobilního pohledu nad již připraveným datovým základem. Konkrétní finanční rozsah jednotlivých lidí zůstává otevřený, nic se neuděluje podle jmen.


## 2026-11-02 — souhrny kategorií

IMPLEMENTED / místně aktivované: souhrny uložených stavů u sbalených kategorií, podle aktuálních filtrů, neuložené zvlášť. 9 nových testů a 37 Node kontrol prošlo. PÁ/SO, CSV, historie a ochrana draftu zachované; DB obsah nezměněný. Nové vizuální/browser ověření neproběhlo kvůli vypnutému místnímu prohlížeči. [25](25-CREW-STAVY-KATEGORII.md).

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
