# Ověření místní pracovní evidence v0.4

2026-10-28. Rozsah: skutečně ukládaná pracovní verze personálu 2027, neměnná historie a barevné kategorie. Zdrojový Excel se nepřepisuje. Všechny zápisové testy proběhly na oddělených **fiktivních** datech; skutečné pracovní osoby nebyly upravované pro účely testování.

## Server a databáze — 12 testů

`event-app/tests/crew_workspace_test.py`: převzetí kontaktů bez potvrzení/částek pro nový rok; uložení a opětovné otevření DB; neměnná historie v API i SQLite; odmítnutí souběžné zastaralé změny; bezpečné opakování požadavku bez duplicit; přesné částky v haléřích, NULL/nula a atomické odmítnutí chyby; potvrzení s termínem; přejmenování/barva kategorie při zachování zařazení; přesun/vyřazení/obnova/nový člověk; obnovitelný databázový snímek a export; kontrola původu/tokenů/Host; nepřístupnost soukromých souborů přes HTTP.

Spuštění z kořene:

```sh
python3 -m unittest discover -s event-app/tests -p crew_workspace_test.py -v
```

Testy používají dočasné složky a vlastní místní port, ne Supabase nebo uživatelskou databázi.

## Prohlížeč — 17 kontrol

Konkrétní výsledky v [crew-workspace-qa-results.json](crew-workspace-qa-results.json). Ověřeno: ochrana neuloženého formuláře při změně ročníku; jméno/částka po reloadu; historie bez editoru a nezměněné staré jméno; přejmenování kategorie a shodný pruh skupiny/člověka; barva po reloadu; neplatné potvrzení zachová formulář; uložení nového člověka; vyřazení bez smazání a dohledání; dvě okna s konfliktem a vědomé načtení; pokračování v editaci po zavření kategorií; nová kategorie s volnou barvou; uložení rozepsaného formuláře po restartu služby; mobilní editor 390 px bez horizontálního přetékání; přesun záznamu mimo aktuální filtr se srozumitelným potvrzením.

Fiktivní server byl skutečně restartován nad stejnou DB. Klient si při novém ochranném tokenu obnovil spojení a uložil stejný požadavek bez ztráty formuláře. Ukázková evidence kategorií: [screenshot](evidence/crew-workspace-groups-qa.png), pouze fiktivní lidé.

## Skutečná data a omezení

Před otevřením pracovní verze ověřena integrita místní DB, shoda všech historických záznamů se soukromým zdrojem, oddělená pracovní kopie 2027 a nezměněný kontrolní součet Excelu. Skutečné kontakty a částky nejsou ve veřejném QA ani screenshotech.

Toto není test sdíleného přihlášení, Supabase RLS, celého finančního ledgeru, bankovního příkazu nebo produkčního nasazení. Místní uživatel nemá ověřenou lidskou identitu pro vícečlenný audit. Denní lokální snímek při používání nástroje není automatická záloha celé aplikace v cloudu. Fyzický mobil a venkovní čitelnost zůstávají k ručnímu posouzení.

## Doplněk — sbalovací skupiny

Samostatný následný běh: [14 UI kontrol](crew-collapse-qa-results.json), všechny úspěšné. Výchozí sbalení, samostatné rozbalení, ovládání Enter, hledání/shody, filtr kategorie, ochrana a výslovné zahození neuloženého formuláře, automatické otevření nové osoby, oddělená čtecí historie, kompaktní ovládání, detail pod řádkem a obnovení původního sbalení po vymazání hledání. Fiktivní interakce na 1280 × 720 px; skutečný přehled devíti kategorií ověřen bez zápisu na 319 × 632 px, všechny nadpisy současně viditelné. Soukromý screenshot se skutečnými počty je pouze v ignorované .local/. Tato změna nezasahuje SQLite ani historické údaje.
