# SVDT — interní Partneři V1

## Verzovaný místní pracovní přehled

Samostatný Python nástroj `tools/crew_workspace.py` obsluhuje [místní pracovní přehled](http://127.0.0.1:4317/crew.html#people), s privátní SQLite mimo Git a neměnnou historií. Není sdíleným Supabase modulem. Pro první založení potřebuje záměrně předaný soukromý zdroj; ve veřejném kódu jsou jen syntetické ukázky/testy. [Ovládání a spuštění](../event-app-zadani/21-LIDE-A-CREW-PRACOVNI-VERZE.md), [ověření a hranice](../event-app-zadani/23-PRACOVNI-EVIDENCE-A-SNIMKY.md). Testy z kořene: `python3 -B -m unittest discover -s event-app/tests -p '*_test.py' -v`.

CSV filtrovaného uloženého ročníku: [ovládání a formát](../event-app-zadani/24-CSV-PREHLED-A-ODLOZENE-KONTROLY.md). Syntetické testy exportu z kořene: `node --test event-app/tests/crew_csv_test.cjs`. Desktopový Excel se tímto příkazem nespouští.

PÁ/SO v personálním přehledu: [ovládání a kompatibilita](../event-app-zadani/26-CREW-PATEK-SOBOTA.md). Syntetické kontroly rozhraní a exportu z kořene: `node --test event-app/tests/crew_csv_test.cjs event-app/tests/crew_days_test.cjs`. Serverové testy zahrnují `crew_days_test.py`.

## Codex → místní Claude Code

Projektový postup je v [skill](skills/svdt-claude-handoff/SKILL.md), stav/úložiště v [22](../event-app-zadani/22-CODEX-CLAUDE-SPOLUPRACE.md). Runner `tools/claude_handoff.py` pracuje jen s čistou izolovanou worktree, konkrétním issue, přesným HEAD a allowlistem; nejprve `--dry-run`. Sám nepublikuje a nepouští testy. Hostitelské kontroly z kořene repozitáře: `python3 -B -m unittest discover -s event-app/tests -p "*_test.py" -v` na syntetických datech. Nativní Claude Pro používá stejný účtový zámek/kapacitní guard jako iNice; soukromé podklady nejsou modelový kontext.

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

1. V izolovaném testovacím prostředí aplikovat partnerské migrace v pořadí: `supabase/migrations/202609280001_partners.sql`, potom `202609290001_partner_history.sql` (stav `neosloven` a pouze čitelná historie organizace). Před změnou existujícího prostředí ověřit jeho migrační historii; již použitou migraci neopakovat. Produkční aplikace migrací vyžaduje výslovný pokyn uživatele. Migrace je pro prázdné tabulky tohoto modulu, není opakovatelný reset. Produkční projekt ani hosting nebyly tímto commitem vytvořeny.
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

DB testy aplikují obě migrace a používají PostgreSQL engine PGlite: RLS, RPC transakce, izolace ročníků, potvrzení, konflikty verzí, rollback, audit, archiv a plnění. Playwright kontroluje i úpravy řádků, chybu/verzi, historii a mobilní viewport. Spouští vlastní lokální server na portu 3000 s fiktivní Supabase URL/klíčem a mock Auth/Data API; port musí být volný. Nepřebírá běžící server a nepotřebuje produkční `.env.local`; výchozí je nainstalovaný Google Chrome. Pro samostatný Chromium použij `npx playwright install chromium` a `PLAYWRIGHT_CHANNEL=chromium npm run test:e2e`.

## Technické poznámky

Klientské Supabase SDK udržuje přihlášení; žádná citlivá data nejsou součástí SSR. DB je autorita oprávnění. Přímé zápisy klienta jsou odebrané, RPC vždy kontrolují členství. Auth UUID pochází z `auth.uid()`. Privilegované funkce mají prázdný search_path a explicitní schema. Audit je pro klienta pouze ke čtení. Global organization profil má samostatnou verzi proti souběhu mezi ročníky. Nenačítáme tajné klíče na server ani do klienta.

Design tokeny se importují přímo z `../design-system/tokens/svdt-tokens.css`; Exo fonty jsou lokální kopie repozitářových assetů s přiloženou OFL licencí. Zelená označuje úspěšný stav, červená značku a hlavní akci. Menší rozestupy jsou přizpůsobení provoznímu UI.

**Navazující rozsah:** externí Partner Portal, více kontaktů, questionnaire, uploady/Document, VIP QR, post-event report; finanční backend a kontrolovaný import. Finance lze zkoušet lokálně dle `../event-app-zadani/11-FINANCE-MODEL-A-FLOW.md`. Offline synchronizace, real-time odběry a PWA cache zatím nejsou implementované. Toto není hotová produkční eventová aplikace.

Implementační reference: [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation), [Supabase JS](https://supabase.com/docs/reference/javascript/introduction), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Sdílená crew `/crew`

Nová schema-only migrace `202611020001_crew.sql` a aplikace oddělují crew členství, provozní přiřazení a soukromé odměny. Přístup vyžaduje již existující Auth účet a konkrétní ročníkové právo; samotný login je neuděluje. Nové členství nepřipravuje pozvánku ani neodesílá zprávu. Google/Apple/Facebook se ukážou jen pokud je služba povoluje, s návratem `/crew`; WhatsApp zůstává vypnutý.

Místní evidence na samostatném localhost serveru se nepřevádí automaticky. Migrace/import na skutečný projekt nebyly tímto krokem spuštěné. Přehled nemá realtime/offline synchronizaci; změny jiných uživatelů načítá Obnovit, verzování chrání zápis. Read-only archiv neblokuje odebrání práv. Nejnovější stav a omezení jsou v `../event-app-zadani/28-SDILENA-CREW-A-OPRAVNENI.md` a `31-AKTIVACE-A-RUCNI-KONTROLY.md`.

## Provoz závodu v `/crew`

První provozní V1 sdílí Auth a výběr ročníku s crew. Úkoly a harmonogram, zóny s pracovním kontaktem a relativním plánem, ruční registrace se zvláštním oprávněním a mobilní Moje služba. Detail se otevírá pod řádkem; běžný člen vidí vlastní úkoly, správce spravuje existující registrační granty. Časy jsou místní Europe/Prague, NULL částka není0. Nová schema-only migrace `202611020002_operations.sql` navazuje na crew migraci; na skutečný server zatím není aplikovaná. Neopakovat bootstrap nebo staré migrace naslepo.

`npm test` nyní zahrnuje i MJS testy šifrovaného zálohovacího balíčku. Provozní testy používají pouze syntetická data, PGlite/HTTP/SSR a jednotkovou hranici hooku; nepokrývají skutečný prohlížeč nebo živé OAuth. Esbuild byl již součástí testovacího stromu tsx, jeho stejná verze je nyní přímá dev závislost pro izolované stavové/SSR testy. Čisté npm ci s ignore-scripts prošlo.

Skutečná místní evidence se do sdílené DB sama neimportuje. Nepotvrzené kapacity/čísla závodníků, mapový podklad, příchody/hotovo členů, realtime/offline, účty a aktivace jsou v zadání31. Knihovna záloh neznamená aktivní úplné automatické vzdálené zálohy; ty čekají na kolektory, přístupy, vzdálené ověření a obnovu29b.

## Zálohovací knihovny a předprovozní kontrola

`tools/backup-local.js`, `backup-postgres.js`, `backup-storage-inventory.js`, `backup-storage.js` a `backup-runner.js` jsou serverové ESM knihovny. Neimportovat je do klienta. Nemají automaticky nastavený cíl, přístupy, CLI ani plánovač. Produkční zálohování nepotřebuje Claude účet; Claude je pouze vývojový postup.

`runBackup({collectors,key,destination,lockPath,consistency})` vyžaduje všech šest zdrojů: `sources`, `crew`, `inputs`, `postgres`, `storage`, `exports`. Každý zdroj má právě jednoho vlastníka. Jeden kolektor smí dodat `crew` i `exports` ze stejného SQLite snímku:

```js
const crewCollector = {
  sources: ["crew", "exports"],
  async collect() {
    const files = await collectCrewSnapshot({ database, pythonExecutable, parent });
    return { complete: true, files };
  },
};
```

Kolektor spouštět až uvnitř `collect()`, nikoli předem vytvořeným Promise. Runner nejprve získá exkluzivní zámek a zavolá `consistency.acquire()`. Ta musí skutečně zajistit dohodnuté konzistentní okno bez zápisů, vrátit funkci uvolnění a pokrýt také zdroje/vstupy; pouhá prázdná funkce není důkaz konzistence. Soubory a jejich bajty se zachytí před uvolněním okna. Cizí existující zámek se nemaže; jeho vyšetření je zásah operátora.

Zdroje a soukromé vstupy mají explicitní schválený inventář cest, žádné rekurzivní hledání na disku. Chybějící původní podklad nesmí být označený za úspěšně zálohovaný. PostgreSQL `requiredRelations` musí odpovídat ověřenému skutečně nasazenému schématu; nepředpokládat, že pending migrace už jsou na serveru. Použít kompatibilní absolutní `pg_dump`/`pg_restore`, soukromé service/pass soubory a oddělený oprávněný přístup. Dump obsahuje databázové ACL, ale ne globální serverové role; jejich bezpečný obnovovací plán je zvlášť.

Storage kolektor podle29e/g/h je implementovaný a testy jsou součástí npm test. Potřebuje serverový privilegovaný SDK klient a nezávislý úplný inventář objektů (např. z oprávněného DB snapshotu v témže konzistentním okně). Nesmí použít veřejný aplikační Supabase singleton ani odvodit `complete:true` z téhož potenciálně omezeného RLS listu. Collector porovnává stav před i po stažení. Podporuje aktuální standardní objekty; archivované/verzované historie a jiné typy bucketů zastaví běh.

Klíč je 32 bajtů ze samostatného úložiště tajemství se záložní úschovou mimo tento počítač. `destination` má `kind:"remote"`, `putExclusive(id,encryptedBytes)` bez přepsání a `read(id)` s novým skutečným čtením vzdáleného objektu. Adapter nesmí vracet uploadovaný Buffer z místní cache; musí ověřit identitu cíle, práva a omezit velikost/čas HTTP operací. Runner porovná bajty, checksum a ověří dešifrování; žádný automatický delete/retence není implementovaný. Syntetický adapter neprokazuje dostupný cloud.

Omezení V1: nejvýše 10 000 souborů / 128 MiB nekomprimovaných bajtů dohromady. Při překročení běh selže a nevytvoří tichou částečnou zálohu. Úspěšný readback balíčku není test obnovené PostgreSQL/Auth/Storage služby. Naplánování, hlídání zmeškaného běhu, retence, skutečná vzdálená kopie a izolovaná obnova jsou aktivační práce podle [31](../event-app-zadani/31-AKTIVACE-A-RUCNI-KONTROLY.md).

Před sdílenou aktivací je připravený `supabase/preflight-readonly.sql` a [migrační inventář](../event-app-zadani/shared-deployment-plan.json). Postup [32](../event-app-zadani/32-PREDPROVOZNI-KONTROLA.md) nevykonává DDL, granty ani import automaticky. Testy nástrojů běží v `npm test`; PostgreSQL a Storage/remote používají fiktivní adaptéry. Skutečná místní obnova SQLite byla ověřená zvlášť soukromě, osobní data nepatří do testů/modelu/CI.

## Soukromý náhled převodu crew

`tools/crew_import_preview.py` nabízí čistou funkci `build_preview(tables_bytes)` pro přesné bytes exports/crew-tables.json z konzistentního místního snapshotu. Bez síťových/DB/FS operací nebo automatického importu. Náhled zachovává celé původní tabulky a odděluje roster/odměny/unmapped pole; výstup obsahuje skutečné osobní a finanční údaje a musí zůstat soukromě0600 mimo Git/model/CI/public/stdout. Vždy vrací preview_only / applyReady:false. Vlastní náhled zůstává ke společnému mapování později. [Kontrakt a podmínky převodu33](../event-app-zadani/33-CREW-PREVOD-A-NAHLED.md). Žádná cílová migrace, role nebo import se tím neaktivuje.

## Původ dat crew a porovnání cíle

Schema-only `supabase/migrations/202611050001_crew_transfer.sql` přidává privátní neměnné původní balíčky a vazby. Neaplikovat bez aktivačního postupu31/32, nevzniká write RPC. Původní source_text se nestahuje do běžného crew pohledu; přístup mají jen správci správného ročníku. [Model35](../event-app-zadani/35-CREW-ZDROJE-A-HISTORIE.md).

`tools/crew_transfer_reconcile.py` poskytuje čistou funkci `reconcile_preview(tables_bytes,mapping=None,target=None)`, používá existující build_preview. Při programatickém importu musí host mít tools na sys.path. Nedělá FS/network/DB/SQL/CLI operace, neslučuje podle jména a negeneruje UUID. Úplný cílový export a mapování dodává později ověřený operátor; None znamená nedostupný cíl. Report má pouze ID/kódy/názvy rozdílných polí a pořád je soukromý0600, ne veřejný artefakt. Vždy reconciliation_only / applyReady:false. [Kontrakt36](../event-app-zadani/36-CREW-POROVNANI-CILE.md). Běžná syntetická akceptace Python nástrojů z kořene: `python3 -B -m unittest discover -s event-app/tests -p '*_test.py' -v`. Připravené schéma/náhled nenahrazují transakční importer nebo uživatelské schválení.

Pro úplný cílový podklad je připravené chráněné čtecí RPC `crew_transfer_target_snapshot(e)` ve stejné migraci. Povolí jen správce správného ročníku2027, vrací jedno konzistentní čtení včetně odměn a pouze metadat provenance, bez source_text. Jeho zpřístupnění v reálném projektu vyžaduje pozdější aktivaci migrace; chyba nebo chybějící RPC není úspěšný prázdný export. Syntetický integrační scénář propojuje tento SQL výstup s Python porovnáním, ne s živou službou.

Testovací procesy běží přes npm test s --test-concurrency=1: po rozšíření databázových scénářů první Linux CI narazilo na nativní V8 JIT alokaci během souběhu WASM/PGlite procesů. Počet testů ani jejich ověřované souběžné scénáře uvnitř testů se tím nemění; testy se nevynechávají.


### Počáteční transakční import crew — bez živé aktivace

Specifikace37/38 a `crew-import-verification.json` popisují připravenou šestou migraci. V1 vytváří nebo přesně ponechává celé mapování, oddělené odměny a původ zdroje v jediné transakci; nenabízí UPDATE/overwrite nebo slučování osob. Neměnné operátorské schválení váže aktéra, ročník, přesné hashe a referenci protokolu zálohy. Stage/revoke nejsou spustitelné klientským účtem; apply není nyní zapojené do UI/CLI. Schválení, DDL, granty nebo skutečný import jsou samostatné budoucí řízené kroky podle31, nyní výslovně zakázané.

Čistá Python funkce `build_import_plan` v tools/crew_import_plan.py nemá FS/network/DB vedlejší účinky. Bez kompletního explicitního mapování a chráněného cílového exportu žádný plán nevytvoří. Ani s plánem nevrací applyReady:true nebo neuděluje souhlas. Soukromé výsledky a skutečné podklady zůstávají mimo Git/model/logy. Testy používají jen syntetické fixture; PGlite nenahrazuje víceklientový PostgreSQL nebo cloudovou obnovu. Nové helpery ověřují běžné Python unittesty a crew-import-database.test.ts v sériové sadě npm test.


### Čtecí původ crew —2026-11-12

Nová migrace202611120001 a specifikace40 přidávají pouze chráněné STABLE RPC crew_transfer_history_index/crew_transfer_history_row. Správce vybere roster a konkrétní balíček, archiv2027 je readonly; jiné role nemají původní osobní/finanční podklady dostupné. Funkce nic neimportují ani nezakládají účty. UI ještě není zapojené, vše čeká na samostatnou aktivaci podle31.270 aplikačních testů včetně6 nových DB scénářů a čistý build prošly; evidence crew-history-verification.json.

Kontrolní modul39 nebyl nativním během dodaný (timeout, bez retry).26 draft scénářů v tests/pending/crew_import_verify_test.py.pending není spuštěných; pro budoucí ověření vyžadují dokončený modul a přesun do tests/crew_import_verify_test.py. Nevydávat je za úspěšné kontroly.

### 2026-11-27 — první část checkeru připravená k implementaci

[Specifikace43](../event-app-zadani/43-CREW-KONTROLA-VALIDACE-PLANU.md) vymezuje samostatný čistý parser přesného plánu. Helper zatím nevznikl, native běh zastavilo chybějící přihlášení.18 nových scénářů v tests/pending není spuštěných; původních26 celého checkeru zůstává pending. Dnes prošlo164 hostitelských Python testů včetně2 nových kontrol, že bez native přihlášení nevznikne modelový běh/zápis. Aplikační/DB kód beze změny; žádný skutečný import ani aktivace.

### 2026-11-27 — rozšířená nezávislá akceptace historie

`crew-history-database.test.ts` má13 syntetických DB scénářů, včetně více podkladů, původních typů a sloupců, odhlášení/cizího ročníku, neměnnosti26 aplikačních tabulek+auth.users, podstrčeného search_path a hranice1000/1001. Nové7 scénáře nepřidávají runtime funkci. [UI akceptace44](../event-app-zadani/44-CREW-HISTORIE-UI-AKCEPTACE.md) a [protokol45](../event-app-zadani/45-PREDPROVOZNI-PROTOKOL.md) jsou příprava; browser/UI a živá aktivace jsou stále otevřené.18+26 pending testů parseru/checkeru se nespouštělo.

### 2026-11-27 — samostatná skutečná PostgreSQL akceptace

[Specifikace46](../event-app-zadani/46-IZOLOVANY-POSTGRES-SOUBEH-A-OBNOVA.md) a `tests/postgres-acceptance.manual.py` přidávají4 úspěšné skutečné zkoušky souběhu a dump/restore v novém vlastním izolovaném serveru. Vyžadují explicitní opt-in; normální CI server nestartuje.6 běžných bezpečnostních unit scénářů ověřuje rozsah bez Dockeru, celkem170 hostitelských testů prošlo. Soukromé přístupy/výstupy mimo Git; runtime/migrace a provozní data beze změny. Živé Auth/Storage/vzdálené zálohy/browser/aktivace a18+26 pending parser/checker scénářů zůstávají otevřené.

### 2026-11-28 — checkpoint/SIGTERM a neopravená expirace

[47](../event-app-zadani/47-POSTGRES-PRERUSENI-A-SCHVALENI.md) přidává atomický soukromý checkpoint a opt-in `--verify-sigterm`; přerušený vlastní child nehlásí úspěch a jeho prostředky jsou uklizené. Šest běžných skutečných PG případů a174 hostitelských kontrol prošlo,10 bezpečnostních i při Python -O. **Samostatný striktní `--probe-expiry-after-lock` ale selhal:** RPC dovolí nový zápis po expiraci při pozdějším tabulkovém čekání. Nejde o expectedFailure ani hotovou opravu; [48](../event-app-zadani/48-CREW-EXPIRACE-PO-ZAMKU.md)/issue61 blokuje aktivaci. Runtime/SQL a provozní data v tomto bloku beze změny.

### 2026-11-28 — další souběhy a úklid po SIGKILL

[49](../event-app-zadani/49-POSTGRES-SOUBEH-A-RECOVERY.md) rozšiřuje manuální syntetickou sadu na10 skutečných PG případů. `--verify-hard-kill` ověřuje úklid zabitého vlastního child procesu novým procesem a bezpečné opakování. `--recover-owned-test CHECKPOINT` vyžaduje explicitní opt-in, soukromý validovaný soubor a nezávislou shodu živé identity/image/labelu/mounts; orphan volumes se automaticky nemažou.182 hostitelských a18 optimalizovaných bezpečnostních kontrol prošlo. **RX01 stále selhává a61/48 blokuje aktivaci**; runtime/SQL beze změny. Normální CI Docker ani recovery nespouští.

### 2026-11-28 — chyby startu a neúplné checkpointy

[50](../event-app-zadani/50-POSTGRES-STARTUP-A-NEUPLNE-CHECKPOINTY.md): opt-in `--verify-startup-failures` skutečně ověřil4 řízené chyby a opakované recovery v nových procesech. Child s chybou startu vrací exit1/STARTUP_FAILED/cases0, i když úklid uspěje; neověřitelný úklid označí manualReviewRequired. CP v2 odliší prepared/creating před Docker create; ztracené ID přijímá jen z plně ověřeného živého vlastního kontejneru. Creating+absence zachová důkazy a zastaví zásah. Úplné v1 jsou podporované. Celkem190 hostitelských/26 optimalizovaných bezpečnostních a10 standardních PG, SIGTERM/SIGKILL prošlo. **RX01 stále selhává a48/61 blokuje aktivaci.** Runtime/SQL beze změny; normální CI server ani recovery nespouští. Power loss/disk full, živý provoz a18+26 pending případů nejsou ověřené.

### 2026-11-28 — poškozená evidence a chyby zápisu

[51](../event-app-zadani/51-POSTGRES-POSKOZENA-EVIDENCE-A-CHYBY-ZAPISU.md): před aktualizací checkpointu se ověřuje původní stav; cleanup poškozený/cizí/chybějící soubor nepřepíše. Soukromé soubory se zveřejní celé až po fsync a nenahrazují existující evidence. Neuložený report má reportPersisted:false/exit1 i po ověřeném úklidu; constructor/recovery CLI nevypisují raw chyby. Opt-in `--verify-evidence-failures` ověřil3 řízené I/O chyby a fresh/repeated recovery.203 hostitelských,39 optimalizovaných bezpečnostních,10 standardních PG,4 startup chyby a SIGTERM/SIGKILL prošlo. **RX01 dál selhává,48/61 blokuje aktivaci.** Runtime/7 migrací beze změny,18+26 pending neprovedeno. Fyzický disk/power loss, pozdní chyby a paralelní recovery zůstávají otevřené.

### 2026-11-28 — koordinace recovery a pozdní chyby

[52](../event-app-zadani/52-POSTGRES-SOUBEZNA-RECOVERY-A-POZDNI-CHYBY.md): test i recovery drží stejný soukromý neblokující flock; druhý proces má RECOVERY_BUSY/exit1 bez zásahu. `--verify-concurrent-recovery` skutečně ověřil ochranu aktivního testu a dva recovery procesy. I/O sada má6 bodů včetně after-remove/after-checkpoint/after-report. Úplný soubor se po pozdní chybě zachová; reportPersisted:true neznamená successful:true a samotný uložený snapshot nenahrazuje finální stdout/exit.215 hostitelských,51 optimalizovaných,10 standardních PG,4 startup chyby a SIGTERM/SIGKILL prošlo. **RX01 dál selhává,48/61 blokuje aktivaci.** Runtime/SQL/CI beze změny;18+26 pending neprovedeno. Živé provozní kroky/power loss/síťový filesystem a přímý pád během recovery zůstávají otevřené.

### 2026-11-28 — přerušení recovery a inventář metadat

[53](../event-app-zadani/53-POSTGRES-PRERUSENI-RECOVERY-A-INVENTAR.md): opt-in `--verify-recovery-interruption` ověřil5 skutečných SIGKILL držitele recovery a fresh/repeated recovery. Samostatný `--run-synthetic --inventory-residues --output-root PRIVATE_TEST_ROOT` nepotřebuje Docker/PG/Node argumenty: jen metadata známých testovacích složek, nofollow adresářové FD, žádné čtení obsahu/flock/Docker/mazání. Limity/neověřené položky jsou explicitně neúplný výsledek; inventář není autorita k úklidu ani důkaz stale/živosti.226 hostitelských/62 optimalizovaných,10 standardních PG,4 startup chyby,6 I/O bodů, souběh a SIGTERM/SIGKILL prošly. **RX01 dál selhává a48/61 blokuje aktivaci.** Runtime/SQL/CI beze změny,18+26 pending neprovedeno; fyzický disk/power loss a přerušení uvnitř zápisu zůstávají otevřené.

### 2026-11-28 — přímý Codex, částečné zápisy a změny adresářů

Uživatel výslovně určil implementaci přímo Codexem (22/AGENTS), bez čekání na Claude auth/model/usage. [54](../event-app-zadani/54-POSTGRES-CASTECNY-ZAPIS-A-ZMENY-ADRESARU.md): `--run-synthetic --verify-partial-writes --output-root PRIVATE_TEST_ROOT` ověřil4 filesystem SIGKILL bez Dockeru; původní checkpoint zachovaný a nepublikované report/temporaries nezískají finální jméno. Čtyři soukromé syntetické dočasné soubory se záměrně nemažou. Inventář při změně inode/jména/rootu nebo adresářových položek vrací explicitní neúplnost a vyřadí zavádějící nálezy ze zprávy, ne ze souborového systému.234 hostitelských/70 optimalizovaných a10 skutečných PG/5 přerušení recovery prošlo. **48/61 stále blokuje aktivaci, její přímá oprava Codexem je další.** Runtime/SQL/CI beze změny;18+26 pending neprovedeno, živé kroky zakázané bez samostatné aktivace.

### 2026-11-28 — opravená expirace po čekání a validaci

[55](../event-app-zadani/55-CREW-OPRAVA-EXPIRACE-A-OVERENI.md):8. additive migrace doplňuje clock_timestamp() recheck bezprostředně před první INSERT v crew_import_apply, až po čekání a validaci zdroje. Stejný striktní RX01 nyní prošel1/1 s42501 a nezměněným30tabulkovým snapshotem; cache replay po expiraci zůstává.12 skutečných PG včetně dump/restore přesné opravené funkce,281 app/DB,35 cílených,234 hostitelských/70 optimalizovaných, typecheck/build prošly. Původních7 SHA a funkční owner/ACL/config zachované; inventář pinne8 souborů/autoApply:false. Technická oprava k review není živá aplikace8. migrace: před aktivací doložit tělo a ostatní31/45 brány, katalogová signatura nestačí. Další přímá práce Codex43/39/44,18+26 pending neprovedeno, žádný skutečný import nebo nasazení.


### 2026-11-28 — čistý parser přesného importního plánu

[56](../event-app-zadani/56-CREW-PARSER-PLANU-A-OVERENI.md): `tools/crew_import_verify_plan.py` poskytuje čisté `parse_import_plan(tables_bytes, plan_text)` → `(plan, preview)` bez I/O nebo změn argumentů. Hlídá přesný JSON/Unicode/16MiB, pokrytí zdroje, unikátní cíle a pravidla identity/verzí; každé odmítnutí má konstantní chybu bez podkladů. Původních18 scénářů přesunuto beze změny a prošlo,7 nových hranic (včetně10000 operací),259 hostitelských a25 parserových pod Python -O prošlo. CI obsahuje nové cesty. Celý checker39/receipt/before-after/provenance má26 pending scénářů a je další. Všech8 migrací beze změny, aktuální aplikační/PG výsledky jsou baseline55. Žádný skutečný import, nasazení nebo aktivace; targetFingerprint se pouze validuje formátem.


### 2026-11-28 — porovnání stavu po převodu crew

[57](../event-app-zadani/57-CREW-KONTROLA-PREVODU-A-OVERENI.md): čisté `tools/crew_import_verify.py` poskytuje `verify_import(tables_bytes, plan_text, before=None, after=None, receipt=None, stored_source_text=None)` bez I/O nebo mutací. Reuse parser43, přesné hashe/receipt/identity/NULL0, kompletní sady řádků a provenance; report pouze ID/názvy polí, stále authorityVerified/applyReady/cutoverReady:false.26 původních scénářů přesunuto beze změny a prošlo,9 nových hranic také.294 hostitelských,60 parser/checker i při Python -O,281 app/DB/typecheck/build prošly. Propojený PGlite test ověřuje skutečný serverový receipt/otisk a uložené bytes, odmítá neúplný běžný snapshot bez source_history_id a zachytí drift. Úplný privátní exportér je samostatný další krok; SQL zkušební export neprokazuje živý sběr ani autoritu. Potom44 inline historie, živé brány31/45 stále otevřené. Osm migrací beze změny, žádný skutečný import/nasazení/aktivace.


### 2026-11-28 — úplný soukromý operátorský export

[58](../event-app-zadani/58-CREW-SOUKROMY-EXPORT-A-OVERENI.md): `tools/crew_import_export.py` poskytuje explicitní `--collect` CLI a čisté build_export_sql/validate_export. Výstupy .local/0700/0600 bez přepsání, pouze READ ONLY / REPEATABLE READ; úplné source_history_id/metadata a po konkrétním request+actor skutečný plán/receipt/source_text. Vyžaduje samostatně potvrzenou službu/DB/DB uživatele, předem admin session a privilegované čtení; žádné nastavování JWT/role/grantů a žádný import. Hesla pouze přes privátní pinned config FD, ne URL/CLI/environment fallback.19 nových scénářů,313 hostitelských/19 exportních při Python -O,281 app/DB/typecheck/build a skutečný psql/PG export před/po s checkerem1/1 prošly;30 relací čtením nezměněno, vlastní kontejner/volumes/přístupy uklizené.8 migrací beze změny. Aktuální12 standardních PG/RX01 jsou baseline55, ne nové běhy. Živé použití/retence/TLS/účty a31/45 na později bez dotazů. Další neblokovaná44 inline historie.


### 2026-11-28 — původ a historie přímo pod člověkem

[59](../event-app-zadani/59-CREW-HISTORIE-POD-RADKEM-A-OVERENI.md): uložený admin řádek2027 má samostatnou sbalenou historii. Index až po rozbalení, content až po explicitním zdroji, readonly původní sloupce/text a NULL/0/false. Typovaný read adapter kontroluje celý scope i metadata, generace chrání i bez funkčního abortu; změna kontextu/denial zavře citlivý obsah. Žádné auto-převzetí, zápisy nebo persistence historie.293 app/DB (12 nových unit/adapter/SSR),12 syntetických browser HUI01–12, typecheck/build prošly; desktop/mobil vizuálně zkontrolované. CI nově instaluje Chromium a spouští `npx playwright test -c playwright.crew-history.config.ts`; jen fiktivní Auth/HTTP, WhatsApp vypnutý a vlastní testovací port4328. Živé účty/RLS/JWT/HUI/UX potvrzení dále31/45. Osm migrací neměněno, Python313/realPG/RX01 baseline58/55, ne nové lokální běhy. Další nezávisle browser akceptace stávajících provozních modulů30.
