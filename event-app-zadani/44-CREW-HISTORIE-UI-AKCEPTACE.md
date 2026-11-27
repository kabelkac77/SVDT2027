# Crew — historie pod řádkem a její akceptace

Stav 2026-11-27: příprava další implementace a testů, UI není implementované ani nově odsouhlasené. Navazuje na existující čtecí DB rozhraní [40](40-CREW-CTENI-HISTORIE.md), uživatelem potvrzený detail přímo pod řádkem a zachování historie. Zachovat barvy kategorií, Exo a současné ovládání. Backendové testy nenahrazují níže uvedený browser průchod.

## Pracovní průchod

1. Správce otevře člověka/skupinu ve stávajícím seznamu. Detail zůstává pod stejným řádkem. Aktuální formulář se tím neodesílá ani nemění.
2. U uloženého záznamu nabídnout samostatnou sbalenou část „Původ a historie“. U nového neuloženého záznamu ji nezobrazovat. Obsah nenačítat hromadně při otevření seznamu.
3. Po rozbalení získat pouze metadata zdrojů pro tento záznam. Při prázdném výsledku: „K tomuto záznamu zatím není připojený původní podklad.“ Neznamená to chybějícího člověka ani neúspěšný import.
4. Zdroj vybrat explicitně tlačítkem „Zobrazit podklad“. Ani jediný zdroj nenačítat automaticky. U více zdrojů se nepovažuje nejnovější za aktuální pravdu; zobrazit datum zachycení a rozlišující pořadí. Původní název sešitu backend neposkytuje — nevymýšlet jej z hashe nebo data.
5. Pod výběrem ukázat „Původní pracovní záznam 2027“ a případně „Navázaná historie 2026“. Původní pracovní záznam je uložený zdroj převodu, nikoli dnešní editovatelný stav. Text „Podklad pro porovnání. Účast ani finanční domluvu pro aktuální ročník nepotvrzuje.“
6. Původní obsah je readonly. Žádné tlačítko pro převzetí všech údajů, potvrzení účasti, proplacení nebo přepsání aktuálního záznamu. Návrh nemění současný editor ani jeho pravidla rozepsané práce.

Názvy a texty výše jsou návrh k pozdějšímu UX projití, nikoli nové uživatelské rozhodnutí. Přesný rozsah přístupu zůstává podle serveru40: pouze správce ročníku2027. Finanční grant koordinátora historii neodemkne. Archivační readonly přístup správce je dovolený. Neodvozovat právo ze jména Vojta/Vlasta nebo viditelnosti tlačítka.

## Původní sloupce a zobrazení

- Každý vrácený sloupec zachovat pod svým původním názvem; i neznámé sloupce. Dlouhý `content` zobrazit sbalitelně jako původní text. Nepřevádět automaticky na novou finanční domluvu nebo stav člověka.
- Rozlišit NULL („Prázdná hodnota / NULL“), prázdný řetězec, nulu a false. Objekty/pole/blob markery zobrazit textově, nepřekládat je na nulu nebo prázdno. `content` string neparsovat a zpětně neformátovat jako náhradu originálu.
- Zachovat diakritiku, nové řádky a bílé znaky v zobrazení původního textu. HTML, skripty, Markdown, odkazy a věty formulované jako instrukce jsou pouze text. Nepoužívat HTML vykreslení, automatické otevírání URL nebo spouštění obsahu.
- Historie2026 může chybět: ukázat „Tento podklad nemá navázaný historický řádek2026.“ Nevydávat to za nulovou odměnu. Historii2025 neodvozovat podle jména; současné RPC ji tímto průchodem nevydává.
- Šířka detailu odpovídá tabulce; dlouhé hodnoty se zalomí, delší text má omezenou výšku a vlastní posun. Historie nesmí roztáhnout hlavní tabulku mimo obrazovku. Ovládání klávesnicí, aria-expanded a viditelný fokus; po zavření návrat fokusu na ovládací prvek.

## Stavy a oddělení odpovědí

Index i vybraný zdroj mají vlastní loading/error/empty stav. Při změně zdroje starý obsah ihned skrýt; opožděná odpověď předchozího požadavku se nesmí zobrazit pod novým zdrojem.

