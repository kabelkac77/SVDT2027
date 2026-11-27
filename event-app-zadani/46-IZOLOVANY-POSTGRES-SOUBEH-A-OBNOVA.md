# Izolovaný PostgreSQL — skutečný souběh a obnova

Rozsah2026-11-27: čtyři skutečné testy v jednorázovém vlastním PostgreSQL18.6 a bezpečnostní kontroly jejich spouštění. Výhradně veřejné syntetické fixture, žádná skutečná SQLite, lidé, provozní projekt nebo existující přístupy. Jde o nezávislé hostitelské testy, nikoli převzetí blokované implementace parseru39/43 nebo zapnutí sdíleného provozu. Nativní Claude/auth/usage se nevolají.

## Co je nyní skutečně ověřené

| ID | Zkouška | Konkrétní podmínka úspěchu |
| --- | --- | --- |
| RP01 | Dva souběžní klienti, stejný schválený syntetický import a request | První transakce drží zámky po úspěšném zápisu. Druhý klient má skutečný čekací stav Lock a doloženého blokujícího klienta. Po commitu dostanou stejný výsledek; jen1 balíček/roster/odměna/request, žádná nová Person/Auth identita. |
| RP02 | Timeout při čekání na cizí zámek | Skutečný server vrátí55P03, všechny30 sledované tabulky zůstanou proti snapshotu beze změny. Po uvolnění zámku uspěje tentýž request/approval/plan/source, bez nové identity požadavku. |
| RP03 | Odebrání role během čekání | Klient vstoupí jako oprávněný správce, prokazatelně čeká na zámek; jiný klient mu roli změní. Po uvolnění nesmí pokračovat podle staré role:42501, žádný roster/odměna/balíček/request. |
| RP04 | Skutečný kolektor, pg_dump/pg_restore a nová DB | Kolektor použije skutečné binární nástroje, celý aktuální30tabulkový inventář a custom dump. Obnova do nové prázdné DB zachová všechny řádky, původní source_text, historii, NULL/0, RLS flagy/politiky a vybrané zákazy RPC. Finanční koordinátor historii po obnově stále nečte. |

Souběh se ověřuje přes pg_stat_activity/pg_blocking_pids, nikoli jen dvěma postupnými voláními nebo odhadem podle délky sleep. Krátký serverový sleep drží známé transakční okno; úspěch vyžaduje pozorovaný skutečný zámek. Každý případ má vlastní nově vytvořenou testovací DB. Všech7 migračních hashů se kontroluje před načtením do této prázdné testovací DB; žádný provozní migrační stav se tím nemění.

Kolektor sám nadále vrací restoreTested:false, protože žádný svůj běh automaticky neobnovuje. Důkaz konkrétní provedené obnovy je samostatný test/protokol RP04. Jeho úspěch se nesmí přepsat do obecného tvrzení, že každý budoucí dump je obnovitelný.

## Bezpečný rozsah a úklid

`event-app/tests/postgres-acceptance.manual.py` nebere URL existující databáze, přístupové heslo, cizí service file ani libovolný image jako parametr. Bez výslovného `--run-synthetic` se nespustí. Docker kontaktuje přes explicitní místní Unix socket a vlastní prázdnou klientskou konfiguraci; nepřebírá vzdálený DOCKER_HOST/context ani okolní secrets.

Použije předem stažený oficiální image připnutý digestem (žádný pull ze skriptu), unikátní název/label, nová anonymní data a náhodný přístup pouze na127.0.0.1 s novým jednorázovým heslem. Do kontejneru se váže pouze nový readonly soubor s tímto heslem, žádný zdrojový adresář, SQLite nebo existující volume. Password/service soubory a výstupy mají0600, nadřazená nová složka0700. Přístupy nejsou v příkazových argumentech ani veřejném reportu.

Na konci se kontroluje vlastnický label; odstraňuje se pouze právě vytvořený kontejner a jeho anonymní svazky. Ověří se jejich absence a smažou jednorázové přístupové soubory. Žádné globální prune, mazání cizích kontejnerů/volumes nebo dotazy do cizí DB. Bezpečnostní brány používají běžné výjimky a fungují i při Python -O. Pokud nejde vlastnictví nebo úklid doložit, běh nesmí hlásit dokončený úspěch.

