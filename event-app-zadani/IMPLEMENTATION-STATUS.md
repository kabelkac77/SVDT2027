# Stav implementace

## 2026-11-28 — přerušení recovery a inventář53

[53](53-POSTGRES-PRERUSENI-RECOVERY-A-INVENTAR.md): skutečný SIGKILL pouze vlastního recovery procesu v5 bodech (verified/removed/credentials/checkpoint/report), převzetí lease novým procesem, dokončení a opakovaná recovery prošly. Inventář používá pouze metadata známého testovacího rozsahu: žádný obsah souborů, Docker, flock nebo mazání. Vyhrazený root:642 položek, bez známých credentials/.private/.checkpoint temporaries; persistentní evidence zachovaná. Podrobný JSON je soukromý, veřejný jen souhrn.

226 hostitelských a62 bezpečnostních pod Python -O prošlo,11 nových unit případů. Regrese10 standardních PG,4 startup chyby,6 I/O bodů, souběžná recovery a SIGTERM/SIGKILL prošly. [Evidence](postgres-recovery-interruption-verification.json). **RX01 opět selhal0/1 a48/issue61 dál blokuje aktivaci.** Runtime/kolektor/7 migrací/CI beze změny;18+26 pending neprovedeno, native auth/model/usage nezkoušeno. Další neblokované kroky: přerušení uvnitř atomického zápisu a změna adresáře během inventáře. Živé přístupy/obnova/aktivace na později31/45, skutečný import zakázaný.

## 2026-11-28 — souběžná recovery a pozdní chyby52

[52](52-POSTGRES-SOUBEZNA-RECOVERY-A-POZDNI-CHYBY.md): běžící test i recovery drží tentýž soukromý neblokující flock. Druhý proces vrátí RECOVERY_BUSY/exit1 bez Docker zásahu nebo změny checkpointu; soubor zámku se nemaže. Checkpoint se po získání lease čte znovu. Pozdní chyba zachová už zveřejněný soubor či provedené odstranění a nové ověření tyto kroky neopakuje naslepo.

Skutečně prošla ochrana aktivního testu i souběh dvou recovery procesů,6 řízených I/O bodů (3 nové po odstranění/publikaci),10 standardních PG,4 startup chyby a SIGTERM/SIGKILL.215 hostitelských a51 bezpečnostních pod Python -O prošlo;12 nových unit případů. [Evidence](postgres-recovery-lock-verification.json). **RX01 znovu selhal a48/issue61 dál blokuje aktivaci.** Runtime/kolektor/7 migrací/CI beze změny,18+26 pending neprovedeno, native auth/model/usage nezkoušeno. Přístupy a živé brány31/45 zůstávají na později; skutečný import zakázaný.

## 2026-11-28 — poškozená evidence a chyby zápisu51

[51](51-POSTGRES-POSKOZENA-EVIDENCE-A-CHYBY-ZAPISU.md): poškozený/cizí nebo ztracený checkpoint se během cleanup nepřepíše; zásah se zastaví před Docker příkazem. Jednorázové soubory se zveřejní celé až po fsync, bez nahrazení existující evidence. Chyba reportu vrací neúspěch i při ověřeném úklidu; reportPersisted a fakta úklidu jsou oddělená. Constructor/recovery CLI má bezpečnou chybovou odpověď bez raw výjimky.

Prošlo13 nových unit případů, celkem203 hostitelských a39 bezpečnostních pod Python -O. Tři skutečné řízené I/O chyby, každá s novou a opakovanou recovery,10 standardních PG případů,4 startup chyby i SIGTERM/SIGKILL prošly. [Evidence](postgres-evidence-io-verification.json). **RX01 znovu selhal;48/issue61 dál blokuje aktivaci.** Runtime/kolektor/7 migrací beze změny;18+26 pending nespouštěno, native auth/model/usage nezkoušeno. Další neblokovaná práce: dvě současné recovery a chyby po zveřejnění/odstranění. Živé přístupy/power loss/obnova/aktivace zůstávají na později31/45, skutečný import zakázaný.

## 2026-11-28 — chyby startu a neúplné checkpointy50

[50](50-POSTGRES-STARTUP-A-NEUPLNE-CHECKPOINTY.md): checkpoint v2 odlišuje prepared od creating před Docker create. Chybějící ID lze doplnit jen z nezávisle ověřeného vlastního živého kontejneru. Creating bez nalezeného kontejneru zastaví úklid a zachová checkpoint/přístupy; neplatné nebo napůl vyplněné stavy se odmítají. Úplné v1 zůstávají čitelné. Chyba startu vrací exit1 a není úspěšnou sadou ani při dokončeném úklidu.