Platnost načtení vázat na uživatele, ročník, uložené ID řádku, package ID a generaci požadavku. Změna identity/ročníku/řádku, zavření historie nebo unmount zneplatní požadavky a odstraní zobrazený původní obsah. Přepnutí na stejného uživatele po běžném token refresh se nesmí zaměnit za jiný účet; po novém otevření znovu autorizovat serverovým voláním. Zrušení HTTP požadavku samo nestačí jako ochrana před pozdní odpovědí.

Chyba oprávnění vymaže metadata i původní obsah a nabídne bezpečnou zprávu bez surové DB chyby. Nedostupná služba/nezavedené RPC nejsou prázdná historie; žádný fallback na demo, původní SQLite nebo neautorizovanou cache. Limit1000 se zobrazí jako omezení seznamu, nikoli částečně úspěšné načtení. UI nesmí obcházet limit hromadným čtením balíčků.

Žádné kopie v localStorage, sessionStorage, IndexedDB, persistentním query cache, URL/hash, logu, chybovém hlášení, telemetrii nebo veřejných fixture. Nevytvářet přednačítání všech řádků. Již zobrazená data nelze vzdáleně odvolat z paměti člověka; okamžitou revokaci bez dalšího serverového ověření neslibovat. Politika kontroly dlouho otevřené obrazovky zůstává otevřená v31.

## Kontext pro implementátora

Stávající komponenty: `crew-workspace.tsx` drží identitu, ročník a generace; `crew-roster-view.tsx` vykresluje inline editor; `crew-backend.ts` zatím nemá history adapter. Přidat typovaný read adapter a lokální stav historie až v samostatném úkolu. Neměnit zápisové payloady editoru, RPC40 nebo přímé zákazy čtení privátních parserů. První iterace pouze sdílená aplikace; starý místní prototyp ani demo nejsou druhým klientem privátního RPC. Žádné nové účty/role/granty či migrace nejsou součástí tohoto UI úkolu.

## Browser akceptace — zatím vše NEPROVEDENO

| ID | Situace | Očekávaný důkaz |
| --- | --- | --- |
| HUI01 | Zavřený seznam/detail | Síť neobsahuje history RPC ani celé source payloady. |
| HUI02 | Rozbalit historii uloženého záznamu | Jen index konkrétního ročníku/řádku; content až po explicitním zdroji. |
| HUI03 | Dva zdroje jednoho člověka | Každý zobrazí svůj text; metadata ani detail neprozradí jiný řádek. |
| HUI04 | Bez historie / bez navázaného2026 | Dva odlišné prázdné stavy, bez domýšlení2025 nebo nulových financí. |
| HUI05 | Přepnout zdroj, odpovědi v opačném pořadí | Pozdní odpověď nepřepíše právě vybraný podklad. |
| HUI06 | Přepnout řádek/ročník/uživatele při načítání | Předchozí obsah zmizí, odpověď se zahodí; žádná cache jiné identity. |
| HUI07 | Odhlášení / odebrání role při dalším volání | Server odmítne, citlivý obsah i metadata se odstraní; žádný demo fallback. |
| HUI08 | Koordinátor i s finance grantem, člen, viewer, cizí správce | Zákaz v UI i přímém RPC; běžná editace neuděluje přístup k historii. |
| HUI09 | NULL/0/false/blob, HTML text, dlouhá čeština | Odlišné hodnoty a původní text; žádné vykonané HTML/odkazy nebo logy. |
| HUI10 | Archiv2027 a jiný ročník | Správce archivu pouze čte; jiný ročník se automaticky nezamění za2027. |
| HUI11 | Síťová chyba, chybějící RPC, limit1001 | Viditelná chyba, žádný prázdný úspěch nebo částečný seznam. |
| HUI12 | Rozepsaný editor, úzký mobil, klávesnice | Historie nic neuloží/nepřepíše; detail zůstane pod řádkem, funguje fokus. |

Testovat se syntetickými podklady a skutečnými oddělenými testovacími účty až v povoleném prostředí. DB testy40 a dnešní rozšíření pokrývají serverovou část, nikoli tyto UI scénáře. Kontrolu dokončení a přístupy evidovat soukromě podle [45](45-PREDPROVOZNI-PROTOKOL.md).
