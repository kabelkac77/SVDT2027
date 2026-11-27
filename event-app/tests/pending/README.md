# Připravené akceptační scénáře

Původních11 Storage scénářů bylo přesunuto do tests/backup-storage.test.mjs a rozšířeno o regresní scénáře review. Po skutečném spuštění jsou součástí běžného npm test a CI. Další nepřipojené testy v této složce se nikdy nepočítají mezi prošlé jen na základě syntaxe.

Fake Storage SDK a remote adapter neprokazují živé oprávnění, cloudovou kopii nebo běžící plánovač. Propojený test používá skutečné místní/PG/Storage kolektory, kryptografii a obnovu syntetické SQLite, ale samotné pg_dump/pg_restore executable, Storage SDK a vzdálený cíl jsou fiktivní.

## Crew kontrola převodu

`crew_import_verify_test.py.pending`:26 dříve připravených scénářů celého checkeru39.
`crew_import_verify_plan_test.py.pending`:18 scénářů samostatného parseru43 z27.11.2026.

Oba moduly chybí. Testy jsou NEspuštěné; kontrola syntaxe není úspěšný test. Parserové scénáře vyžadují existující builder/preview fixture a po implementaci helperu se mají přesunout do `tests/crew_import_verify_plan_test.py` (import tools se vztahuje k této cílové cestě). Plný checker se obdobně přesune do tests/. Žádné skutečné podklady ani import se k jejich spuštění nepoužívají.
