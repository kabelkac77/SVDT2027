# SVDT — web 2027

Zadání a postupný rozvoj [svdtpribram.cz](https://svdtpribram.cz/) pro ročník 2027. Současný web běží na WordPressu s Divi. Nové řešení používá potvrzený WordPress s vlastní samostatnou blokovou šablonou a funkčním pluginem, bez Divi a bez child theme. Navazujeme na společný design systém a ostatní projekty v tomto repozitáři.

## Kde začít

| Soubor | Účel |
| --- | --- |
| [ZADANI.md](ZADANI.md) | Zdroj požadavků, rozsahu, rozhodnutí a otevřených bodů webového projektu |
| [UKOLY.md](UKOLY.md) | Nejbližší kroky, stav konkrétních úkolů, závislosti a zásobník po spuštění |
| [VIZUALNI_NAVRH.md](VIZUALNI_NAVRH.md) | Zadání pro Claude Design, první návrhové kolo a kontrolní kritéria |
| [STRUKTURA_V1.md](STRUKTURA_V1.md) | Pracovní návrh navigace, stránek, homepage, redakčního modelu a převodu známých adres |
| [REVIZE_2026-09-28.md](REVIZE_2026-09-28.md) | Výchozí obsahový a vizuální audit; historický podklad, nikoli automaticky schválený rozsah |
| [ODKAZY.md](ODKAZY.md) | Rozcestník společných pravidel, návazností a externích podkladů |
| [Společný design systém](../design-system/readme.md) | Vizuální pravidla, tokeny a komponenty pro celý projekt |

## Jak budeme pracovat

1. Vybrat nejbližší připravený krok v `UKOLY.md`. Před prací přečíst `ZADANI.md`, příslušnou část společného design systému a dokumentaci navazujícího projektu.
2. Nové rozhodnutí nebo odpověď zapsat do `ZADANI.md`, včetně data. Návrh nezaměňovat za potvrzený požadavek; hotové zadání není hotová implementace.
3. Dílčí složku vytvořit až při zahájení konkrétní části. Dostane vlastní `README.md`, dílčí zadání a jasně rozlišené zdroje, podklady a exporty. Konkrétní stav práce vést v `UKOLY.md`; dokončený milník se stručně promítne do hlavního zadání.
4. Design systém nekopírovat do `web/`. Odkazovat na společný zdroj; případné webové rozšíření popsat a sladit s ním.
5. Zachovat návaznosti na broadcast, 3D, prezentaci a merch. Jejich specifická rozhodnutí nepřenášet automaticky na web a jejich soubory neměnit jako vedlejší účinek práce na webu.
6. Pracovní návrhy označit jako návrhy, ukázková data jako fiktivní. Hesla, klíče, skutečné přihlášky, platební údaje ani export databáze WordPressu do veřejného repozitáře nepatří.

V této chvíli jsou připravené zadání, revize, pracovní struktura první verze a předávací zadání pro vizuální návrh. Samotný návrh obrazovek dosud nevznikl. Nevznikla nová implementace ani nasazení webu. Složka nemá vlastní dashboard; generátor v `DT-grafika-TV/` nadále obsluhuje pouze svůj projekt.
