# Předání organizační aplikace SVDT do Claude Code

## 2026-11-05 — transakční počáteční importer crew (kód, bez aktivace)

Implementováno a synteticky ověřeno podle [37](37-CREW-TRANSAKCNI-IMPORT.md): úplný počáteční převod kategorií, rosteru a oddělených odměn v jediné transakci s přesným zdrojovým balíčkem a vazbami. V1 umí pouze create nebo přesné keep, žádné přepisování, automatické slučování lidí/účtů nebo nové granty. Operátorské schválení váže skutečného správce, ročník, přesný plán/zdroj/cílový otisk a referenci zálohy; platnost, odvolání a jednorázové použití se ověřují na serveru. Stejný úspěšný požadavek se bezpečně opakuje, změněný obsah nebo cíl se odmítne. Při chybě se vrátí všechny změny včetně provenance/auditu.

Čistý builder38 připraví plán jen z úplného explicitního mapování a serverového cílového přehledu; zůstává applyReady:false a nevolá schválení ani import. Přidaná šestá migrace starší soubory nemění; nový preflight kontroluje30 tabulek a25 funkcí, všechny migrace mají autoApply:false. Interní validátory, schvalování/odvolání a cache nemají klientská zápisová oprávnění.

Ověření:264 aplikačních testů včetně16 nových importních scénářů,162 Python kontrol,37 původních Node kontrol, TypeScript a produkční build prošly. Zkouška460 smyšlených řádků/9 kategorií ověřila úplné vazby a zdroj; PGlite nepokrývá živý víceklientový PostgreSQL. [Evidence](crew-import-verification.json). Browser/E2E akceptace nyní neproběhla.

Skutečný import, živé DDL, schválení, granty, deploy ani merge nebyly spuštěné. Pracovní SQLite a historie2026/2025 se nemění. Přístupy, mapování, provozní operátor, úplná záloha/obnova a výslovná aktivace zůstávají na později v [31](31-AKTIVACE-A-RUCNI-KONTROLY.md); nyní bez otázek. Další samostatná práce: soukromé čtecí rozhraní historie, předimportní kontrolní protokol a negativní víceklientové testy v odděleném PostgreSQL. Aktualizační importer je případný další rozsah, nikoli automaticky povolený overwrite.


## 2026-11-05 — neveřejný zdrojový model a porovnání převodu crew

IMPLEMENTED / synteticky ověřeno: nová additive migrace35 zachovává přesný původní source_text a SHA256, historii/sloupce/audit/requests i zdrojové vazby. Balíčky a vazby čte pouze správce správného ročníku; koordinátor/finance/člen k nim nemá přístup. Jsou chráněné proti UPDATE/DELETE/TRUNCATE, přímé klientské zápisy nejsou povolené a žádné nové write RPC nevzniklo. Trigger ověřuje aktivní ročník/skutečného autora a vazby pracovního řádku2027 na původní historii2026. Tato vrstva je archiv původu, nikoli dokončený transakční importer.

Porovnání36 pracuje pouze s explicitními mapováními a úplným oprávněným cílovým exportem. Nedostupný cíl nezamění za prázdnou DB, zohlední NULL/0, chybějící kategorie/odměny a dřívější sourcehash nesmí skrýt změny cíle. Administrátorské čtecí RPC získá úplný cílový přehled v jednom statement snapshotu, bez source_text; odmítne jiné role, ročník nebo překročené limity. Report neobsahuje kopie jmen/kontaktů/částek a zůstává reconciliation_only/applyReady:false. Mapování se nevytváří podle podobných jmen nebo kontaktů.

Preflight nyní zahrnuje26 tabulek a12 funkcí, včetně kontroly, že interní transfer funkce nejsou veřejně spustitelné. Inventář obsahuje5 přesně zahashovaných migrací, bez autoApply. Na skutečném serveru nebylo spuštěné DDL/RPC, vytvořené granty nebo provedený import. Pracovní SQLite/historie zůstávají původní zdroj.

Ověření:248 aplikačních testů (19 nových DB scénářů), úplný TypeScript a produkční build, 148 hostitelských Python a37 původních Node kontrol prošlo. Soukromý report nad ověřeným snapshotem zachoval všechny zdrojové řádky; cíl/mapování nebyly dodané, proto je výslovně označený jako nedostupný/nenamapovaný. Zdrojové bytes se nezměnily a target_written:false. [Evidence](crew-transfer-verification.json).

