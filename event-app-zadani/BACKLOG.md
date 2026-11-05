# MASTER BACKLOG

## 2026-11-05 — transakční importer crew

- [x] Nová schema-only migrace37: create/keep, úplnost zdroje, oddělené odměny, atomické provenance/vazby/audit a idempotence.
- [x] Operátorské schválení vázané na správce/plán/zdroj/cíl, expirace, odvolání a jedno úspěšné použití; klient si jej nemůže sám vystavit.
- [x] Čistý builder38 bez zápisu nebo generování cílových identit, applyReady:false i s připraveným plánem.
- [x]264 app /162 Python /37 legacy kontrol, TypeScript a build;16 importních DB scénářů včetně460 syntetických řádků a rollbacku druhého řádku. Evidence crew-import-verification.json.
- [ ] Dále samostatně: soukromé čtení původní historie v aplikaci a kontrolní protokol před převodem, bez živé aktivace.
- [ ] Dále samostatně podle dostupnosti izolovaného PostgreSQL: skutečné víceklientové testy blokací, ztráty role a opakování. PGlite není důkaz souběhu.
- [ ] Později s uživatelem podle31: projekt/přístupy, schválené mapování, operátor, úplná záloha/obnova, domluvené okno a výslovný aktivační pokyn. Skutečný import je nyní výslovně zakázaný.
- [ ] Aktualizační synchronizace/overwrite mimo V1: případně navrhnout zvlášť, nic nepřepisovat automaticky.


## 2026-11-05 — neveřejný zdrojový model a porovnání převodu crew

- [x] Neveřejné zdrojové balíčky/vazby a chráněný čtecí export cíle v kódu, bez produkční aktivace.
- [x] Readonly porovnání,17 nových Python scénářů a syntetické propojení SQL exportu s porovnáním.
- [ ] Transakční idempotentní importer, kontrola schváleného source/mapping/target fingerprintu a aktuálních verzí; žádný automatický zápis.
- [ ] Skutečný projekt/role, cílový export, schválené mapování a ověřená obnova před aktivací.


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


Další otevřené pořadí: ověřit skutečný sdílený projekt a migrace/účty → řízený převod místní crew bez ztráty polí/historie → kolektory úplné zálohy, vzdálený vykonavatel a ověřená obnova → skutečná pravidla registrací, harmonogram a mapový podklad → společný desktop/mobil průchod. Konkrétní závislosti jsou v31; nic z toho není potvrzené mlčením. Následuje užší role vedoucího zóny, společné Moje práce a případná realtime/offline podpora.


## 2026-11-02 — šifrovaný zálohovací balíček a bezpečná obnova

IMPLEMENTED / synteticky ověřeno: knihovna `backup-bundle.js`, šest povinných inventářů, AES-256-GCM, kontrola SHA-256 a obnova pouze do nové soukromé složky. Patnáct testů ověřuje skutečné šifrování, poškození, úplnost, cesty, zákaz přepsání a úklid při I/O chybě bez odstranění cizích souborů. Testy jsou součástí běžného `npm test` a CI.

**Úplné automatické zálohy mimo tento počítač nejsou aktivované.** Chybí kolektory, přístup k úplnému databázovému dumpu a Storage, úschova klíče, vzdálený vykonavatel, důkaz vzdálené kopie, plán a ověření obnovy databáze. Rozsah [29](29-ZALOHY-IMPLEMENTACE.md), odložené aktivace [31](31-AKTIVACE-A-RUCNI-KONTROLY.md). Další nezávislá práce: provozní moduly; zálohovací integrace pokračuje podle dostupných přístupů.


## Sdílená crew — ověřený kód, aktivace odložená

- [x] Crew tabulky, soukromé odměny/audit, RLS a verzované idempotentní zápisy.
- [x] Auth, přehled/inline editace, cíle obsazenosti, oddělené formy a správa existujících členství; TypeScript/build a66 aplikačních testů.
- [ ] Dostupný správný projekt, skutečné migrace, účty/granty, víceuživatelský průchod a hosting.
- [ ] Řízený import místní crew se všemi zdrojovými poli a zachováním historie; žádné automatické slučování.
- [ ] Desktop/mobil a přístupnost v prohlížeči; nyní ověřeno SSR, nikoli skutečný browser.
- [x] Šifrovaný formát a bezpečná souborová obnova;15 testů.
- [x] Místní a PostgreSQL kolektory, šifrovaný koordinátor a syntetické ověření zpětného čtení.
- [x] Storage inventář/kolektor a propojené syntetické ověření;32 vlastních scénářů.
- [ ] Skutečný vzdálený adapter, plánovač/monitoring/retence a izolovaná obnova DB/Auth/příloh.
- [x] První provozní rozhraní, adaptéry a modely integrované do /crew;147 testů celé aplikace, TypeScript/build. Skutečný provoz není tím nasazený.

Vše potřebné k pozdějšímu ručnímu potvrzení v [31](31-AKTIVACE-A-RUCNI-KONTROLY.md).


