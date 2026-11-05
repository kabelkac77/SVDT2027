# Crew — neveřejné zdroje, historie a vazby převodu

Navazuje na33/34. Toto je příprava kódu/schématu, nikoli produkční aktivace nebo souhlas s mapováním. Nová additive migrace zachová staré migrace. Skutečné místní SQLite/historie a neveřejný náhled zůstávají mimo Git/model/CI.

## Účel a rozsah

Běžný crew_roster a oddělené crew_compensation neposkytují místo pro všechny původní sloupce, historii2025/2026, místní audit/requests a další zdrojové tabulky. Přidáváme privátní bezeztrátový zdrojový balíček a vazbu mezi místním pracovním řádkem a cílovým rosterem. To nezakládá Person/Auth účty ani nedává členu přístup k historii nebo penězům.

`crew_transfer_packages`: id/edition_id, source_sha256, source_text přesných UTF8 bajtů crew-tables.json, source_format:'crew-tables-v1', actor_id/created_at. Original source_text uchovává původní pořadí, JSON řetězce, NULL/0, všechny tabulky/sloupce a BLOB markery; JSONB reprezentace sama by přesné zdrojové bajty nenahradila. SHA256 se musí shodovat s UTF8 source_text, limit128MiB a kořenový JSONarray. Unikátní edition+hash zabrání dvěma balíčkům stejného snapshotu v ročníku. Kompletní doménová validace a schválené mapování jsou povinnost budoucího transakčního importu; tato vrstva je archiv, nikoli hotový importer.

`crew_transfer_links`: package_id/edition_id/source_row_id, roster_id, source_history_id optional, actor_id/created_at. Složené FK drží stejný ročník balíčku a rosteru. Primární klíč package+source_row_id a unikátní package+roster_id brání duplicitní vazbě i tichému sloučení dvou lokálních řádků do jednoho rosteru. Trigger ověří, že source_row_id odpovídá právě jednomu working řádku2027 a source_history_id jeho původní source_id; nenulový source odkaz musí být v tomtéž balíčku právě jednou jako historie2026. Jméno ani e-mail se nepoužívají k nalezení vazby.

## Přístup, původ a nezměnitelnost

Obě tabulky mají RLS. Přihlášený správce daného crew ročníku může číst; koordinátor ani finančně oprávněný koordinátor nebo člen nečte původní obsah/vazby. Ostatní ročníky a partnerský čtenář bez crew administrace jsou vyloučené. Žádný klient nedostane přímý INSERT/UPDATE/DELETE/TRUNCATE ani nové write RPC. Vložení je připravené až pro budoucí ověřený SECURITY DEFINER import, který musí běžet pod skutečnou identitou správce. Trigger znovu ověří aktivní nearchivovaný ročník, zamkne jeho životní cyklus a nastaví actor_id/created_at ze skutečné identity/času; podvržený autor se nepřebírá.

UPDATE/DELETE/TRUNCATE balíčku/vazeb jsou blokované, včetně archivovaného ročníku. Zdrojový balíček není běžný editovatelný provozní řádek. Pozdější oprava může přidat další snapshot/vazbu po kontrolovaném rozhodnutí; nepozmění původní záznam. Databázový superuživatel může pravidla měnit, není to ochrana proti samotnému správci infrastruktury. Neměnnost neuděluje věčné uchovávání: případná výslovně řízená pravidla výmazu/retence budou samostatný postup, nikoli tlačítko běžné crew editace.

## Brány před ostrým převodem

Samotná přítomnost tabulek, správný hash nebo preview_only výsledek neprokazují schválení importu. Pořád vyžadujeme dostupný správný projekt/ročník, živé role/RLS, ověřenou úplnou zálohu/obnovu, mapování osoby/skupiny a účtů, náhled rozdílů proti úplnému oprávněnému cílovému exportu a konkrétní aktivační pokyn. Současný SQLite zůstává zdroj zápisu. Po sdílených zápisech se k němu nesmí automaticky vracet jako ke druhé pracovní evidenci.

Akceptace na syntetické databázi: přesné source_text/hash, všechny původní tabulky a extra data, duplicitní snapshot/vazby, cizí ročník, chybějící/duplicitní pracovní source řádek a historická vazba, textové roky, podvržený autor, archiv, čtenář/člen/koordinátor/finance/cizí správce, přímé klientské mutace, UPDATE/DELETE/TRUNCATE i read po odebrání role. Nové tabulky zahrnout do preflightu/migračního inventáře a zálohy skutečně nasazené verze, nic automaticky neaplikovat.