Na později zůstávají skutečné přístupy/projekt, schválené mapování lidí/skupin a účtů, ověřená záloha/obnova, živá víceúčtová a browser akceptace a výslovný aktivační krok. Další nezávislá implementace: transakční idempotentní importer s kontrolou schváleného plánu a verzí cíle, obnova provenance/vazeb a soukromé čtecí rozhraní historie. Není to souhlas tyto kroky aktivovat. Podrobnosti [35](35-CREW-ZDROJE-A-HISTORIE.md), [36](36-CREW-POROVNANI-CILE.md), ruční brány [31](31-AKTIVACE-A-RUCNI-KONTROLY.md).


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

Tento blok nahrazuje starší operativní stavy níže; starší zápisy jsou historie předání.


## Aktuální pokračování — 2026-11-02

Souhrny kategorií 25 dokončené v kódu, devět nových syntetických testů (37 Node kontrol celkem), lokální aktivace beze změny DB. Nová vizuální kontrola čeká kvůli vypnutému místnímu browseru. Historické hlášení CLAUDE_ACCOUNT_BUSY níže již není současný blok tohoto kroku. Uživatel výslovně zadal navazující implementaci: [27](27-NAVAZUJICI-IMPLEMENTACE.md). Další celek: ročníková crew a role/obsazenost se skutečně oddělenými oprávněními a soukromými odměnami. Neprovádět neodsouhlasené individuální granty nebo automatické slučování historických osob.

## Další samostatný bod — stav po PÁ/SO

Zadání [25](25-CREW-STAVY-KATEGORII.md), issue #22: stavové součty kategorií. Dry-run prošel, skutečný běh se zastavil CLAUDE_ACCOUNT_BUSY ještě před modelem. Žádné změny rendereru/souhrnů nebyly aplikované. Respektovat společný účet/zámek a nepoužívat alternativní účet nebo kvótu. Nezávislé syntetické testy jsou připravené hostem mimo publikovaný kód a před dalším předáním se znovu zkontrolují proti aktuálním časovým sloupcům. Uživatelská potvrzení zůstávají odložená a nejsou touto technickou překážkou vyžadovaná.

## Nejnovější změna — PÁ/SO, 2026-10-29

Místní personál má dva ukládané časové sloupce PÁ (od–do) a SO (od–do), včetně editoru a CSV. [26](26-CREW-PATEK-SOBOTA.md), [evidence](crew-days-verification.json). Zpětná kompatibilita starších formulářů chrání uložené časy před nechtěným vymazáním. 96 Python + 28 Node testů a fiktivní browser průchod prošly. Žádná změna skutečných záznamů při aktualizaci; historie a původní zdroje zachované. Přehled stavů kategorií 25 je pouze připravené zadání, implementace nezačala kvůli přednostnímu požadavku na časy. Ruční potvrzení dál odložená.

## Nejnovější celek — 2026-10-29

Navazující Draft PR #21 dodává filtrovaný CSV přehled místní evidence, včetně historie, bez zápisu dat. [24](24-CSV-PREHLED-A-ODLOZENE-KONTROLY.md), [evidence](crew-csv-verification.json). 80 Python + 19 Node testů a izolovaný průchod prohlížečem. Uživatelské kontroly identity/skupin, domluv, UX a konkrétních sdílených oprávnění jsou na výslovný pokyn odložené v backlogu, nikoli schválené mlčením. CSV nenahrazuje JSON/SQLite zálohu; automatické denní zálohy stále nejsou aktivní.

## Nejnovější pracovní přehled — 2026-10-28

Obecné zdroje místního přehledu jsou v navazujícím Draft PR #19, základ PR #17. Atomické SQLite snímky ověřené 73 syntetickými testy včetně obnovy; skutečný stav a hranice v [23](23-PRACOVNI-EVIDENCE-A-SNIMKY.md). Soukromý seznam k ruční kontrole ani skutečná DB nejsou modelový/veřejný kontext. Priorita zůstává Lidi a crew; sdílené oprávnění a import jsou další samostatný krok.

## Aktuální předávací postup — 2026-10-28