Šest běžných testů `postgres_manual_scope_test.py` ověřuje: povinný opt-in, odmítnutí přístupů k existující DB/libovolného image, bezpečný tvar spojení, explicitní lokální Docker bez okolních secrets odmítnutí úklidu cizího labelu a zákaz zaměnění chyby Dockeru za potvrzený úklid. Tyto bezpečnostní testy žádný Docker ani databázi nekontaktují. Samostatně jsou ověřené i při optimalizovaném Pythonu.

## Ruční opakování pouze v povoleném testovacím prostředí

Skript není součástí automatického npm/unittest běhu a nepřidává plánovač nebo živou automatizaci. Nejprve ověřit instalaci lokálního Dockeru, shodnou major verzi psql/pg_dump/pg_restore, Node a dostupnost přesně připnutého image. Provozní server nebo Supabase endpoint se sem nezadává. Konkrétní místní cesty patří do neveřejného záznamu.

Ilustrační příkaz se záměrnými zástupnými absolutními cestami:

```sh
python3 -B event-app/tests/postgres-acceptance.manual.py \
  --run-synthetic \
  --docker /absolute/bin/docker \
  --docker-socket /absolute/local/docker.sock \
  --pg-bin /absolute/postgresql/bin \
  --node /absolute/bin/node \
  --output-root /absolute/private/test-results
```

Výstupní root musí existovat jako soukromý adresář uživatele. Skript do něj vytvoří novou unikátní složku; nepřepíše původní zálohu nebo zdroj. Sanitizovaná evidence výsledku, přesný digest/verze a hashe testů jsou v [evidenci](isolated-postgres-verification.json); skutečné místní cesty a pracovní artefakty zůstávají soukromé. Image může zůstat v místní cache pro opakování; žádná testovací služba po úspěšném úklidu neběží.

## Co tento důkaz nenahrazuje

- Testovací Auth je minimální schéma a simulovaná JWT identita přes session setting + skutečný serverový role switch. Není to doručené OAuth/OTP, skutečné user JWT, RLS transport Supabase nebo vzdálené odvolání přístupu v otevřeném UI.
- Platformní Auth identities a Storage tabulky jsou syntetické minimální fixture. Obnova jejich řádků není obnova Auth provider secrets, Storage bajtů, bucket politik nebo konfigurace skutečné služby.
- Obnovená DB je nová, ale na témže izolovaném testovacím serveru; potřebné globální role byly vytvořené fixture. pg_dump nezálohuje globální role/hesla a jejich úplná obnova v jiném prostředí zůstává zvlášť.
- Tři skutečné souběhové případy nenahrazují všechny provozní scénáře: další souběhy různých requestů/ročníků, revokace approval, expirace během čekání, ztráta síťové odpovědi a přepnutí aplikace zůstávají otevřené.
- Úklid je ověřený při běžném dokončení a selhání kontrolovaného testu. Nouzový recovery checkpoint a průchod při násilném ukončení hostitele/SIGTERM zatím nejsou samostatně ověřené; případný úklid musí zachovat kontrolu vlastnictví a nesmí použít globální prune.
- Nevzniká důkaz skutečné úplné vzdálené zálohy, dostupnosti obnovovacího klíče, retence/plánovače, browser akceptace ani provozní autority exportů.18+26 pending scénářů parseru/checkeru se tím nespouští.

Aktualizuje dílčí technické důkazy G03/G06 v [45](45-PREDPROVOZNI-PROTOKOL.md). Živé brány [31](31-AKTIVACE-A-RUCNI-KONTROLY.md)/[34](34-SDILENY-PROVOZ-AKCEPTACE.md) zůstávají otevřené a skutečný import zakázaný. Nikdo uživateli nepřiděluje roli nebo neschvaluje aktivaci mlčením.

Technické podklady k oficiálnímu image a souborovému předání hesla: [Docker PostgreSQL](https://github.com/docker-library/docs/blob/master/postgres/README.md#docker-secrets). Verze a digest v evidenci jsou skutečně testované, ne tvrzení o nejnovější dostupné verzi.
