# Další souběhy a úklid po tvrdém přerušení testu

Rozsah2026-11-28 navazuje na46–48. Výhradně nové vlastní testovací servery a veřejné smyšlené fixture. Přidává čtyři skutečné databázové případy, zotavení testovací DB po pádu a explicitní kontrolovaný úklid po SIGKILL. Aplikační runtime, kolektor a všech7 migrací zůstávají stejné; chyba expirace48/issue61 není opravená a blokuje aktivaci. Výsledky se odděleně evidují v [protokolu](postgres-hardkill-verification.json).

## Nové skutečné souběhy

| ID | Situace a serverový důkaz | Výsledek |
| --- | --- | --- |
| RP07 | První import drží transakci po zápisu. Druhý klient má jiné requestID, stejné approval a pozorované čekání na zámek. | Po commitu první žádosti druhá skončí CREW_IMPORT_APPROVAL_USED; stále jen1 package/roster/odměna/request. |
| RP08 | Klient dokončí COMMIT, což dokládá následující PgSleep. Test záměrně nevyzvedne výsledek a ukončí pouze tento vlastní psql proces. | Dva přesné retry vrátí uložený výsledek; všech30 tabulek proti snapshotu beze změny a žádné duplicity. Jde o ztrátu výsledku na klientské straně, nikoli test všech síťových/TLS poruch. |
| RP09 | Dvě různé akce mají dva oddělené ročníkové záznamy2027 (import podporuje jen tento rok). Druhý import má vlastní mapping/approval a prokazatelně čeká na globální ShareRowExclusiveLock prvního. | Oba následně uspějí bez smíchání ročníků: každý má svůj roster/odměnu/package/request. Potvrzuje i skutečný dopad globálního zámku na jinou akci, neslibuje paralelní zápisy. |
| RP10 | Vlastní PostgreSQL je ukončen SIGKILL při rozpracovaném importu a restartován nad stejným vlastním volume. Potom se totéž opakuje po skutečném COMMIT. Před zásahem se ověřuje vlastnický label. | Po prvním pádu odpovídá všech30 tabulek původnímu snapshotu a přesný retry uspěje. Po druhém pádu jsou commitnutá data zachovaná, replay vrátí uložený výsledek bez duplicity. Klientská spojení používají znovu zjištěný loopback port a soukromé přístupy. |

Standardní skutečná sada má nyní10 úspěšných případů včetně dřívější obnovy skutečného PG dumpu. Samostatné SIGTERM i SIGKILL/recovery zkoušky jsou jiné režimy a počítají se odděleně. Striktní RX01 expirace zůstává selhávající, není přejmenovaný na úspěšný test nebo expectedFailure.

## Úklid po SIGKILL v novém procesu

Opt-in `--verify-hard-kill` založí vlastní child se známým soukromým output rootem. Po ready checkpointu pošle SIGKILL pouze tomuto Popen procesu, nikdy PID ze souboru. Očekává exit-9 a absenci dokončeného reportu; násilně ukončený proces se nesmí vydávat za úspěšnou sadu.

Nový proces se stejným explicitním lokálním Docker socketem dostane `--recover-owned-test CHECKPOINT`. Nevytváří nový server, nečte heslo a nepřipojuje se k PostgreSQL. Před úklidem musí společně platit:

1. Explicitní `--run-synthetic`, checkpoint uvnitř zadaného soukromého output rootu a vlastněná soukromá složka odpovídající testovacímu pojmenování.
2. Soubor je obyčejný, vlastněný, bez skupinových/veřejných práv, max16KiB a otevřený bez následování symlinku. JSON má přesný tvar/verzi bez duplicitních klíčů a správné ID/token/image; neúplný prepared checkpoint se automaticky neřeší.
3. Živé Docker ID, název, připnutý image a vlastnický label souhlasí. Pouhá shoda JSON nebo labelu nestačí.
4. Přesně odpovídající anonymní volume na /var/lib/postgresql a jediný readonly bind souboru password z dané testovací složky do /run/secrets/dbpass. Cizí volume, dodatečný bind nebo zapisovatelný password mount se odmítá.
5. Checkpoint se během ověřování nezměnil. Přístupové soubory, pokud existují, jsou vlastní soukromé obyčejné soubory, nikoli symlinky.

Teprve potom se volá stávající úklid vlastního kontejneru s opětovnou kontrolou labelu a odstraněním jeho připojených anonymních dat. Smažou se jen známé jednorázové soubory. Neexistuje globální prune ani `docker volume rm` podle jmen ze souboru.

Pokud kontejner už chybí, recovery smí pouze nezávisle potvrdit absenci všech zaznamenaných volumes a dokončit místní úklid. Existující osiřelý nebo neověřitelný volume znamená zastavení a pozdější ruční posouzení, nikdy automatické smazání. Nedostupný daemon/odmítnutý socket není potvrzená absence. Nový soukromý report výslovně uvádí testSuiteSuccessful:false a cutoverReady:false; úspěšný úklid není úspěšný původně zabitý test nebo aktivace.

Řízená zkouška provedla recovery dvakrát v nových procesech. První doložila úklid, druhá rozpoznala už odstraněný kontejner/data a bezpečně uspěla bez dalšího mazání. Nakonec nezávislá kontrola potvrdila cleaned checkpoint a absenci kontejneru, volumes a jednorázových přístupů.

## Opakování a bezpečnostní testy

Použít stejný základ explicitních lokálních argumentů jako46/47. Režimy jsou vzájemně výlučné:

```text
--verify-hard-kill
--recover-owned-test /absolute/private/run/checkpoint.json
```

Recovery helper je pouze testovací `tests/postgres_test_recovery.py`. Běžné unit testy Docker nespouštějí. Osm nových bezpečnostních případů ověřuje privátní checkpoint, přesný tvar/duplicity, oprávnění/symlink/limit, cizí živou identitu a storage, odmítnutí osiřelého volume bez mazání, chybu daemonu a překročení explicitního rootu. Celkem182 hostitelských a18 bezpečnostních pod Python -O prošlo. CI mění jen příslušné path filtry; nezapíná automatický Docker běh.

## Hranice dokončení a otevřené věci

- SIGKILL byl řízený a následoval po dokončeném ready checkpointu. Není to důkaz výpadku napájení, poškození filesystemu, ztráty checkpointu nebo přerušení během jeho aktualizace/Docker create. Neúplné checkpointy a osiřelé volumes zůstávají na bezpečné samostatné posouzení.
- Checkpoint recovery dokončuje úklid zabitého testovacího běhu. RP10 odděleně prokazuje restart stejné testovací DB po pádu serverového procesu: rollback necommitnuté transakce a zachování commitnutých dat. Není to výpadek napájení VM/úložiště ani úplná provozní obnova ze vzdálené zálohy.
- Chyba61, skutečný projekt/účty/OAuth/scopes, globální role a provider secrets, skutečné Storage bajty, úplný vzdálený cíl/klíč/obnova/plánovač, browser a samostatný souhlas s aktivací zůstávají otevřené podle31/45/48.
- Žádné native auth/model/usage, reálné crew/SQLite, provozní import/DDL/grant/deploy nebo aktivace záloh.18+26 pending scénářů parseru/checkeru zůstává nespouštěných.
