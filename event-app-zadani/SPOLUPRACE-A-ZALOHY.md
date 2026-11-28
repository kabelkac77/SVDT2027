# Spolupráce při vývoji a denní zálohy

## 2026-11-28 — historie crew pod řádkem implementovaná59

Dokončená44: správce uloženého člověka/skupiny v2027 rozbalí „Původ a historie“ přímo v detailu pod stejným řádkem. Nejprve jen metadata, původní obsah až po explicitním zdroji; žádný prefetch, zápis nebo převzetí údajů. Zachované původní sloupce, přesný content text, NULL/0/false/prázdný řetězec a rozdíl mezi původním2027/navázaným2026. Jiný ročník/demo/nesprávce/neuložený řádek historii neodemkne.

Typovaný adapter váže odpověď na přesný ročník/roster/package i zdrojová metadata. Abort i nezávislá generace chrání před pozdní odpovědí; zavření/změna účtu či kontextu/unmount vyčistí obsah. Denial včetně nestrukturovaného HTTP403 vymaže metadata i detail; error není prázdná historie a nic nepřepíná do dema. Žádné ukládání historických podkladů do storage/URL/logů, žádné vykonávání HTML nebo instrukcí.

**Prošlo293 app/DB včetně12 nových unit/adapter/SSR kontrol,12 syntetických browser scénářů HUI01–12, typecheck/build a vizuální desktop/mobil kontrola.** Browser ověřil i nezrušitelnou starou odpověď, změnu účtu mezi okny, úzký mobil a rozepsaný formulář bez jediného write. CI nově zahrnuje12 history browser scénářů na fiktivních datech s WhatsApp vypnutým. [59](59-CREW-HISTORIE-POD-RADKEM-A-OVERENI.md), [evidence](crew-inline-history-verification.json).8 migračních SHA nezměněno. Python313 a skutečný PG export/RX01/obnova jsou baseline58/55, ne nové běhy tohoto UI bloku.

Živé HUI účty/JWT/RLS v potvrzeném projektu stále **NEPROVEDENO**, zůstávají31/45; syntetický browser není živé přihlášení nebo aktivace. Texty/umístění a společný desktop/mobil průchod na později bez dotazů, stejně dlouho otevřená obrazovka/reautorizace, skutečné OAuth/Storage/backup/obnova/aplikovaná8. migrace a výslovný importní krok. Další neblokovaná práce: syntetická browser akceptace existujících provozních modulů30 (Moje služba/úkoly/harmonogram/registrace/zóny), bez vymýšlení nových pravidel. Žádné skutečné podklady/import/DDL/grant/deploy/merge nebo Claude.

## 2026-11-28 — úplný soukromý export připravený58

Přímo Codexem dokončený operátorský exportér `crew_import_export.py`: předchozí stav nebo stav po explicitním requestId+actorId. V jedné READ ONLY / REPEATABLE READ transakci čte úplné link/package metadata včetně source_history_id a po převodu také skutečný uložený plán, receipt a přesný source_text. Původní serverový fingerprint nepřepočítává. Žádné SET ROLE/JWT/granty/importní RPC; připojení musí mít předem samostatně potvrzenou identitu a čtecí oprávnění.

Soukromé výstupy pouze pod ignorovanou .local, adresáře0700 a soubory0600, atomic publication bez přepsání; hesla/config obsah se nevypisují. Artefakt i návratový stav mají authorityVerified/applyReady/cutoverReady:false. [58](58-CREW-SOUKROMY-EXPORT-A-OVERENI.md), [evidence](crew-private-export-verification.json).19 nových scénářů,313 hostitelských,19 exportních i při Python -O,281 app/DB/typecheck/build prošly. Skutečný psql/PostgreSQL18.6 export před/po i navazující checker prošly1/1, snapshot30 relací při obou čteních beze změny, vlastní kontejner/volumes/jednorázové přístupy uklizené. PGlite používá skutečný generovaný exportní SQL. Osm migrací beze změny.

