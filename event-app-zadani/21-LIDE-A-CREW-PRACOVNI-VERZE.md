# Lidi a crew — pracovní evidence 2027

2026-10-28, v0.4. **Na výslovný pokyn uživatele je vytvořená skutečně editovatelná místní pracovní verze s trvalým ukládáním.** Tento pokyn nahrazuje dřívější omezení pouze na čtecí personální náhled. Rozsah je tento počítač a personální evidence; produkční Supabase, účty a přístupy dalších lidí se nemění.

## Jak pracovat

1. Otevřít [pracovní personál](http://127.0.0.1:4317/crew.html#people). Výchozí rok je **2027**.
2. Kategorie jsou po otevření **sbalené**: vidět název, barevný pruh a počet záznamů. Kliknout na kategorii a pak na člověka. Přímo pod řádkem upravit údaje. Rozbalit lze více kategorií; opětovné kliknutí je sbalí. Hledání automaticky rozbalí shody, výběr kategorie ve filtru její členy. Sbalování hlídá neuložené změny. Rozbalení se pamatuje během otevření stránky zvlášť pro jednotlivé ročníky, po obnovení je přehled opět sbalený. Na mobilu jsou ovládací prvky pod **Hledání, filtry a správa**.
3. Kliknout **Uložit změny**. Potvrzení „Uloženo na tomto počítači“ znamená úspěšný zápis do místní databáze. Rozepsané změny se samy neukládají.
4. Přes **Kategorie a barvy** přidávat/přejmenovávat skupiny a měnit jejich pruhy. Registrace a VIP mají samostatné kategorie. Každý řádek má stejný pruh jako jeho skupina; stav domluvy má samostatný barevný štítek.
5. **Přidat člověka** otevře nový řádek; vznikne až po uložení. Původní jména uvedená uživatelem byla příklady, nevkládají se jako skuteční členové.
6. Člověka lze označit **Vyřadit jen z pracovní evidence 2027**. Je dohledatelný přes **Včetně vyřazených** a lze jej obnovit; historie se nemaže.
7. V přepínači ročníků otevřít **2026** nebo **2025**. Jsou pouze pro čtení. U převzatého řádku lze navíc rozbalit původní údaje 2026 přímo pod formulářem pro porovnání.

## Časy v pátek a v sobotu

Hlavní řádek má sloupce **PÁ (od–do)** a **SO (od–do)**. Klikni na člověka, v detailu vyplň stejnojmenná pole například `08:00–16:00` a klikni **Uložit změny**. Časy zůstanou po obnovení stránky a jsou také v CSV/JSON exportu. Pomlčka znamená, že údaj zatím není vyplněný; prázdné pole při uložení čas smaže. Jde o ruční textový rozsah, ne plánování směn nebo výpočet odpracovaných hodin. Obecný termín a potvrzení účasti jsou samostatné.

Starší záznamy se při čtení nepřepisují. Starší otevřené okno bez nových polí zachová již uložené časy. Historie zůstává neměnná; aktuální časy se z minulých let automaticky nepřebírají. Na mobilu jsou hodnoty označené PÁ a SO uvnitř karty. [Specifikace a ověření](26-CREW-PATEK-SOBOTA.md).

## Export filtrovaného přehledu

Vyber ročník, případně zadej hledání, stav nebo kategorii a klikni **Export CSV**. Stáhne se jen uložený filtrovaný přehled; sbalené kategorie jeho členy nevyřadí. Při zapnutém **Včetně vyřazených** zahrne také vyřazené. Export funguje i pro historické ročníky bez možnosti jejich úprav. Před stažením ulož nebo zahoď rozepsané změny; export sám formulář nezahazuje.

Soubor má kontakty, domluvu, zdroj a všechny původní sloupce. Textová pole obsahují ochranný tabulátor, částky desetinnou čárku. Je určený k prohlížení, nikoli zpětnému importu nebo úplné obnově. **Stáhnout zálohu** nadále vytváří úplný JSON pracovní evidence. Data se exportem nikam neposílají. [Formát a hranice](24-CSV-PREHLED-A-ODLOZENE-KONTROLY.md).

## Co se převzalo a co je nové

Pracovní záznamy 2027 mají samostatná ID a odkaz na zdrojový řádek 2026. Převzaly jména, kontakty, pracovní pozice, odpovědné a pracovní zařazení. Nejasné zdrojové řádky jsou stále k ruční kontrole, žádné slučování osob podle jména. Jde o pracovní evidenci řádků, nikoli hotovou globální databázi Person.

Účast je nově **Neoslovený / kandidát**, bez automatického potvrzení. Odhad, nové domluvené peníze, celková hodnota a vyplacení pro 2027 jsou neurčené. Historické platby ani barter nejsou novým závazkem. Minulé částky a poznámky zůstávají v historii; můžeš se podle nich nově domluvit a údaje ručně zadat.

Potvrzená účast vyžaduje vyplnit, pro který termín platí. To není samo o sobě výpočet obsazenosti celého týmu nebo připravenosti zóny. Vyplacení je ruční evidenční údaj, nepředstavuje bankovní příkaz nebo plný finanční ledger. Neznámá částka zůstává prázdná, známá nula se zadá jako 0. Barter/merch mají samostatné popisy, automaticky se neoceňují.

## Ukládání a zachování historie

- Soukromá SQLite databáze: `.local/crew-workspace/crew.sqlite3` a její provozní soubory. Změny zůstávají po reloadu, zavření prohlížeče i restartu služby.
- Historická data jsou vlastní neměnné záznamy. GUI je nenabízí k editaci, server zápis odmítá a databáze má ochranu proti jejich aktualizaci/smazání. Původní Excel se nepřepisuje.
- Každé uložení kontroluje verzi řádku. Dvě okna se navzájem tiše nepřepíšou; konflikt zachová rozepsané údaje a nabídne vědomé načtení uložené verze.
- Opakování stejného požadavku nevytvoří dvojí změnu. Po nepotvrzené odpovědi zůstává draft; chyba se nevydává za úspěch. Přechod na jiný řádek/ročník upozorní na neuložené změny.
- Změny mají místní evidenci předchozí/nové hodnoty a času. Nejde o ověřenou identitu přihlášeného člověka: místní nástroj nemá účty Vojta/Vlasta ani produkční granty.

## Zálohy a spuštění

V `.local/crew-workspace/backups/` vzniká obnovitelný databázový snímek při prvním použití v daný den (Europe/Prague). Evidenci uložených změn doplňuje lokální historie. **Stáhnout zálohu** exportuje aktuální uložená data včetně historie do soukromého JSON. Rozepsaný neuložený formulář součástí exportu není. Tyto soubory nepatří do veřejného repozitáře ani do Claude Design.

Pro opětovné spuštění na tomto Macu použít [spustit-personal.command](../event-app/tools/spustit-personal.command). Případně z kořene projektu:

```sh
python3 event-app/tools/crew_workspace.py --port 4317
```

Pokud už náhled běží, stačí otevřít adresu výše. Po prvním založení se existující databáze nikdy nepřestavuje z původního sešitu. Potřebné jsou pouze standardní knihovny Pythonu; spouštěč nejprve použije přibalený runtime.

Obnovu dělat při zastavené službě: nejprve bezpečně zkopírovat celou aktuální soukromou složku včetně případných WAL souborů, ověřit vybraný snímek a obnovovat do nové složky přes parametr `--data-dir`. Nevracet soubor databáze přes běžící službu. Snapshot obsahuje i historii; JSON je čitelný export, ne automatický importní příkaz.

## Hranice a ověření

Místní server je vázaný pouze na 127.0.0.1, soukromé soubory nejsou staticky dostupné. Zápisy kontrolují původ požadavku, ochranný token, validaci, verzi a ročník; data se při výpadku neukládají do ukázkového localStorage. Reálné údaje a zálohy jsou v ignorované `.local/`, mimo veřejné návrhové balíčky. Nejde o sdílený internetový provoz nebo automaticky dokončené zálohování celé aplikace/Supabase.

Ověřeno: 12 izolovaných serverových/databázových testů a 17 prohlížečových kontrol na **fiktivních** datech. Persistenci ověřilo znovuotevření DB i restart služby; obnovitelný snímek prošel kontrolou integrity. Testované konflikty, historie, opakování požadavku, peněžní přesnost, kategorie/barvy, přidání a vyřazení člověka, neuložené formuláře a mobilní šířka 390 px. Skutečná historie byla navíc porovnaná se zdrojem bez změny Excelu. Podrobná evidence v [CREW-WORKSPACE-QA.md](wireframes/CREW-WORKSPACE-QA.md).

Zbývá ruční úklid zdrojových nejasností, skutečné domluvy pro 2027, případné sdílení a budoucí řízený přenos do kanonického modelu s oprávněními. Starší v0.3 je historický čtecí návrh; v0.4 je tato lokální pracovní dodávka.

## Doplněk — ověřené atomické snímky

Snímek má soukromá oprávnění od vytvoření; konečný název získá až po ověření integrity a potřebného schématu. Existující platný snímek se nepřepíše. Vadný soubor nebo symlink se automaticky nemaže; při takovém selhání nejprve uchovat aktuální soukromou složku a chybný snímek vědomě přesunout stranou, pak zopakovat vytvoření. Při testech se tímto způsobem pracuje pouze se syntetickými soubory. [Ověření a hranice](23-PRACOVNI-EVIDENCE-A-SNIMKY.md). Nejde o zapnutí plánovaných kompletních záloh.
