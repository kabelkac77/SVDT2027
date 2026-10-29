# Přehled stavů v kategoriích lidí a crew

2026-10-29. Samostatný navazující krok podle potvrzeného požadavku mít přehled personálu a barevně odlišené sbalovací kategorie. Uživatelská kontrola je výslovně odložená. Jde o přehled uložených záznamů, nikoli výpočet potřebného počtu lidí nebo automatické potvrzení obsazenosti.

## Rozsah

Ve skutečné místní pracovní evidenci 2027 doplnit do záhlaví každé kategorie stručné počty stavů zobrazených uložených záznamů. Záhlaví zůstává jediným tlačítkem pro rozbalení; žádná vnořená tlačítka, další stránka nebo nový režim. Zachovat barvu kategorie, její název, celkový počet zobrazených řádků a aria-expanded. Souhrn je vidět i při sbalené kategorii. Nulové stavové počty vynechat. Použít dosavadní statusTitles a sheet-state barvy; stav není určen barvou kategorie.

Počítat z přesně stejného filtrovaného group, které renderer používá pro řádky. Cizí rok a vyřazené záznamy tak zůstávají mimo, pokud je uživatel nezahrnul. Nečíst původní finance, identitu, kontakty nebo jméno při výpočtu; žádné slučování podle jména. Zahrnout pouze version jako kladný bezpečný integer. Neuložený nový řádek version=0 se do stavů nezapočítává; pokud takový řádek v group je, přidat nenápadný text 'Neuložené: N'. Neznámý/nepodporovaný status uloženého řádku zahrnout do unknown (K ověření), aby záznam nezmizel ze součtu. Použít bezpečné statické klíče nebo Map, nikdy nedůvěryhodný status jako HTML nebo klíč prototypu.

Nový helper sGroupSummary(group) vrací HTML pouze při sheetData.workspace a sheetYear přesně '2027'. Bez síťového volání, ukládání, mutace dat nebo změny filtrů. Hlavičky historických 2025/2026 i statického ukázkového modelu zůstanou bez nových součtů. Používat se() pro jakýkoli proměnný text. Žádné jméno/kontakt/poznámka v novém souhrnu.

Souhrnný span .sheet-group-summary má title a aria-label vysvětlující, že jde o stavy zobrazených uložených záznamů, nikoli počet unikátních lidí nebo obsazenost rolí. Jednotlivé nenulové stavy .sheet-group-status + sheet-state + známý klíč stavu obsahují dosavadní popisek a číslo. Neuložené řádky mají samostatný neutrální text, nikoli potvrzený stav. Prázdná kategorie nemá žádné stavové štítky.

CSS upravit pouze v crew-category-colors.css: souhrn kompaktní, bez zbytečného zvětšení desktopových řádků, na úzkém mobilu zalomit a nepřetéct vodorovně. Zachovat ovládání klávesnicí a nejméně 44px klikací výšku na mobilu. Neskrývat název kategorie ani štítky jen kvůli šířce. Dosavadní Exo, tokeny, světlé/tmavé téma a barevné pruhy zachovat.

## Předání a akceptace

Claude upravuje pouze event-app-zadani/wireframes/crew-sheet.js a crew-category-colors.css. Host připraví nezávislé syntetické Node regresní testy celého rendereru a prohlížečovou kontrolu. Přehled musí správně reagovat na hledání/stav/kategorii, vyřazené, uložené změny a ročník; rozbalení a ochrana rozepsaných změn se nesmí změnit. Neprovádět jiné opravy původního rendereru.

Stav: IN PROGRESS. Ručně později: odsouhlasit kompaktnost/čitelnost přehledu a cílové počty/role/termíny pro skutečný výpočet obsazenosti. Neaktivovat sdílení, import, automatické zálohy nebo komunikaci s crew.
