# SVDT — web 2027

Zadání a postupný rozvoj [svdtpribram.cz](https://svdtpribram.cz/) pro ročník 2027. Současný web běží na WordPressu s Divi. Nové řešení není na Divi vázané; redakční systém je nutný a jeho výběr popisuje zadání. Navazujeme na společný design systém a ostatní projekty v tomto repozitáři.

## Kde začít

| Soubor | Účel |
| --- | --- |
| [ZADANI.md](ZADANI.md) | Jediný zdroj aktuálních požadavků, rozhodnutí, otevřených bodů a stavu webového projektu |
| [REVIZE_2026-09-28.md](REVIZE_2026-09-28.md) | Výchozí obsahový a vizuální audit; historický podklad, nikoli automaticky schválený rozsah |
| [ODKAZY.md](ODKAZY.md) | Rozcestník společných pravidel, návazností a externích podkladů |
| [Společný design systém](../design-system/readme.md) | Vizuální pravidla, tokeny a komponenty pro celý projekt |

## Jak budeme pracovat

1. Před prací přečíst `ZADANI.md`, příslušnou část společného design systému a dokumentaci navazujícího projektu.
2. Nové rozhodnutí nebo odpověď zapsat do `ZADANI.md`, včetně data. Návrh nezaměňovat za potvrzený požadavek; hotové zadání není hotová implementace.
3. Dílčí složku vytvořit až při zahájení konkrétní části. Dostane vlastní `README.md`, dílčí zadání a jasně rozlišené zdroje, podklady a exporty. Její stav se stručně promítne do hlavního zadání.
4. Design systém nekopírovat do `web/`. Odkazovat na společný zdroj; případné webové rozšíření popsat a sladit s ním.
5. Zachovat návaznosti na broadcast, 3D, prezentaci a merch. Jejich specifická rozhodnutí nepřenášet automaticky na web a jejich soubory neměnit jako vedlejší účinek práce na webu.
6. Pracovní návrhy označit jako návrhy, ukázková data jako fiktivní. Hesla, klíče, skutečné přihlášky, platební údaje ani export databáze WordPressu do veřejného repozitáře nepatří.

V této chvíli je připravené zadání a revize. Nevznikla nová implementace ani nasazení webu. Složka nemá vlastní dashboard; generátor v `DT-grafika-TV/` nadále obsluhuje pouze svůj projekt.