**Další neblokovaná implementace:44 inline historie crew a12 browser scénářů.** Na později31/45: review55–58, potvrdit skutečný projekt/DB/uživatele, předem dostupnou admin session a privilegovanou čtecí službu, TLS/konfiguraci a práci se soukromými exporty. Běžný authenticated účet cache requestů číst nesmí; tento nástroj mu nedává grant ani jiný přístup. Skutečná vzdálená záloha/klíč/obnova/OAuth/Storage/browser a výslovná aktivace zůstávají otevřené. Bez dotazů, skutečných podkladů/importu/DDL/grant/deploy/merge nebo Claude.

## 2026-11-28 — kontrola převodu crew implementovaná57

Přímo Codexem dokončený čistý `verify_import` podle39 s parserem43. Porovnává přesný zdroj a plan hash, potvrzení importu, předchozí/následný stav lidí/odměn a původních vazeb, včetně nezměněnosti ostatních řádků a metadat. Výsledek obsahuje jen ID/názvy odlišných polí a trvalé ruční brány; **comparisonMatches nikdy neznamená authorityVerified/applyReady/cutoverReady**.

Původních26 pending scénářů přesunuto beze změny a skutečně prošlo, dalších9 hraničních také. Celkem294 hostitelských testů,60 kontrol parseru/checkeru i při Python -O,281 app/DB, typecheck a build prošly. Propojený test používá skutečný syntetický PGlite import, serverový receipt/otisk a byte-for-byte readback uloženého zdroje; zachytí rozdíly NULL/0/historie i změnu bytes. [57](57-CREW-KONTROLA-PREVODU-A-OVERENI.md), [evidence](crew-verify-import-verification.json). Všech8 migrací beze změny, samostatný skutečný PG/RX01 je baseline55, ne nový běh.

**Nově doložená mez exportu:** běžný crew_import_target_preview neobsahuje source_history_id a checker jej správně odmítne. Zkušební úplný export čte skutečné link metadata v jednom SQL snapshotu; nedoplňuje je z plánu a serverový otisk nepřepočítává. Samostatný provozní exportér je další technický backlog, nikoli hotová živá integrace. Potom44 inline historie a společná uživatelská kontrola. Přístupy/OAuth/Storage/úplná vzdálená obnova a aktivace nadále později31/45, bez dotazů. Žádný skutečný import/DDL/grant/deploy/merge, Claude nepoužitý.

## 2026-11-28 — parser přesného plánu dokončený56

Přímo Codexem dokončený [parser43](43-CREW-KONTROLA-VALIDACE-PLANU.md): čistá funkce parse_import_plan načte přesný plán, zkontroluje vazbu na zdroj, úplnost mapování, verze a identity. Žádné I/O, nové účty, odvozování ID nebo změny dat. Odmítá duplicity, neplatné Unicode/JSON/typy a neplatné rozsahy s jedinou konstantní chybou bez hodnot zdroje.

Původních18 připravených scénářů přesunuto beze změny a skutečně prošlo; dalších7 hraničních kontrol včetně10000 operací a16MiB. **259 hostitelských testů a25 parserových při Python -O prošlo.** [Podrobnosti56](56-CREW-PARSER-PLANU-A-OVERENI.md), [evidence](crew-verify-plan-verification.json). Všech8 migrací beze změny; aktuální aplikační/PG výsledky z55 jsou baseline, nikoli znovu provedené v tomto bloku. CI rozšířené o cesty parseru a testů.

**Další přímá implementace:39 celý checker receipt/before/after/provenance →44 inline historie.**26 scénářů checkeru zůstává pending. targetFingerprint se ověřuje pouze formátem; parser není serverová autorita ani souhlas s převodem. Přístupy a potvrzení později31/45, bez Claude a bez skutečného importu/DDL/grant/nasazení/merge/aktivace. Oprava61 je technicky ověřená v55, nadále k review a bez doloženého nasazení.

## 2026-11-28 — oprava61 implementovaná a synteticky ověřená55

Přímo Codexem implementovaná oprava [55](55-CREW-OPRAVA-EXPIRACE-A-OVERENI.md) přidává8. additive migraci; původních7 SHA zachované. crew_import_apply znovu ověří clock_timestamp() po čekání i validaci těsně před prvním novým zápisem. Identický úspěšný replay po expiraci zůstává beze změny; role/revokace/konflikty i ACL/owner/SECURITY DEFINER/search_path zachované.

