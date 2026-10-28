# Přehledový CSV export a odložená potvrzení

2026-10-28. Ruční průchod a uživatelská potvrzení jsou na výslovný pokyn odložená v backlogu. Tento samostatný celek připravuje čitelný export již uloženého přehledu, navazující na požadavek CSV/Excel. Nerozhoduje identity, skutečné domluvy ani sdílená oprávnění.

## Rozsah exportu

CSV obsahuje aktuálně filtrované uložené řádky právě vybraného ročníku, včetně členů sbalených kategorií. Při zapnutém zahrnutí vyřazených obsahuje i je. Roky se v jednom výstupu nesměšují. Rozpracovaný neuložený formulář se neexportuje; při rozepsaných změnách ovládání vyžádá nejprve jejich uložení nebo zahození a nic samo nezahodí. Volba roku/filtrů se exportem nemění.

Samostatný čistý JS modul exportuje buildCsv(rows, year) přes module.exports v Node i window.SVDT_CREW_CSV v browseru. Vrací {csv, filename, rowCount}, žádné I/O, DOM, síť nebo mutace vstupu. Název je SVDT-lide-YYYY.csv. Povolené roky 2025/2026/2027, vstup je pole nejvýše 10 000 řádků. Všechny řádky musí mít přesně tento rok a neprázdné řetězcové ID. Pracovní 2027 smí obsahovat jen uloženou verzi (kladný bezpečný integer version). Neplatný vstup končí TypeError s konstantní českou zprávou bez vložených dat.

Pevné sloupce v pořadí: ID; Ročník; Kategorie; Jméno / skupina; Stav; Pozice; Kdo řeší; E-mail; Telefon; Barter; Merch; Termín / účast; Vyřazený; Verze; Zdrojový ročník; Zdrojový list; Zdrojový řádek; Zdrojový záznam. Hodnoty jsou odpovídající id/year/category/name/statusLabel (jinak status)/position/owner/email/phone/barter/merch/fields.term/archived/version/sourceYear/source.sheet/source.row/sourceId. Vyřazený je Ano/Ne pro boolean, jinak prázdný. Volitelná chybějící hodnota je prázdná; typy telefon/ID/ročníky jsou textové.

Následují úplné raw a extra sloupce. Pro každou z obou skupin vytvořit sjednocení klíčů (přesný label + pořadí jeho opakování v daném řádku), v pořadí prvního výskytu. Nezaměnit hodnoty, když mají různé řádky jiné pořadí extra položek. Duplicitní label se zachová vícekrát. Hlavičky mají jedinečné pořadové prefixy Tabulka N: label a Další N: label. Label je neprázdný string, hodnota je null/undefined/string/boolean/konečné číslo. Chybějící raw/extra znamená prázdné pole, jiný typ je neplatný. Použít Map nebo jinou ochranu proti kolizím klíčů __proto__/constructor a separátorů v popiscích.

## Formát a bezpečnost

UTF-8 BOM, středník jako lokální dialekt, CRLF mezi záznamy včetně koncového CRLF. Každé pole uzavřít dvojitými uvozovkami a vnitřní uvozovky zdvojit. Každou neprázdnou textovou hodnotu včetně hlaviček prefixovat jedním tabulátorem uvnitř uvozovek; zachovat původní text za prefixem včetně jeho whitespace/CR/LF. To zároveň zachovává telefon a řetězcové počáteční nuly jako text. Čísla se serializují jako konečné numerické hodnoty s desetinnou čárkou, bez přidávání měny; nula není prázdná. Boolean raw/extra zachovat jako true/false text. Null/undefined a prázdný string mají v tomto přehledovém formátu prázdnou buňku. Není to bezeztrátový importní formát: přesné typy a rozdíly null/prázdný text zůstávají v JSON záloze a SQLite.

Jde o CSV pro lidské čtení v Excelu, ne nový importní protokol. Tabulátor je součástí textových dat při strojovém načtení. Strategie není univerzální zárukou chování každého tabulkového programu ani jeho dalšího ukládání/přeexportu. Zkoušky mají ověřit skutečné serializované buňky včetně vzorcových prefixů, oddělovačů, uvozovek, více řádků a full-width znaků; nevydávat kontrolu bajtů za spuštění desktopového Excelu.

Podklad: [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection), zejména ochrana pro lidské čtení v Excelu a její hranice. Pravidla uvozování a záznamů podle [RFC 4180](https://www.rfc-editor.org/info/rfc4180/), se záměrně zvoleným středníkovým dialektem místo čárky.

## Ověření a stav

IN PROGRESS. Claude připravuje pouze čistý modul; Codex nezávislé regresní testy, review, integraci a browser kontrolu výhradně na fiktivních datech. Skutečný export uživatel vytvoří až výslovným kliknutím; data se nikam nenahrávají a evidence se exportem nemění. JSON záloha a historické roky zůstávají zachované. Přesné testy a revize se doplní podle skutečných výsledků.