Na výslovné zadání používat projektový [svdt-claude-handoff](../event-app/skills/svdt-claude-handoff/SKILL.md), hostitelský runner a pravidla v [22](22-CODEX-CLAUDE-SPOLUPRACE.md). Claude připravuje vybrané implementace/opravy, Codex nezávisle přezkoumává, testuje a spravuje Git. Personální SQLite a necommitnutá pracovní verze zůstávají v původní místní kopii; čistá worktree z HEAD je automaticky neobsahuje. Starší pořadí modulů nepřepisuje aktuální prioritu Lidi a crew.

Aktualizováno 2026-10-03; aktuální Partneři a ověření viz `IMPLEMENTATION-STATUS.md` (10 DB/doménových a 15 browser testů). Historické popisy níže zachycují předání z 2026-09-28. Tento dokument je výchozí mapa; aktuální změny ověř proti kódu a `git status`. Source of truth zůstává celý adresář `event-app-zadani/`.

## Jak začít

Otevři Claude Code v **této existující pracovní složce**:

```sh
cd /cesta/k/SVDT2027
claude
```

Claude Code je na tomto Macu nainstalovaný; ověřeno `claude --version`: 2.1.247. Přihlášení k účtu ani načtení skills v běžící relaci nebylo tímto předáním zkoušeno. Otevři Claude Code přímo ve složce `event-app/`; `CLAUDE.md` importuje místní `AGENTS.md` a projektové skills jsou v `event-app/.claude/skills/`. Jejich příkazy mají prefix `svdt-`, aby se nekřížily s obecným review/design příkazem.

Úvodní prompt pro vložení:

> Otevři Claude Code ve složce `event-app/` a použij /svdt-start. Načti místní CLAUDE.md, AGENTS.md a celý sousední adresář ../event-app-zadani/, zkontroluj kód a aktuální Git stav. Respektuj rozpracovanou necommitnutou práci. Nejprve mi stručně potvrď architekturu, co je hotové, co je pouze demo a otevřená rozhodnutí. Připrav konkrétní plán dokončení Partnerů a převodu Financí na skutečný backend s akceptačními podmínkami. Důležitá rozhodnutí zapisuj do příslušných MD a DECISIONS.md. UI zatím zásadně nepředělávej, WhatsApp/Twilio neřeš a nic nenasazuj ani neimportuj do produkce při úvodním převzetí.

Tento první prompt je orientace a plán, ne implementace všech modulů. Po jeho zodpovězení zadá uživatel první vybraný funkční celek. Codex následně může provést nezávislé review konkrétní změny.

## Git a předání práce

- Repozitář: `kabelkac77/SVDT2027`, origin HTTPS GitHub.
- Repozitář je veřejný. Uživatel 2026-09-28 výslovně zadal aktualizaci stávajícího GitHub repozitáře. Publikujeme kód, migrace, testy, dokumentaci a projektové skills; soukromé podklady, konfigurace a lokální zálohy zůstávají mimo Git.
- Výchozí commit před integrací: `7e4327741406b97045776d814258bfeba34cc59f`; pracovní větev `codex/partners-v1`. Tato změna zahrnuje dosud lokální aplikaci a handoff. Aktuální commit a stav vždy ověř příkazy `git log -1` a `git status`.
- Cílem integrace je `main`, pouze fast-forward bez force-push. Před další prací načti aktuální vzdálený stav a zachovej případné místní změny.
- Pro nový počítač použij aktuální klon repozitáře; závislosti nainstaluj podle návodu níže a konfiguraci `.env.local` předej samostatně. Soukromé vstupní soubory nejsou součástí klonu.
- Root obsahuje také veřejný web/design a `DT-grafika-TV/`. Nejsou předmětem tohoto handoffu k implementaci.

## Dokumenty k načtení

Při prvním převzetí přečti všechny MD v `event-app-zadani/`; následující seznam je orientace, ne náhrada celku:

