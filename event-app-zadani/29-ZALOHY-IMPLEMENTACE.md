# Úplné obnovitelné zálohy — implementační hranice

Autorizovaný bod 27. Současný soukromý cíl je dříve vybraná synchronizovaná složka; přesná cesta se nezveřejňuje. Zápis do ní neprokazuje vzdálenou kopii ani běh při vypnutém notebooku.

## Rozsah úplné zálohy

1. Aplikační zdroje/dokumentace a verze, bez tajných .env a obnovovacího klíče.
2. Konzistentní SQLite snímek místní crew včetně historie, auditu a vazeb.
3. Další místní soukromé vstupy aplikace (např. schválené intake JSON a zdrojové podklady), výslovný inventář, bez tajných klíčů a rekurzivního přibírání starých záloh.
4. Skutečný export sdílené databáze včetně použitých schémat/Auth v deklarovaném rozsahu, nikoli veřejné RLS dotazy nebo nulová odpověď anon klienta.
5. Soukromé soubory Storage i jejich úplný inventář; metadata DB samotná nejsou přílohy.
6. Čitelné exporty uložených modulů a popis obnovy.

Všechny deklarované povinné zdroje musí být úspěšně dokončené. Chybějící přístup/zdroj nesmí být potichu přeskočený nebo prezentovaný jako nulová data. Balíček je šifrovaný s ověřením integrity, obsahuje manifest a SHA-256 souborů. Obnova pouze do nového adresáře, bez přepsání běžící evidence; ověřit čitelnost obnovených dat a následně databázovou obnovu podle formátu.

## Aktuálně zjištěné předpoklady

Soukromá konfigurace obsahuje pouze veřejný Supabase klient, chybí přístup pro databázový dump a pro zálohu soukromých Storage objektů; pg_dump ani Supabase CLI nejsou v pracovním runtime. Dosavadní cloudová synchronizace nebyla vzdáleně ověřená. Aktivace úplných automatických záloh zatím nemůže být poctivě označená za hotovou. Nezávisle lze implementovat a otestovat šifrovaný balíček, obnovu, sběr zdrojů a kontrolu úplnosti. Konkrétní přístupy, úschova klíče a vzdálený vykonavatel/cíl zůstávají k pozdějšímu doplnění, bez nutnosti přerušit ostatní vývoj.

## Kroky

A. Šifrovaný balíček a striktní obnova — samostatný Node modul bez závislostí, testy poškození, cest a zákazů přepsání.
B. Kolektory zdrojů, SQLite, databáze, Storage a exportů; oprávnění a temp adresáře soukromé, žádné secrets nebo osobní data v logu.
C. Vzdálené uložení a ověření nové kopie, spuštění plánované úlohy v potvrzeném prostředí, monitor chyb, test skutečné obnovy a retence. Připravený kód není důkaz aktivního plánovače nebo dokončené vzdálené kopie.