**Stejný striktní RX01 nyní prošel1/1:** doložený ShareRowExclusiveLock a expirace,42501/CREW_IMPORT_APPROVAL_EXPIRED, nula nových řádků a nezměněný30tabulkový snapshot.12 skutečných PG včetně platného krátkého čekání/replay po expiraci, pomalé validace a dump/restore přesné funkce prošlo.281 app/DB,35 cílených,234 hostitelských/70 optimalizovaných, typecheck/build prošly. [Evidence](crew-expiry-fix-verification.json). Technická oprava je k review, **není sloučená/nasazená ani ověřená na živém cíli**; autoApply:false/targetAppliedState:unknown, ostatní31/45 brány stále otevřené. Další přímá implementace:43 →39 →44,18+26 pending neprovedeno. Claude nepoužitý, skutečný import/DDL/grant/deploy/merge/aktivace neprovedené.

## 2026-11-28 — přímý Codex a přerušení zápisu54

Uživatel výslovně změnil postup: „Programuj teď ty a ne Claude.“ Implementuje přímo Codex, bez předání/auth/model/usage Claude; jeho přihlášení už není blokátor. Aktuální22/AGENTS nahrazují historickou povinnost native handoffu. Zachovaná ochrana dat, cílené testy/vlastní větev/Draft PR a zákaz skutečného importu/živé aktivace.

[54](54-POSTGRES-CASTECNY-ZAPIS-A-ZMENY-ADRESARU.md):4 skutečné SIGKILL během rozpracovaného/předpublikačního zápisu checkpointu/reportu bez Dockeru. Původní checkpoint zachovaný, finální report chybí,4 soukromé syntetické temporaries ponechané bez čtení obsahu/mazání. Inventář navíc odmítá zmizení/náhradu/detach adresáře i rootu a změnu položek; zavádějící nálezy vyřadí jen ze zprávy.234 hostitelských/70 optimalizovaných,10 skutečných PG a5 přerušení recovery prošlo. [Evidence](postgres-partial-write-verification.json). **RX01 stále selhává0/1; nejbližší přímá implementace Codexem je48/issue61, potom43/39/44.** Runtime/kolektor/7 migrací/CI beze změny,18+26 pending neprovedeno. Přístupy a živé brány31/45 na později bez dotazů.

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


## 2026-11-02 — ověřený šifrovaný formát, aktivace otevřená

Knihovna29a a15 testů kryptografie/obnovy jsou hotové v kódu. Nejde o aktivní úplnou automatickou zálohu. Kolektory a skutečné přístupy, konzistence DB/Storage, vzdálená kopie, plánovač a test skutečné obnovy zůstávají otevřené podle [29b](29b-ZALOHY-KOLEKTORY.md) a [31](31-AKTIVACE-A-RUCNI-KONTROLY.md). Zápis do synchronizované místní složky neprokazuje vzdálený upload nebo běh bez tohoto Macu.

## Aktuální spolupráce — 2026-10-28

Uživatel nyní výslovně zadal tok Codex → místní Claude Code: Codex zadání, nezávislé review, skutečné testy a Git; Claude implementace a opravy. Konkrétní nastavení, ověření přístupů, datové hranice a stav zkoušky jsou v [22-CODEX-CLAUDE-SPOLUPRACE.md](22-CODEX-CLAUDE-SPOLUPRACE.md). Historické doporučení modelu níže je nahrazené stávajícím nativním Claude Pro a výchozím modelem CLI bez API fallbacku. Toto není aktivace denních záloh.

## Stav — 2026-09-28

Repozitář `kabelkac77/SVDT2027` je veřejný. Uživatel 2026-09-28 zadal aktualizaci tohoto repozitáře kódem, dokumentací a předáním pro Claude. Soukromé podklady, konfigurace a zálohy zůstávají mimo Git. Viditelnost repozitáře se nemění. iCloud kopie není náhradou verzování přes Git.

**Finální umístění pro přechodné období určené uživatelem:** `[cesta v neveřejném PROVOZ.md]`. Nahrazuje dřívější návrh `iCloud Drive/SVDT-zalohy`. Do této složky byl úspěšně zkopírován první archiv `SVDT-zdroje_2026-09-28_21-32-05.zip` a soubor `.sha256`. Archiv zachycuje zdroje v okamžiku vytvoření, nikoli pozdější změny dokumentace. Jde pouze o zdroje a dokumentaci bez databázových dat. Zápis do místní iCloud složky neprokazuje dokončenou synchronizaci do cloudu. Automatické denní zálohy dosud neběží.