- `00-MASTER-CONTEXT.md`, `CONTEXT.md`, `APP_ARCHITECTURE.md`: organizace a dlouhodobá architektura.
- `DECISIONS.md`, `IMPLEMENTATION-STATUS.md`, `BACKLOG.md`, `INPUTS-NEEDED.md`: aktuální rozhodnutí, důkazy, další práce.
- `10-PARTNERI.md`, `10-PARTNERI-MODEL-A-FLOW.md`, `10-PARTNERI-IMPORT.md`: model interního partnerství a filtrace historických podkladů.
- `11-FINANCE.md`, `11-FINANCE-MODEL-A-FLOW.md`, `11-FINANCE-PODKLAD.md`: finance, hranice dema, zdrojový Excel.
- `PRIHLASOVANI.md`, `HOSTING.md`, `SPOLUPRACE-A-ZALOHY.md`: aktivace přihlášení, nasazení a zálohy.
- Při změně vzhledu také `design-system/SKILL.md` a `design-system/readme.md`.

Některé starší dokumenty popisují cílovou architekturu (např. portály, AI, offline), ne dokončenou implementaci. Rozpory řeš podle novějšího rozhodnutí a ověřeného stavu, nezamlčuj je.

## Co aplikace skutečně umí

| Oblast | Stav | Co ještě chybí |
| --- | --- | --- |
| Interní Partneři | CRUD, owner/stav, kontakt, potvrzení partnerství, plnění, audit a archiv; Supabase migrace/RLS/RPC | Kompletní test rolí a souběhu proti skutečné službě; další portálové funkce |
| Supabase | Projekt založený, uživatel hlásil Success po migraci a bootstrap admina a potvrdil přihlášení | Agentem ověřená úplná live integrace více účtů; nepovažovat login za důkaz všech RLS scénářů |
| Import partnerů | Python filtr, privátní JSON fronta, kontrola a předvyplnění zvoleného záznamu | Skutečný hromadný import není proveden; status 2027 se nesmí odvodit ze starého partnerství |
| Finance | Propojené demo s Partnery; plán/potvrzená částka, úhrady, barter a osobní proplacení | Žádná finance SQL migrace ani produkční finanční evidence, samostatná oprávnění a serverový audit |
| Google/Apple/Facebook | Klientská OAuth podpora připravená | Konfigurace provider účtů a reálné přihlášení každým providerem; žádné údaje nevymýšlet |
| WhatsApp/Twilio | Klientský kód a mock testy existují | **Výslovně odloženo. Neaktivovat ani dále řešit.** |
| Zálohy | Jednorázový archiv zdrojů v určené iCloud složce, ověřená lokální kopie | Automatický denní dump, CSV/XLSX, přílohy, monitoring a test obnovy |
| Hosting | Lokální náhled; veřejný web se plánuje na Active24 | Nasazení aplikace/doména; statický export pro Active24 není otestovaný |

Žádní skuteční partneři nebyli automaticky vloženi a žádná hromadná zpráva ani pozvánka nebyla odeslána. Samoobslužný Crew/Partner/Rider Portal, realtime, PWA a offline synchronizace nejsou implementované.

## Mapa kódu

Všechny následující cesty jsou relativní k `event-app/`:

| Soubor | Význam |
| --- | --- |
| `src/app/page.tsx` | Skutečná evidence `/` |
| `src/app/demo/page.tsx` | Fiktivní lokální `/demo` |
| `src/app/podklady/page.tsx` | Read-only lokální kontrola podkladů |
| `src/components/partners-app.tsx` | Partnerské UI, přihlášení, ročníky, formuláře |
| `src/lib/backend.ts` | Klientský Supabase singleton, načítání a RPC |
| `src/lib/model.ts` | Partnerské typy a validace |
| `src/lib/demo.ts` | Fiktivní partnerství a localStorage |
| `src/lib/finance.ts`, `src/components/finance.tsx` | Výpočty, lokální finanční model a demo UI |
| `src/components/intake.tsx`, `scripts/filter_partners.py` | Filtr a kontrola historických podkladů |
| `src/components/social-login.tsx` | OAuth dostupnost a přesměrování |
| `src/components/whatsapp-login.tsx` | Odložená telefonní metoda, ponechat vypnutou |
| `supabase/migrations/202609280001_partners.sql` | Partnerské tabulky, RLS, RPC a audit |
| `supabase/migrations/202609290001_partner_history.sql` | `neosloven` a historie organizace; lokálně ověřeno, stav produkční aplikace neověřen |
| `supabase/bootstrap-admin.sql` | Jednorázová příprava admina, ne běžný seed |
| `tests/database.test.ts`, `tests/finance.test.ts` | PGlite/RLS/transakce a peněžní pravidla |
| `tests/browser/` | Uživatelské průchody a mock Auth |