## Potvrzené pokračování — 2026-11-02

CONFIRMED: uživatel zadal dokončit souhrny kategorií a navazující personální přehled, potom sdílení crew s účty a oprávněními, automatické úplné zálohy mimo počítač a následně úkoly/harmonogram, registrace závodníků, zóny/mapu a provozní mobilní pohled. Jde o skutečnou implementaci po ověřitelných celcích, ne pouhý návrh. Konkrétní totožnost účtů, rozsahy přístupů, cílové obsazení, pravidla registrací a provozní volby bez podkladů zůstávají k pozdějšímu potvrzení; nevyžadovat je jako podmínku nezávislé práce. Stávající skutečná evidence a historie se zachovávají. Podrobný sled a podmínky dokončení v [27](27-NAVAZUJICI-IMPLEMENTACE.md).

## Aktuální priorita uživatele — 2026-10-29

- [x] Přidat editovatelné a trvale ukládané sloupce PÁ (od–do), SO (od–do). [Zadání 26](26-CREW-PATEK-SOBOTA.md).
- [ ] Později uživatelsky projít rozložení časových sloupců; skutečné časy, směny a konkrétní data zůstávají k doplnění.

## Samostatná práce — 2026-10-29

- [x] Souhrny stavů zobrazených uložených záznamů v záhlaví kategorií 2027, i při sbalení. Implementováno 2026-11-02, 9 nových testů / 37 Node kontrol. [Zadání 25](25-CREW-STAVY-KATEGORII.md).
- [ ] Později vizuálně ověřit souhrny na desktopu a mobilu; místní browser byl při tomto kroku vypnutý.
- [ ] Později s uživatelem potvrdit čitelnost přehledu a potřebné počty/role/termíny pro skutečnou obsazenost. Počty záznamů nejsou počty unikátních lidí ani potvrzení personální připravenosti.

## Ruční potvrzení odložená uživatelem — 2026-10-28

**CONFIRMED:** uživatel výslovně odkládá vlastní kontrolu a společný průchod na později. Tyto body nejsou podmínkou další samostatné technické práce a nejsou schválené mlčením.

- [ ] Později společně projít nejasné identity/skupiny, opakovaná jména a zařazení. Soukromý návrh řádků je připravený místně.
- [ ] Později potvrdit skutečné termíny, účast, částky a barter/merch pro aktuální ročník.
- [ ] Později vyzkoušet CSV v používaném Excelu/tabulkovém editoru; desktopový Excel se při technických testech nespouštěl.
- [ ] Později potvrdit vzhled a pracovní průchody, konkrétní sdílení/oprávnění a další otevřené produktové volby. Do té doby je neuzavírat za uživatele.

## Dokončený samostatný celek — 2026-10-29

- [x] Dodat čitelný CSV export aktuálně filtrovaného uloženého přehledu, po jednotlivých ročnících, se všemi zdrojovými sloupci a ochranou textových hodnot pro čtení v Excelu. Bez zápisu do evidence nebo přenosu dat mimo zařízení.

## Pracovní přehled a snímky — 2026-10-28

- [x] Verzovat zkontrolované obecné zdroje místního pracovního přehledu se syntetickými ukázkami a izolovanými testy; bez provozních dat.
- [x] Ověřit a opravit atomické SQLite snímky po nezávislém review: 73 testů, souběh, I/O poruchy a obnova; [23](23-PRACOVNI-EVIDENCE-A-SNIMKY.md), Draft PR #19 navazující na #17.
- [x] Připravit místní návrh řádků k ručnímu posouzení bez změny záznamů; obsah nepatří do Git/modelového kontextu.
- [ ] Ručně projít identity, zařazení a skutečné domluvy; navazující sdílení a konkrétní oprávnění zůstávají samostatně otevřené.

## Nastavení vývojové spolupráce — samostatně zadaný krok 2026-10-28

- [x] Ověřit oba repozitáře a identitu, zachovat původní rozpracovanou kopii, připravit izolovanou větev.
- [x] Vytvořit/nainstalovat SVDT skill a vlastní runner, ověřit společný kapacitní guard, 15 hostitelských testů a dry-run.
- [x] Skutečný návrh → nezávislé review → připnutá oprava → nové review, 40 testů + 41 negativních kontrol; důkazy v [22](22-CODEX-CLAUDE-SPOLUPRACE.md), Draft PR #17.

## Organizace
- [ ] Potvrdit Mirka (?) jako Race Coordinatora + najít zálohu.
- [ ] Jindra (?) jako Vlasta +1; obsadit Vojta +1.
- [ ] Zástupy IZS Coordinator, Track Manager, Marshals Manager.
- [ ] Waste/Cleaning Manager.
- [ ] Production/Logistics Lead.
- [ ] Owner předání postaveného areálu.
- [ ] Owner kontroly naložení skladu/dodávek.
- [ ] Finální zařazení Crew Base.

