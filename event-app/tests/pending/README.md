# Připravené akceptační scénáře

Původních11 Storage scénářů bylo přesunuto do tests/backup-storage.test.mjs a rozšířeno o regresní scénáře review. Po skutečném spuštění jsou součástí běžného npm test a CI. Další nepřipojené testy v této složce se nikdy nepočítají mezi prošlé jen na základě syntaxe.

Fake Storage SDK a remote adapter neprokazují živé oprávnění, cloudovou kopii nebo běžící plánovač. Propojený test používá skutečné místní/PG/Storage kolektory, kryptografii a obnovu syntetické SQLite, ale samotné pg_dump/pg_restore executable, Storage SDK a vzdálený cíl jsou fiktivní.
