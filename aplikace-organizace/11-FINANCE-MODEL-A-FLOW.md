# Finance — propojené lokální zkoušení

Dodávka 2026-09-28: `/demo` propojuje Partnery a Finance přes stejné organizace a ročníky. Z partnera lze otevřít jeho finance, z finanční položky přejít zpět. UI je pracovní; finální design připraví Claude dle pokynu uživatele.

## Model

`FinanceItem`: ID, ročník, název, příjem/výdaj, hlavní akce/afterparty/nerozděleno, kategorie, nepovinná organizace daného ročníku, plán, potvrzená částka, splatnost, URL dokladu, poznámka, verze.

- Peníze se ukládají jako celočíselné haléře, nyní pouze CZK. Vstup přijímá čárku i tečku a nejvýše dvě desetinná místa.
- Prázdná potvrzená částka znamená neznámou hodnotu; nula je potvrzená nula. Potvrzení není úhrada.
- `Settlement`: ID, položka, typ, částka, datum, poznámka. Typy: převod/hotovost, osobní výdaj, barter, proplacení osobního výdaje.
- Zbývá vypořádat = potvrzená částka minus převody/hotovost, osobní výdaje a barter. Proplacení osobního výdaje nesnižuje stejný závazek podruhé.
- Zbývá proplatit = osobní výdaje minus jejich proplacení. Osoba je nyní v povinné poznámce, nikoliv plně modelovaná personální identita. Párování více osob zbývá.
- Nepovolujeme přeplatek ani proplacení nad osobní zůstatek. Po úhradě nelze změnit směr/protistranu ani snížit potvrzenou částku pod již vypořádanou hodnotu.
- Verze chrání před zastaralým formulářem. Archiv je pouze ke čtení. Lokální historie zapisuje vytvoření/úpravu položky a vypořádání, není serverovým bezpečnostním auditem.

## Vyzkoušení

1. Otevřít `/demo`, ročník 2027, vybrat nebo založit partnera.
2. V detailu **Finance tohoto partnera**, případně v menu **Finance** pro celý ročník.
3. Založit položku, zadat plán a potvrzenou částku. Zapsat částečnou úhradu s datem a zkontrolovat zůstatek.
4. U výdaje vyzkoušet osobní platbu a následné proplacení. Barter má vlastní typ.
5. Z položky otevřít partnera a jeho plnění. Finanční vypořádání samo nepotvrzuje partnerství ani splnění plnění.
6. Reload zachová změny v tomto prohlížeči. **Obnovit demo** resetuje oba moduly; data zmizí také vymazáním úložiště prohlížeče.

## Hranice dodávky

Pouze fiktivní lokální data. Finance ještě nemají Supabase migraci, RLS ani sdílené transakční ukládání. localStorage není provozní záloha ani záruka souběhu více záložek. Skutečný rozpočet není importovaný.

Před ostrým provozem: finanční backend a samostatná oprávnění, schvalování, identita osob/protistran, přílohy a doklady, opravy/storna/vratky, převody mezi vlastními účty a ověřený import dle `11-FINANCE-PODKLAD.md`. Přeplatky a zálohy nad potvrzenou částku zatím nemají workflow. Sdílená databáze musí kontrolovat součty úhrad transakčně.

Ověření: testy přesnosti peněz, částečné úhrady, přeplatků, odděleného proplacení, barteru, archivu, neznámých částek, verzí a neplatných vazeb/dat/URL; browser průchod včetně reloadu a návratu na partnera.