## Race / safety
- [ ] Timekeeping Emergency Protocol s dodavatelem.
- [ ] Rerun/timing pravidla se svazem/rozhodčím.
- [ ] Záložní kamery start+cíl.
- [ ] Radio Protocol + radio-check.
- [ ] Aktualizace evakuačního plánu + feedback IZS.
- [ ] Weather/Crisis Protocol + thresholdy.
- [ ] Lost Child Protocol.
- [ ] Missing crew/rider postup.
- [ ] Go/No-Go checklist.
- [ ] Restart protocol.
- [ ] Incident reporting standard.
- [ ] Power/internet fallback.
- [ ] Rider uplift 2027.
- [ ] Jídlo/střídání/únava komisařů.
- [ ] Rozmístění komisařů i podle broadcast záběrů.

## Race Control
- [ ] Potvrdit Točírnu; ověřit power/internet/radio coverage.
- [ ] Equipment list + access rules.
- [ ] Race Control Assistant ano/ne.
- [ ] Check-in rytmus Vojta ↔ Race Coordinator.

## App architektura
- [ ] Finální ER diagram.
- [ ] Permissions matrix.
- [ ] Offline, audit log, notifications, file storage, import/export strategy.
- [ ] Prověřit Synology API.
- [ ] Map proof-of-concept.
- [ ] Multi-event scope do budoucna.

## Map
- [ ] Srovnat technologie + prototyp desítek vrstev.
- [ ] Mobile/desktop performance + offline cache.
- [ ] PDF print/export.
- [ ] Scan papírové mapy → AI návrh změn.
- [ ] Live Crew Tracking pravidla/souhlasy/retence.

## AI
- [ ] AI gateway + limity.
- [ ] Voice input, incident assistance, map proposals, weather, readiness briefing.
- [ ] Test před závodem + post-event evaluation.

## První implementace
### Partneři
- [ ] detailní schema, interní V1, Partner Portal, questionnaire, fulfillment, VIP QR, post-event report.
- [x] Detail interního modelu a UI/flow — `10-PARTNERI-MODEL-A-FLOW.md`.
- [x] Interní V1 + SQL migrace + oddělené demo + testy — `../event-app/`.
- [x] Filtrace dodaného Excelu a kontrola podkladů — `10-PARTNERI-IMPORT.md`.
- [x] Připojit Supabase a připravit admin přístup — uživatel potvrdil migraci, bootstrap a přihlášení.
- [ ] Dokončit live ověření Auth/PostgREST pro více rolí, hosting a automatické zálohy.
- [ ] Navazující externí portal/questionnaire/VIP QR/uploady/report. Souhrnná položka výše zůstává otevřená.
### Finance
- [x] Propojené lokální demo Partneři/Finance a model zkušebního flow — `11-FINANCE-MODEL-A-FLOW.md`. Sdílený backend zůstává otevřený.
- [ ] načíst Excel, schema plan/actual, faktury/přílohy/payment status, později Fio API.
- [x] Načíst všech šest listů dodaného rozpočtu, mapovat zdroje a převodní pravidla — `11-FINANCE-PODKLAD.md`.
- [x] Detailní implementační plán backendu, modelu a UI/flow — `11-FINANCE-IMPLEMENTACNI-PLAN.md` (2026-10-03). Návrh samostatných rolí a self-approval čeká na potvrzení; implementace zůstává otevřená.
- [ ] B0: potvrdit konkrétní finanční role, self-approval a význam částek podkladu.
- [ ] B1: finanční grant + položka/schválení + částečná úhrada + idempotence/audit v izolovaném prostředí.
- [ ] B2–B6: osobní platby/barter, opravy, soukromé doklady, import/export/obnova a akceptace podle plánu.
- [ ] Implementace, finanční oprávnění a ověřený import. Souhrnná položka zůstává otevřená.

## Další moduly

- [ ] **Odloženo na výslovný pokyn uživatele:** WhatsApp přihlášení / Twilio Verify. Klientský kód je připravený a vypnutý. Teď nekonfigurovat, neaktivovat ani nekupovat služby; vrátit se až na další pokyn. Podklady: `PRIHLASOVANI.md`.

- [ ] Denní obnovitelné zálohy aplikace, DB a příloh + CSV/XLSX, nezávislé úložiště, monitoring a ověřená obnova — `SPOLUPRACE-A-ZALOHY.md`.
- [x] Připravit předání Claude Code, společné instrukce a projektové skills — `HANDOFF-CLAUDE.md`.
- [x] Připravit ucelený Git commit aplikace, dokumentace a Claude handoffu; porovnat výchozí stav s GitHub `main` (2026-09-28).
- [ ] Další implementace předávat po malých změnách přes PR a review.

Personnel/Crew Portal; Riders/Registration; Suppliers; Zones; Tasks; Schedule; Brigády; Build Plan; Media Plan/Portal; Branding; Spectator app; Weather; Accreditation; Accommodation; Parking; Knowledge Base; Feedback; Post-event closeout.

Podrobně dodaný vs. zbývající rozsah: `IMPLEMENTATION-STATUS.md`.