Potvrzený požadavek uživatele: jednou denně zálohovat aplikaci a její data, včetně čitelného výstupu CSV nebo Excel. Uživatel následně zvolil **dočasně vlastní iCloud Drive**, protože model Synology zatím nezná. Čas, retence a provozní služba dosud nejsou zvolené. Žádná automatická záloha není tímto dokumentem spuštěna.

Uživatel zvažuje Claude Code (Opus 5.5) jako hlavního implementátora a Codex jako autora zadání, revizora a správce dokumentace. Níže je doporučené rozdělení, nikoli již provedené předání nebo oprávnění automaticky posílat zprávy jiným agentům.

## Doporučené rozdělení

- Vojta: produktové priority, skutečná pravidla akce a uživatelská akceptace.
- Claude Design: vzhled a návrh obrazovek dle existujícího zadání.
- Claude Code: implementace po menších funkčních celcích, migrace, testy a aktualizace příslušné dokumentace v témže PR.
- Codex: datový model a akceptační zadání, nezávislé review změn, ověření testů, role/RLS a finanční výpočty, konzistence Markdown dokumentace a příprava dalšího kroku. Může opravit nalezený problém, ale je potřeba jednoznačně určit, kdo v danou chvíli mění dané soubory.

Není doloženo, který model bude na tomto repozitáři univerzálně silnější nebo levnější. Vyhodnotit první 2–3 skutečné úkoly podle funkčnosti, chyb po revizi, počtu oprav, celkové ceny a času. Tokeny různých modelů a účtování předplatného nelze porovnávat samotným počtem tokenů. Skills vybírat podle úkolu a dostupných nástrojů; jejich počet není měřítko kvality.

## Pracovní postup

1. Zadání v příslušném `.md`: účel, hranice, datový model, oprávnění a ověřitelné podmínky dokončení.
2. Jeden implementátor konkrétní změny, samostatná větev/check-out. Nikdy dva nástroje současně zapisující do stejných souborů. Před předáním zaznamenat větev a commit, otevřené změny a stav testů.
3. Implementátor dodá malý PR s kódem, testy a aktualizovaným `.md`; důležitá rozhodnutí zároveň zapíše do `DECISIONS.md`. Dokumentace není až následný úkol revizora.
4. Revize diffu i chování: únik dat mezi rolemi/ročníky, transakce a finanční součty, migrace a možnost obnovy, regresní testy a mobilní průchod. Kritické auth/finance části prověřit ještě před nasazením.
5. Opravy, uživatelské vyzkoušení a nasazení schváleného stavu. U releasu uchovat commit/tag, použité migrace a postup návratu. Vracející se starý frontend nemusí fungovat s nekompatibilně změněnou databází; migrace navrhovat kompatibilně.

Společný zdroj pravdy je `event-app-zadani/`. Při zavedení spolupráce připravit krátké vstupní instrukce pro oba nástroje odkazující sem, ne dvě kopie architektury. Návrhy, potvrzená rozhodnutí, implementovaný kód a ověřený provoz musí být v dokumentaci rozlišeny.

Aplikace, dokumentace a předání pro Claude se verzují společně. Před každou integrací prověřit rozdíly vůči vzdálené větvi; neprovádět force-push přes práci z jiného chatu. Soukromé Excel podklady, `.env.local` a klíče nikdy necommitovat.

## Návrh zálohování

### Doporučené umístění podle nabízených možností

**Aktuální rozhodnutí:** dočasný cíl je uživatelem určená složka iCloud Drive, jejíž přesná cesta je v neveřejném `PROVOZ.md`. Lokální kořen iCloud Drive byl ověřen na `[lokální iCloud Drive]`. Jednotlivé zálohy ukládat s časem vytvoření, nepřepisovat jediný soubor. Lokální zapsání neprokazuje dokončenou synchronizaci na iCloud. Provoz přes tento Mac bude závislý na jeho dostupnosti a připojení; požadavek nezávislého provozu zůstává cílem po vyřešení NAS/plánovače.

