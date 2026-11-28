# Připravené akceptační scénáře

Původních11 Storage scénářů bylo přesunuto do tests/backup-storage.test.mjs a rozšířeno o regresní scénáře review. Po skutečném spuštění jsou součástí běžného npm test a CI. Další nepřipojené testy v této složce se nikdy nepočítají mezi prošlé jen na základě syntaxe.

Fake Storage SDK a remote adapter neprokazují živé oprávnění, cloudovou kopii nebo běžící plánovač. Propojený test používá skutečné místní/PG/Storage kolektory, kryptografii a obnovu syntetické SQLite, ale samotné pg_dump/pg_restore executable, Storage SDK a vzdálený cíl jsou fiktivní.

## Crew kontrola převodu

`crew_import_verify_test.py.pending`:26 připravených scénářů celého checkeru39. Modul crew_import_verify.py chybí; scénáře nejsou spuštěné, syntaxe není úspěšný test. Po implementaci je přesunout do tests/. Používají jen syntetické podklady.

Parser43/56 je od2026-11-28 implementovaný přímo Codexem. Původní `crew_import_verify_plan_test.py.pending` byl přesunut byte-for-byte do `tests/crew_import_verify_plan_test.py`:18 skutečně prošlých scénářů. Dalších7 v `tests/crew_import_verify_plan_edges_test.py`; všech25 prošlo také pod Python -O a je součástí259 prošlých hostitelských kontrol. Parser nepotvrzuje autoritu/exporty ani výsledek skutečného převodu. Viz event-app-zadani/56-CREW-PARSER-PLANU-A-OVERENI.md.
