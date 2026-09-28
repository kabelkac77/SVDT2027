# Podklad Partnerů — filtrace importu

Zdroj dodal Vojta 2026-09-28: [PARTNERS_2026.xlsx na Google Drive](https://docs.google.com/spreadsheets/d/1i-35N7HBQCMP4Fd8-rcjoXVSrdQP2vcM/edit?gid=625585128).
Jde o Excel otevřený v Google Sheets, nikoli nativní Google Sheet. Zdroj se pouze čte a nemění.

## Pravidla

1. Primární vstup je list `2027 - aktuální`, hlavička B8:P8, pojmenované řádky B9:P179. Název souboru 2026 neurčuje ročník všech listů.
2. Výslovné DT/SVDT/Downtown v úkolu = kandidát pro SVDT. Smíšené „DT a Piknik“ zůstává relevantní, ale souhrnné částky a dohody se automaticky nerozdělují.
3. Dalším důvodem pro zařazení je přesná shoda normalizovaného názvu s listem `DT - 2026` (ořezání mezer a velikosti písmen). To dokládá vazbu na akci, nikoli potvrzení pro rok 2027.
4. Nejasné přiřazení patří do fronty k ověření. Žádné fuzzy slučování právních subjektů, rozšiřování zkratek nebo domýšlení IČO.
5. Listy `Pik -2026`, `Piknik - 2025`, `PSH after` se neimportují do SVDT. `2025 - komplet`, `List 9`, `Nove oslovit` a další nezařazené listy se automaticky nepřenášejí. `DT - oborovy` a `DT mediální partner` jsou možné budoucí zdroje leadů, ne potvrzených partnerů 2027.
6. Řádky bez názvu se nepřipojují automaticky k předchozímu partnerovi. Samostatné poznámky nad hlavičkou B4:D6 vyžadují ruční doplnění identity.
7. Shodné názvy se seskupí do návrhu se zachováním všech zdrojových řádků. Více e-mailů se zachová; jména osob z adres nevymýšlíme. Podobné názvy zůstávají samostatné.
8. Poznámky, fakturace, typ partnerství, loga a historické částky zůstávají původním podkladem. Checkbox loga není potvrzení partnerství ani splnění závazku. Volný text „potvrzeno“ může patřit starému ročníku nebo barteru; nestává se automaticky stavem 2027.
9. Historické plnění z `Partneri - plneni` slouží k návrhu katalogu; nepřenáší se jako splněné plnění 2027. Partner může poskytovat peníze, věci, služby i mediální podporu; finanční ocenění dopracujeme podle Excelu Financí.

## Výsledek prvního průchodu

- 157 pojmenovaných zdrojových řádků → 148 skupin názvů.
- 116 skupin s vazbou na SVDT, 32 skupin k ověření přiřazení.
- Sloupec F „2027 potvrzené“ nemá v datových řádcích žádnou hodnotu. Neexistuje tedy ani číselný podklad pro automatické potvrzení příspěvku 2027.
- 9 skupin opakovaných názvů; seskupení není potvrzení totožnosti právní organizace.
- 6 řádků bez názvu s poznámkou k jiné akci: 127, 128, 137, 138, 145, 165. Jsou oddělené.
- V pojmenovaných řádcích primárního listu nebyl čistě jiný event bez DT; cizí akce jsou v samostatných listech a bezejmenných návazných řádcích.

Opakovatelný read-only filtr: `event-app/scripts/filter_partners.py`. Výstup `.local/partners-intake.json` zůstává mimo Git (kontakty, obchodní poznámky). Aplikace jej přijímá jako lokální soubor ve frontě podkladů. Do DB se zapisuje až jednotlivý zkontrolovaný formulář s vybraným ownerem a pravdivým stavem. Nenačítat tento soubor do veřejného dema ani do klientského bundle.

Lokálně dodaný `PARTNERS_2026-2.xlsx` je bitově totožný s verzí získanou z Drive (SHA-256 `10100e8d12c6a5e8d84518bdf0a1da2dfaca601ec76df8eb96612bcd3e288f86`). Druhý dodaný soubor `Personal - SVDT2026.xlsx` je podklad budoucího personálního modulu; není partnerský ani rozpočtový import.

## Dopad na model

Importní kandidát je samostatný podklad, není automaticky `osloven`. Produkční statusy zůstávají tři podle původního rozhodnutí. Předvyplněný formulář importu vyžaduje výběr stavu a ownera; profil/oslovení vzniká až jeho uložením. U podkladu se zachová zdrojový list a číslo řádku. Více kontaktů a strukturovaný katalog typů/plnění rozšíříme před externím portálem.