První krok je kopie zdrojů aplikace a dokumentace bez `.env.local`, klíčů, soukromých podkladů a databázových dat. Nesmí být označena za kompletní denní zálohu. Pro databázový dump a CSV/XLSX stále chybí bezpečně nastavený servisní přístup a exportní úloha; veřejný publishable key jej nenahradí.

První archiv byl vytvořen lokálně v ignorovaném `.local/backups/SVDT-zdroje_2026-09-28_21-32-05.zip`: 68 zdrojových souborů, manifest s SHA-256 jednotlivých souborů, kontrola ZIP prošla. Přiložen kontrolní součet archivu. Po následném povolení byl archiv zkopírován do místní složky iCloud Drive; dokončená cloudová synchronizace nebyla ověřena. Denní automatizace stále neběží.

Uživatel má možnost Google Drive, osobního iCloud Drive a Synology. Doporučení: vytvářet denní zálohy na Synology a po dokončení přenést šifrovanou verzovanou kopii přes Hyper Backup na Google Drive. Model NAS/DSM, dostupnost balíčků, volná kapacita a nepřetržitý provoz se musí nejprve ověřit. Samotný Hyper Backup nevytvoří dump vzdálené Supabase databáze: první krok musí obsloužit samostatná úloha s databázovým klientem. Pokud NAS není vhodný pro běh úlohy, vybrat jiný plánovač; neprohlašovat zálohy za nasazené.

Čitelný CSV/XLSX export do oddělené soukromé složky Drive, aby jej uživatel mohl otevřít bez obnovy archivu. Šifrované Hyper Backup archivy vyžadují obnovovací nástroj a klíč; nejsou přímo otevřitelný Excel. Klíč k obnově držet ve správci hesel mimo NAS. Důvod druhé kopie: výpadek, ztráta nebo poškození NAS nesmí zničit jedinou zálohu.

Původní doporučení iCloud pouze jako doplňkovou kopii bylo pro přechodné období nahrazeno uživatelovou volbou výše. Je synchronizační: smazání se propaguje mezi zařízeními a obnova smazaných souborů je omezená. Ani obyčejná obousměrná synchronizace NAS↔Drive není náhrada verzovaných záloh. Synology + Drive zůstávají budoucí možností.