Skutečně prošly4 řízené chyby spuštění (prepared, ztracené ID po create, před startem, před readiness), každá i s opakovanou recovery v novém procesu. Regrese:10 skutečných PG, SIGTERM, SIGKILL/recovery,190 hostitelských a26 bezpečnostních pod Python -O prošlo. [Evidence](postgres-startup-verification.json). **RX01 znovu selhal a48/issue61 dál blokuje aktivaci.** Runtime/kolektor/7 migrací beze změny;18+26 pending neprovedeno. Native auth/model/usage ani provozní import/DDL/grant/deploy/aktivace neproběhly. Další neblokovaná práce: cílené chyby zápisu/reportu a poškozené checkpointy; fyzický výpadek hostitele a živé přístupy/obnova zůstávají v31/45 na později.

## 2026-11-28 — další souběhy a recovery po SIGKILL

[49](49-POSTGRES-SOUBEH-A-RECOVERY.md): prošly4 nové skutečné PG scénáře (jiný request/stejné approval; ztracený klientský výsledek po COMMIT; dvě oddělené akce/edition2027 s globálním zámkem bez smíchání dat; pád serveru před/po COMMIT s rollbackem a zachováním potvrzených dat). Celkem10 běžných skutečných PG případů prošlo. Ověřené také SIGTERM a SIGKILL vlastního child procesu: nový recovery proces nezávisle ověří ID/název/image/label/mounts a teprve potom uklidí; druhá recovery je bezpečně idempotentní.182 hostitelských kontrol prošlo,18 bezpečnostních i pod Python -O. [Oddělená evidence](postgres-hardkill-verification.json).

Checkpoint sám mazání neautorizuje. Cizí metadata, symlinky/oprávnění, změněný checkpoint, dodatečné bindy, chybějící daemon nebo existující osiřelý volume úklid zastaví. Jména volumes z JSON se nikdy neposílají do volume rm. Testovaný SIGKILL následuje až po ready checkpointu; výpadek napájení/poškození souborů/neúplná inicializace se za hotové nevydávají.

**Chyba61/48 stále neopravena:** samostatný striktní RX01 znovu selhal (0 prošlých/1 selhání), po expiraci se vytvořil nový syntetický zápis. Zelené běžné kontroly aktivaci nepovolují. Aplikační runtime a7 migrací beze změny; žádný native auth/model/usage, skutečná crew/SQLite, provozní import/DDL/grant/deploy nebo vzdálená aktivace.18+26 parser/checker scénářů zůstává pending. Živé přístupy a potvrzení jsou odložené v31/45 bez dotazů.

## 2026-11-28 — SIGTERM/checkpoint hotové, chyba expirace blokuje aktivaci

[47](47-POSTGRES-PRERUSENI-A-SCHVALENI.md): atomický soukromý checkpoint a řízený SIGTERM skutečně ověřené; přerušený child vrací143/successful:false, vlastní kontejner/volumes/přístupy odstraněné a nezávisle potvrzené. Šest běžných skutečných PG scénářů prošlo (včetně odvolání/expirace při čekání na edition lock).174 hostitelských kontrol prošlo,10 bezpečnostních i při Python -O.

**Nová neopravená chyba48 / issue61:** při pozdějším čekání přímo na ShareRowExclusiveLock může schválení mezitím vypršet a RPC přesto zapíše. Samostatný striktní RX01 reproducer selhal (0 prošlých/1 selhání), SQL exit0 a1 balíček/roster/odměna/request; serverově doložená expirace. Není expectedFailure a nepočítá se do zelených kontrol. Připravené [zadání opravy48](48-CREW-EXPIRACE-PO-ZAMKU.md); aktivace je blokovaná i při zeleném běžném CI. [Oddělená evidence](postgres-interruption-verification.json).

Aplikační runtime a všech7 migrací beze změny; žádný native auth/model/usage, skutečná crew/SQLite, provozní import/DDL/grant/deploy nebo aktivace záloh. Oprava má přednost před pokračováním parser43/checker39/UI44 v nativním toku;18+26 scénářů zůstává pending. SIGKILL/power loss a automatická obnova z checkpointu jsou další neprovedené případy, nikoli hotový recovery proces. Přístupy a potvrzení zůstávají na později podle31/45 bez dotazů uživateli.

## 2026-11-27 — skutečný izolovaný PostgreSQL: souběh a obnova

Bez Claude dokončené [4 skutečné PostgreSQL zkoušky46](46-IZOLOVANY-POSTGRES-SOUBEH-A-OBNOVA.md): souběžný stejný request s pozorovaným zámkem a jediným zápisem; timeout55P03 s úplným rollbackem a přesným retry; odebrání role během čekání s odmítnutím42501; skutečný PostgreSQL kolektor/dump/obnova do nové DB. Obnova zachovala30 tabulek, původní zdroj/historii/NULL0, RLS/politiky a vybrané zákazy RPC. [Sanitizovaná evidence](isolated-postgres-verification.json).

