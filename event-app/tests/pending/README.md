# Připravené akceptační scénáře

Původních11 Storage scénářů bylo přesunuto do tests/backup-storage.test.mjs a rozšířeno o regresní scénáře review. Po skutečném spuštění jsou součástí běžného npm test a CI. Další nepřipojené testy v této složce se nikdy nepočítají mezi prošlé jen na základě syntaxe.

Fake Storage SDK a remote adapter neprokazují živé oprávnění, cloudovou kopii nebo běžící plánovač. Propojený test používá skutečné místní/PG/Storage kolektory, kryptografii a obnovu syntetické SQLite, ale samotné pg_dump/pg_restore executable, Storage SDK a vzdálený cíl jsou fiktivní.

## Crew kontrola převodu

Checker39/57 je od2026-11-28 implementovaný přímo Codexem. Původní `crew_import_verify_test.py.pending` byl přesunut byte-for-byte do `tests/crew_import_verify_test.py`:26 skutečně prošlých scénářů. Dalších9 hraničních scénářů v `tests/crew_import_verify_edges_test.py` také prošlo. Propojení s PGlite importerem/readbackem ověřené na syntetických datech. Žádné parser/checker pending testy nezbývají; report neověřuje živou autoritu/aktivaci. Úplný provozní export je samostatný backlog, standardní snapshot bez source_history_id nestačí.

Parser43/56 je od2026-11-28 implementovaný přímo Codexem. Původní `crew_import_verify_plan_test.py.pending` byl přesunut byte-for-byte do `tests/crew_import_verify_plan_test.py`:18 skutečně prošlých scénářů. Dalších7 v `tests/crew_import_verify_plan_edges_test.py`; všech25 prošlo také pod Python -O a je součástí běžné hostitelské sady (aktuálně294 prošlých). Parser nepotvrzuje autoritu/exporty ani výsledek skutečného převodu. Viz event-app-zadani/56-CREW-PARSER-PLANU-A-OVERENI.md.

Souhrn57:35 checkerových+25 parserových kontrol, všech60 prošlo i pod Python -O. Viz event-app-zadani/57-CREW-KONTROLA-PREVODU-A-OVERENI.md.