Stack z lockfile/package: Next 16.3.6, React 19.3, TypeScript 7, Supabase JS 2.117.2, Playwright, PGlite. Před použitím nové Next API čti dokumentaci dodanou s nainstalovanou verzí (`node_modules/next/dist/docs/`). Aktuální auth je klientské SDK s implicit OAuth návratem na `/`, bez SSR cookies. Přechod na SSR/PKCE je vědomá architektonická změna, ne přidání náhodného callbacku z jiného tutoriálu.

## Lokální práce a testy

Node >=22; dosud ověřeno na Node 26. Z `event-app/`:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm ci` je potřeba při přípravě závislostí, nikoli před každým testem. Pro náhled `npm run dev`; výchozí adresa `http://127.0.0.1:3000`. `event-app/.env.example` obsahuje pouze názvy veřejných proměnných. `.env.local` existuje lokálně a není v Gitu; pro nový stroj použij bezpečné předání konfigurace. Nikdy nenastavuj service-role klíč jako `NEXT_PUBLIC_*`.

Playwright používá nainstalovaný Chrome. Vytvořený testovací server zapíná `NEXT_PUBLIC_WHATSAPP_ENABLED=true` pouze pro mock scénáře; skutečný Phone provider je vypnutý. Playwright nepoužívá již běžící server. Běžný náhled/provoz ponechává flag vypnutý. Od 2026-10-03 testovací server používá vlastní fiktivní URL/klíč a nepřebírá již běžící server. Produkční `.env.local` pro testy není potřeba; port 3000 musí být volný. OAuth/OTP i partnerské Data API v nových scénářích jsou mockované.

Dosavadní výsledek: 7 databázových/doménových testů, 12 browser testů, TypeScript a produkční build prošly. Poslední běh po změně WhatsApp: typecheck + 12 browser + build; DB/domain testy prošly předtím a DB se následně neměnila. Jde o lokální ověření, nikoli plné live přihlášení OAuth/Twilio.

Kvůli extrémně pomalému čtení závislostí v Documents byla použitá ověřovací kopie `/private/tmp/svdt-verification/event-app` se sourozencem `design-system/tokens`. Na této kopii může stále běžet náhled. Zdroj je ale tento repozitář: pokud použiješ kopii, explicitně synchronizuj změny před testem a zkontroluj shodu. Netestuj starý kód a nekopíruj zpět cizí `.env` nebo generované soubory. Dočasná složka nemusí příště existovat. Jeden server/build používej v daném checkoutu koordinovaně.

## Databáze, podklady a provozní přístupy

Supabase projekt `svdt-organizace`, URL `https://<project-ref>.supabase.co`. Veřejný klientský klíč není administrátorský přístup. Kód nevlastní oprávnění pro export celé DB nebo změnu konfigurace Auth. Migrace/členství byly spuštěné ručně uživatelem; neopakuj bootstrap naslepo.

Tabulky Partnerů: events, editions, edition_members, people, organizations, partner_prospects, edition_partnerships, partner_deliverables, audit_log. Role admin/manager/viewer platí ročníkově. Organizace/osoby jsou sdílené, čtení je omezené členstvím. Zápisy přes kontrolované RPC, ne přímý insert z prohlížeče. Nový sociální účet bez členství uvidí pouze zprávu o chybějícím přístupu.

Privátní podklady na tomto Macu: `.local/partners-intake.json`, `.local/finance-source.json`; zdrojové Excel soubory jsou mimo repo. Filtr partnerů našel 116 kandidátů a 32 řádků k ruční revizi. Nejde o schválené partnery 2027. Finanční podklad zahrnuje více akcí a překryvy; klasifikaci řídí `11-FINANCE-PODKLAD.md`. Nenačítej všechny osobní údaje do reportu a nepřenášej je do veřejných fixture.

Dočasně schválený cíl záloh:

```text
[cesta v neveřejném PROVOZ.md]
```