Ověřené podklady: [Synology Hyper Backup](https://kb.synology.com/index.php/en-us/DSM/help/HyperBackup/data_backup?version=7), [Google Drive jako cíl a šifrování](https://kb.synology.com/en-us/DSM/help/HyperBackup/data_backup_destination?version=7), [Apple — mazání v iCloud Drive](https://support.apple.com/en-ca/guide/icloud/mm3b7fcd0c10/icloud).

### Příprava Claude Code — další krok

Uživatel požaduje pomoc s nastavením Claude Code, skills a Markdown instrukcí pro tento projekt. Připravit stručný vstup `event-app/CLAUDE.md` a kompatibilní pokyny pro Codex s odkazy na stejný zdroj pravdy, konkrétními příkazy testů a pravidly migrací/RLS, citlivých podkladů a aktualizací dokumentace. Instrukce odvodit ze skutečného repozitáře. Skills a konektory zvolit cíleně podle aktuálního úkolu; přístupy k produkci a klíče nepřenášet automaticky. Projektová příprava je nyní hotová pouze pro aplikaci: `event-app/CLAUDE.md`, `event-app/AGENTS.md`, čtyři lokální skills a `HANDOFF-CLAUDE.md`. Globální nastavení, externí pluginy a přihlášení Claude se neměnily; načtení v Claude relaci zatím nebylo ověřeno. Nezaměňovat přípravu s automatickým předáváním zpráv mezi agenty.

| Co | Způsob | Účel |
| --- | --- | --- |
| Zdroj aplikace, MD, migrace, lockfile | Git po každém uceleném kroku, push do projektového repozitáře bez soukromých dat; denní kopie repozitáře mimo primární účet | Obnova konkrétní verze aplikace a historie |
| Databáze | Denní konzistentní dump schématu, dat a potřebných rolí/oprávnění, šifrovaný mimo Supabase | Skutečná obnova vazeb, funkcí a RLS |
| Provozní tabulky | Denní CSV po tabulkách a přehledný XLSX po modulech | Čitelnost bez aplikace a další zpracování |
| Nahrané přílohy | Denní kopie objektů a inventáře souborů | Obnova faktur, smluv, obrázků; DB obsahuje pouze metadata |
| Konfigurace a přístupy | Verzionovaný nesekretní postup nasazení; tajné údaje zvlášť ve správci tajemství | Obnova hostingu, OAuth a externích integrací |

Navržený režim: každou noc 03:00 Europe/Prague, nezávisle na zapnutém notebooku. Plánovač a úložiště vybrat po určení cíle; v chatu zatím není vytvořena ani aktivována žádná automatizace. Záloha má mít omezenou servisní identitu mimo prohlížeč. Publishable key pro kompletní dump nestačí. Pro citlivé dumpy použít šifrování a oddělené přístupy, žádné veřejné odkazy ani Git artefakty s osobními údaji.

Retence k potvrzení: 30 denních a 12 měsíčních kopií; chránit před hromadným smazáním a poškozenou synchronizací. Denní záloha znamená při havárii možnou ztrátu až přibližně 24 hodin práce; před závodem zvážit častější obnovitelné body. Každý běh ověří upload, velikost, kontrolní součet a manifest s časem, verzí schématu a počty řádků. Hlásit chybu i chybějící běh; pouhá existence naplánované úlohy není důkaz úspěšné zálohy.

CSV zachová stabilní ID, ročníky, všechny řádky, jednoznačné datumy a částky; rozliší NULL a prázdný text a přiloží popis formátu. Excel má přehledné listy pro Partnery, kontakty, plnění, Finance, úhrady a další implementované moduly. Textové buňky exportovat bezpečně proti spuštění vložených vzorců a zachovat IČO/telefon jako text. Přihlášení, hashe hesel, tokeny a secrets nepatří do čitelných exportů. Obnovovací záloha Auth dat vyžaduje zvláštní ochranu a otestovaný postup; export obchodních tabulek ji nenahrazuje.

Rozsah exportu musí odpovídat skutečně nasazeným modulům. Dnešní Finance jsou jen lokální demo, nikoli produkční data v Supabase. Data jen v localStorage nebo soukromých lokálních podkladech serverová záloha neuvidí; před ostrým provozem je potřeba jejich vědomá migrace nebo samostatná záloha.

## Podmínky dokončení záloh

- Zvolený cíl a servisní přístupy; plán běží i při vypnutém počítači.
- Ručně i plánovaně ověřený úspěšný běh, opakování po chybě a upozornění na výpadek.
- Zkušební obnova do izolovaného prostředí: tabulky, vazby, role/RLS, Auth a přílohy podle rozsahu; následné funkční ověření aplikace.
- CSV/XLSX otevřené a zkontrolované oproti manifestu a počtům řádků; úplnost ročníků a auditních dat podle exportního modelu.
- Ověřená retence a plán pravidelného testu obnovy. Zálohování lze označit za hotové až po ověření obnovy.

## Zdroje ověřené 2026-09-28

- [Anthropic Opus 5.5](https://www.anthropic.com/claude-opus-5-5): oznámení modelu a deklarovaná úspora vůči Opus 5; nejde o nezávislý benchmark SVDT.
- [OpenAI — code generation](https://developers.openai.com/api/docs/guides/code-generation): Codex podporuje implementaci, review i ladění; rozdělení rolí výše je naše doporučení.
- [Supabase — Database Backups](https://supabase.com/docs/guides/platform/backups): Free vyžaduje vlastní pravidelné exporty; vestavěné databázové zálohy nezahrnují Storage objekty. Denní zálohy placených tarifů nenahrazují nezávislou kopii mimo projekt.

## Rozdělení veřejné a neveřejné části — 2026-09-29

Veřejný kód a obecná specifikace zůstávají v `kabelkac77/SVDT2027`, dokumentace v `event-app-zadani/`. Neveřejné podklady a provozní údaje patří do soukromého `vojtechhrach/SVDT2027-soukrome/event-app-podklady-soukrome/`. Hesla a klíče se neverzují nikde. Přístupy k oběma repozitářům se ověřují odděleně.