PostgreSQL18.6 běžel v novém vlastním kontejneru na localhost s náhodným heslem a syntetickými daty. Po běhu ověřené odstranění tohoto kontejneru i jeho anonymních dat a smazání jednorázových přístupů. Žádný provozní projekt, skutečná SQLite/lidé ani existující DB se nekontaktovaly. Součástí je6 bezpečnostních unit scénářů; všech170 hostitelských testů prošlo, bezpečnostní sada i pod Python -O. Normální CI nespouští Docker; změněné jen testovací path filtry.279 app/37 legacy/typecheck/build mají místní baseline z předchozího bloku, nikoli nové lokální spuštění.

Jde o dílčí skutečný technický důkaz G03/G06, ne živou akceptaci služby: Auth je syntetická session identita, Storage jen minimální metadata, globální role nejsou obnovené z dumpu a cílová DB je na témže testovacím serveru. Skutečná vzdálená záloha/klíč/provider/obnova, OAuth/user JWT, browser a další provozní souběhy zůstávají otevřené v31/45. Parser/checker18+26 pending scénářů nejsou spuštěné. Žádný provozní import/DDL/grant, deploy, merge nebo aktivace. Nativní auth/model/usage se nezkoušely.

## 2026-11-27 — návaznost záloh na aktuální crew tabulky

Doplněné2 syntetické kontroly PostgreSQL kolektoru: přijme explicitní úplný inventář30 katalogových tabulek a odmítne dump, v němž schází TABLE DATA kterékoli ze6 provenance/import tabulek. Samostatně prošlo všech11 backup-postgres scénářů. Po doplnění prošla celá sada279 app/DB testů;164 Python,37 původních Node, TypeScript a build mají úspěšné výsledky tohoto bloku. Jde o fake pg_dump/pg_restore executable, nikoli skutečný dump/obnovu nebo připojený vzdálený cíl.

Kolektor neodvozuje aktuální nasazený stav a jeho obecné minimum7 relací není dostatečný inventář této aplikace. Důvěryhodný host/operátor musí po zjištění stavu dodávat úplný schválený seznam aktuálně existujících tabulek; před DDL nesmí vynucovat budoucí nepřítomné tabulky, po aktivaci nesmí vynechat nové. Napojení skutečného hostu/provideru/plánovače zůstává otevřené v31/45. Runtime kolektoru se nemění.

## 2026-11-27 — nezávislá akceptace historie a předprovozní podklady

Bez nového volání Claude/auth/usage doplněné7 syntetických DB scénářů historie; samostatná sada má13 úspěšných testů. Ověřuje více podkladů stejného rosteru a jejich pořadí, původní neznámé sloupce/NULL/0/false/blob/text, ztrátu Auth identity, cizí ročník, nepodvržitelnost přes search_path a přesnou hranici1000/1001 bez tichého zkrácení. Snapshot při čtení i odmítnutí zůstal stejný pro všech26 aplikačních tabulek a syntetickou auth.users; platformní Auth identities/Storage tato fixture neimplementuje.

Připravené [44 — inline historie a12 browser scénářů](44-CREW-HISTORIE-UI-AKCEPTACE.md) a [45 — předprovozní protokol důkazů](45-PREDPROVOZNI-PROTOKOL.md). Jde o návrh implementační akceptace a prázdný soukromý provozní protokol, nikoli hotové UI nebo schválení nových produktových voleb. Přesný aktuální inventář:7 nezměněných migrací,26 aplikačních +4 platformní tabulky v katalogu,27 kontrolovaných funkcí.

Parser43 a celý checker39 zůstávají neimplementované;18+26 scénářů pending se nespouštělo. Přihlášení Claude zůstává na později, tento krok ho znovu nekontroloval ani neobcházel. Žádná migrace nebo aplikační runtime kód se nemění, skutečné zdroje/SQLite se neotvíraly a neproběhl import, grant, deploy nebo aktivace záloh. Ověření v oddělené kopii:277 app/DB,164 Python a37 původních Node kontrol, TypeScript a build prošly. Podrobné výsledky tohoto bloku jsou v crew-history-acceptance-verification.json.

## 2026-11-27 — pokračování kontroly převodu, chybí nativní přihlášení

Připravená menší samostatná část [43 — striktní validace plánu](43-CREW-KONTROLA-VALIDACE-PLANU.md), issue57. Dry-run ověřil připnutý HEAD, jediný povolený výstup a6273 bytes veřejného kontextu. Běh se zastavil před modelovým voláním: runner HOST_IO_OR_RESPONSE_FAILED; následná bezpečná kontrola pouze přihlášení potvrdila native auth exit1, loggedIn:false, authMethod:none. Přihlášení ani účet/model/kvóta se neměnily; bez retry a bez API fallbacku. Žádný parser nevznikl.