Zápis na disk neprokazuje dokončený iCloud upload. První archiv neobsahuje databázi, Auth, Storage objekty, lokální podklady, secrets ani Git historii. Denní záloha musí mít vlastní implementaci, přístupy a test obnovy. Přesný model Synology není známý.

## Doporučený postup další implementace

1. **Výchozí stav a review Partnerů:** zachovat případnou necommitnutou práci, ověřit testy a skutečné chování dostupného prostředí. Nezakládat znovu Supabase. Rozpory v MD opravit.
2. **Finanční model pro DB:** doplnit explicitní finanční oprávnění, osobu platící vlastními penězi, opravné/stornovací operace a schvalování. Neodvozovat finanční právo automaticky z partnerského managera bez rozhodnutí. Výstupem má být konkrétní model/migrační návrh a testovací scénáře, potom první omezený funkční celek.
3. **Finance backend:** nová migrace, RLS, transakční operace a audit; napojit existující UI, zachovat demo samostatně. Teprve poté ověřený import vybraných skutečných dat.
4. **Provozní zálohy:** denní databáze + čitelné CSV/XLSX a přílohy, cíl iCloud dočasně. Před skutečnými produkčními daty musí existovat ověřená obnova; přístupy řešit bezpečně mimo MD.
5. **Google/Apple/Facebook a hosting:** podle dostupných účtů doplnit konfiguraci a akceptaci; neblokovat na tom nezávislou práci. WhatsApp přeskočit. Produkční doménu a způsob hostingu nejprve uzavřít.

První finance celek je hotový, až se skutečně uloží a po obnovení načte položka a částečná úhrada; nečlen a neoprávněná role nic nečtou/nepíšou; dva souběžné zápisy nemohou porušit zůstatek; archiv odmítá změny; audit má správného autora; a MD vysvětlují dodaný rozsah i zbývající omezení. Produkční přístup do Financí nezapínej jen proto, že funguje demo.

## Skills a další nástroje

Projektové skills jsou připravené v repozitáři bez externích instalací. Příkazy: `/svdt-start`, `/svdt-implement`, `/svdt-review`, `/svdt-design`. Metadata a odkazy se kontrolují lokálně; skutečné načtení si při zahájení ověř v Claude Code přes `/memory` a seznam skills. Po změně projektu může být potřeba nová relace.

Git, npm, Playwright a SQL testy pro začátek stačí. Google Drive/MCP a další účty nepřipojuj plošně. Současné lokální podklady umožňují pokračovat bez přístupu k původním Drive odkazům. Pro Supabase lze později použít CLI/MCP s omezeným rozsahem; klíče nedávej do verzovaných konfigurací. Skills instalované pro Codex nepovažuj automaticky za nainstalované pro Claude.

Oficiální formát ověřen při přípravě: [Claude Code memory](https://code.claude.com/docs/en/memory), [Claude Code skills](https://code.claude.com/docs/en/skills). Nebyly nastaveny automatické hooks, výjimky z oprávnění ani globální konfigurace.

## Rozdělení veřejné a neveřejné části — 2026-09-29

Veřejný kód a obecná specifikace zůstávají v `kabelkac77/SVDT2027`, dokumentace v `event-app-zadani/`. Neveřejné podklady a provozní údaje patří do soukromého `vojtechhrach/SVDT2027-soukrome/event-app-podklady-soukrome/`. Hesla a klíče se neverzují nikde. Přístupy k oběma repozitářům se ověřují odděleně.

## Aktuální další krok — 2026-10-03

Partneři (pracovní tabulka, `neosloven`, historie) jsou uzavření v samostatném otestovaném commitu `707d560` na `main`; TypeScript/build, 10 DB/doménových a 15 browser testů prošly. Produkční migrace ani data se v tomto kroku neměnily. Zdrojové `.DS_Store` zůstaly mimo commit; konfigurace/podklady jsou ignorované.

Finance mají detailní plán `11-FINANCE-IMPLEMENTACNI-PLAN.md`. Příští implementátor začne B0 (potvrdit otevřená finanční práva/schvalování), potom B1: oddělený grant/audit, návrh a schválení položky, bankovní/hotovostní částečná úhrada, verze a idempotentní RPC. Zůstává zákaz nasazení, produkčních mutací, ostrého importu a placené aktivace bez dalšího výslovného pokynu. Dnešní Finance jsou stále demo.
