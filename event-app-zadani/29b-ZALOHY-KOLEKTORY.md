# Úplné zálohy — navazující kolektory a aktivace

Stav 2026-11-05: knihovna29a, místní kolektor29c, PostgreSQL kolektor29d a koordinátor29f jsou implementované a synteticky ověřené. Storage29e je stále pouze smlouva a nespouštěné akceptační testy; nativní vývojový běh skončil chybou bez návrhu. Konkrétní vzdálený adapter, plánovač a živá aktivace nejsou dokončené. Aktivace závisí také na přístupech v31. Nepovažovat chybějící přístup za prázdnou úspěšnou databázi.

## Sběr a konzistence

Každý běh má nový soukromý pracovní adresář0700, vlastní zámek, datum/verzi zdrojů a inventář. Připravené soubory0600 se následně předají createBackup. Klíč získat odděleně ze správce tajemství, nikdy z klientské proměnné nebo společného exportního adresáře. Nezapisovat soukromé cesty, kontakty nebo dump do CI či stdout.

- Zdroje: přesný Git commit a explicitní aktuální obecné soubory. Vyloučit .git, node_modules, .next, .env*, .local, klíče a starší zálohy. Dirty zdroje zaznamenat výslovným inventářem, nikoli vydávat za čistý commit. Není přípustné automaticky publikovat soukromé vstupy.
- Crew: konzistentní snímek přes SQLite backup API, nikoli kopie právě otevřeného DB/WAL souboru. Provést integrity_check a počet ročníků/záznamů, snímek nikdy nesmí změnit pracovní DB. Historie, audit, zdrojová pole a vazby zůstávají zahrnuté.
- Vstupy: explicitní soukromý inventář schválených vstupů, včetně původních tabulek a intake JSON, pokud existují. Bez automatického procházení Downloads/Disk/uživatelského účtu. Chybějící deklarovaný soubor nebo symlink znamená chybu běhu.
- PostgreSQL: kompatibilní pg_dump/pg_restore, zvláštní neveřejný přístup s deklarovaným úplným rozsahem public/Auth a dalších použitých schémat. Selhání nebo nedostatečné právo blokuje úplný výsledek. Dump metadata obsahují verzi nástroje a rozsah, nikoli heslo/URI. Žádné nahrazení SQL dumpu RLS čtením anon klienta.
- Storage: kompletní oprávněný inventář bucketů/objektů se stránkováním, všechny soukromé bajty a checksum. Znovu ověřit inventář po stažení; při změně chybovat nebo řízeně zopakovat celý sběr. Známě prázdný Storage má doložený inventář s0 objekty; nedostupný není prázdný.
- Exporty: CSV/JSON uložených modulů odvozené z konzistentních snímků. Zachovat NULL/0, ročník a verze, nezdvojovat souhrny a detaily. Přidat český obnovovací postup a popis závislostí. CSV není databázová obnova.

Databáze a Storage nemají společnou automatickou transakci. Pro první úplnou provozní zálohu je potřeba potvrzené konzistentní okno bez zápisů nebo verze objektů, které umožní prokázat vazby. Běh tuto skutečnost zaznamená; nesmí tvrdit atomický celosystémový snapshot bez důkazu.

## Uložení mimo počítač

Po šifrování lokálně znovu ověřit readBackup. Vzdálený cíl musí mít autentizaci a exkluzivní nové jméno; nevkládat nic do veřejného repozitáře. Prokázat upload nezávislým stažením a shodou SHA-256 šifrovaného balíčku. Lokální zápis do synchronizované složky není takovým důkazem. Při chybě ponechat poslední platnou zálohu a chybový stav bez citlivých údajů. Retence nesmí mazat neověřené/cizí objekty nebo poslední obnovitelnou kopii.

Plánovač spustit až v potvrzeném prostředí se všemi přístupy, úschovou klíče a sledováním zmeškaného běhu. Běh závislý na zapnutém Macu tak výslovně označit. Samostatný vzdálený vykonavatel nesmí předstírat, že má aktuální SQLite notebooku; k tomu je nutný přenos snímku nebo dokončený přechod na sdílenou databázi.

## Akceptace před označením aktivní

Syntetické testy: chybějící zdroj, duplicitní/překrývající se inventář, nedostatečný přístup, paging Storage, změna během sběru, selhání dumpu/uploadu/ověření, zámek souběhu, zachování poslední kopie a konstantní veřejné chyby. Potom skutečný soukromý běh a izolovaná obnova SQLite, PostgreSQL/Auth a příloh, včetně rolí a vazeb. Obnovovací klíč musí být dostupný i při ztrátě tohoto Macu. Teprve poté lze uzavřít požadavek na automatické úplné zálohy mimo tento počítač.