Nezávisle doplněné2 spouštěné regresní testy brání volání modelu, odečtu usage a aplikaci návrhu při selhání přihlášení nebo nevhodné metodě/předplatném. Prošlo164 hostitelských Python testů.18 scénářů parseru je pouze připravených v tests/pending/crew_import_verify_plan_test.py.pending (syntaxe zkontrolovaná, NEspuštěno); původních26 pending scénářů celého checkeru39 zůstává také nespouštěných. Dnes žádný aplikační kód/SQL změněný není; starší270 app/37 legacy výsledky z12.11. nejsou novým během.

Další pořadí: obnovit místní nativní přihlášení na pozdější ruční kontrolu31; potom implementovat parser43 a spustit jeho scénáře, následně receipt/before/after/provenance checker39 a syntetické propojení s importerem. Potom soukromý inline detail historie40. Živé účty, přístupy, sdílený provoz a vzdálené zálohy stále vyžadují samostatné provozní brány31. Skutečný import je dál zakázaný. Soukromá SQLite/historie se neotevírala ani neměnila.

## 2026-11-16 — příprava hlasového projití

Na dnešní pokyn uživatele je připravená [osnova a aktuální mapa hotovosti](41-HLASOVE-PROJITI-STAV-A-OSNOVA.md) a [16 karet modulů](42-HLASOVE-PROJITI-KARTY-MODULU.md) s příklady, otevřenými volbami a návrhem akceptace. Jde o přípravu diskuse, nikoli nová potvrzení nebo implementaci. Relevantní podklady z hlavní pracovní kopie, dostupné části „SVDT Staff Roles“ a organizačního Miro mají soukromý index; konkrétní personální/finanční data ani interní odkazy nejsou zveřejněné.

Dnes ověřeno, že PR35/37/42/47/51/53/55 zůstávají otevřené Draft a nesloučené. Poslední celé ověření kódu z12.11.2026 se nemění; dnes nebyly znovu spuštěné aplikační testy. Finance jsou demo/plán, checker39 a historie UI nejsou implementované, sdílený živý provoz a úplné automatické vzdálené zálohy nejsou aktivované. Skutečný import dál zakázaný.

Při hovoru postupovat po jednom modulu a otázce, potvrzení ukládat do příslušných MD/DECISIONS/backlogu. Vývoj checkeru po menších ohraničených částech zůstává otevřený; příprava hovoru ho neprohlašuje za hotový. Společně vyjasnit také vztah organizačního Notion/Miro a aplikační evidence, Vlastův finanční rozsah, partnerské stavy a samoobsluhu crew.


## 2026-11-12 — čtecí rozhraní původu a historie crew

Implementovaný backend40 nabízí správci konkrétního ročníku2027 metadata zdrojů vybraného rosteru a explicitní čtení jedné původní pracovní řádky2027 s její navázanou historií2026. Zachová původní obsah, NULL/0 a případně chybějící historii. Koordinátor včetně finančního grantu, člen, viewer, cizí správce a anon nemají přístup. Archiv2027 je pro správce čitelný; role se kontroluje při každém volání. Funkce jsou STABLE a fungují v READ ONLY transakci, bez změn dat/auditu/účtů. UI zatím není zapojené.

Ověřeno270 aplikačních testů včetně6 nových DB scénářů,162 Python a37 původních Node kontrol, TypeScript a čistý produkční build. Katalogový preflight nyní30 tabulek/27 funkcí, inventář7 migrací má autoApply:false; předchozích6 souborů beze změny. [Evidence](crew-history-verification.json).

Kontrolní protokol39 zůstává rozpracovaný: nativní issue54 skončilo CLAUDE_TIMEOUT_NO_RETRY bez návrhu; žádné opakování nebo modelový fallback.26 nezávislých připravených scénářů je v tests/pending/crew_import_verify_test.py.pending a NEPOČÍTÁ se mezi spuštěné testy. Modul checkeru není implementovaný. Dále: jeho menší ohraničená implementace, potom soukromé inline UI historie a propojené ověření podle přesných schválených identit.

Žádný skutečný import, DDL, schválení, grant, deploy nebo merge neproběhl. Pracovní SQLite/historie se neotevírala ani neměnila. Živá autorita projektu/exportů, účty/RLS, víceklientový PostgreSQL, browser, úplná vzdálená záloha/obnova a aktivace zůstávají otevřené v31. Pracovní blok byl omezený uživatelem na23 minut, nedokončené body jsou uložené pro další pokračování.


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
