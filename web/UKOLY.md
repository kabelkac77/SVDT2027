# Úkoly a zásobník — web SVDT 2027

Aktualizováno 28. 9. 2026. Pracovní fronta navazující na [ZADANI.md](ZADANI.md). Postup: **základ → návrh → funkční web → kontrola a spuštění → rozšíření**.

## Jak tento seznam používat

- ZADANI.md určuje požadavky, rozsah a rozhodnutí. Zde vedeme konkrétní práci, její pořadí, závislosti a dokončení. Při změně rozsahu aktualizovat nejprve zadání a následně odpovídající úkol.
- Stavy: **Připraveno**, **Čeká**, **Probíhá**, **Hotovo**, **Odloženo**. Čeká znamená konkrétní nesplněnou závislost; Odloženo označuje práci mimo první vydání.
- ID úkolu se nemění. Při dokončení připsat datum a odkaz na výstup nebo záznam ověření. Samotné napsání zadání neznamená dokončenou funkci.
- „Na nás“ označuje přípravu a realizaci v tomto projektu; „zadavatel“ dodává podklady a rozhodnutí. Konkrétní další osoby zatím nejsou přiřazené.
- Vždy vybrat jeden hlavní rozpracovaný krok. Nezávislé podklady lze sbírat průběžně.
- Nové nápady zapisovat do zásobníku dole. Do první verze je nepřidávat automaticky.
- Termíny doplníme po rozhodnutí o platformě a dostupnosti podkladů. Tento seznam neslibuje konkrétní datum spuštění.

## Nejbližší postup

1. **WEB-001:** zjistit současný hosting a možnosti testovacího prostředí. Ze screenshotů potvrzen **Active24 Smart s rozšířením**, dostupné SSL, denní zálohy, 512MB PHP limit a shell konzole. SVDT nyní používá Apache 2.4 / PHP 7.4; WordPress 6.9.9 je údaj zadavatele. Nabídka PHP 8.2–8.5 je doložená; navržený základ sandboxu je 8.4. Další krok: ověřit databázi, velikost samotného SVDT a samostatné nastavení náhledu; rezerva úložiště je omezená.
2. **WEB-002:** uzavřít volbu CMS a způsob nasazování na základě doporučení v zadání.
3. **WEB-003 a WEB-004:** určit přesný obsah první verze, navigaci a způsob správy CZ/EN. Inventura veřejného obsahu může začít i během čekání na hosting.
4. Po uzavření základu přejít na návrhy homepage a partnerství.

Probíhá přípravná inventura WEB-001; základní parametry jsou doložené screenshoty, přímá kontrola nastavení a provozní zkoušky zbývají. Žádný implementační úkol ještě neprobíhá. Lokální prostředí ani nový web zatím nejsou vytvořené.

## A. Základ a rozhodnutí — první verze

| ID | Úkol / vazba | Stav | Kdo / závislost | Hotovo znamená |
| --- | --- | --- | --- | --- |
| WEB-001 | Ověřit hosting, doménu, zálohy a možnost stagingu | Probíhá | Active24 Smart doložen screenshoty 28. 9. 2026; PHP 7.4 potvrzeno, WordPress 6.9.9 dle zadavatele; PHP 8.2–8.5 dostupné; na nás: velikost SVDT, databáze, oddělený náhled a jeho PHP, skutečný přenos a obnova | Zapsané možnosti hostingu a návrh odděleného náhledu bez zásahu do produkce |
| WEB-002 | Potvrdit CMS, architekturu a způsob nasazení | Čeká | Na nás + zadavatel; WEB-001 | Zapsaná volba a důvody v zadání; WordPress je zatím doporučení, Divi není podmínka |
| WEB-003 | Inventura stránek, adres a podkladů; rozsah V1 (W01) | Připraveno | Na nás; zadavatel doplní neveřejné podklady | Seznam ponechat / přepsat / archivovat / přesměrovat a konkrétní seznam stránek první verze |
| WEB-004 | Navigace, CZ/EN a redakční obsahový model (W01) | Čeká | Na nás + zadavatel; WEB-003 | Mapa stránek, jazykový postup, správa ročníku/programu/partnerů a hranice vůči interní aplikaci |
| WEB-005 | Shromáždit a ověřit obsah 2027 | Připraveno | Zadavatel + na nás | Evidence zdrojů, chybějících údajů, práv k médiím a odpovědností; neznámé údaje označené, nikoli domyšlené |
| WEB-006 | Vyřešit obsah partnerské nabídky (W03) | Připraveno | Na nás + zadavatel | Sjednocené balíčky/ceny z Canvy, vysvětlené metriky a období, kontaktní cesta; neověřená tvrzení se nepublikují |

WEB-005 a WEB-006 lze připravovat při práci na struktuře. Pro první návrhy mohou být chybějící podklady označené; před veřejným spuštěním musí být nahrazené nebo odpovídající obsah vynechaný.

### Průběžná údržba současného webu

- **WEB-021 — Posoudit přechod současného webu z PHP 7.4. Stav: Čeká.** Na nás: inventura Divi/pluginů, záloha a test kompatibility na kopii; závisí na dostupném přístupu a testovacím prostředí. Výsledek: ověřený postup aktualizace nebo konkrétní seznam překážek. Produkční přepnutí provést až po testu a dohodě o nasazení. Nejde o nové rozšíření etapy 4 ani o důvod odkládat návrh nového webu.

## B. Návrh — první verze

| ID | Úkol / vazba | Stav | Kdo / závislost | Hotovo znamená |
| --- | --- | --- | --- | --- |
| WEB-007 | Navrhnout homepage pro mobil i desktop (W02) | Čeká | Na nás; WEB-003, WEB-004 | Konkrétní návrh s pořadím sekcí, CTA a mobilním ořezem fotografie; společný design systém |
| WEB-008 | Navrhnout Chci se stát partnerem (W03) | Čeká | Na nás; WEB-006, společné prvky WEB-007 | Krátká srozumitelná nabídka s postupně dostupnými detaily a kontaktem |
| WEB-009 | Navrhnout stránku jezdce a šablony ostatních stránek | Čeká | Na nás; WEB-004, WEB-007 | Čitelné praktické informace, program, dokumenty, archiv a navigace; bez prázdných budoucích modulů |
| WEB-010 | Zapracovat připomínky a uzavřít návrh první verze | Čeká | Na nás + zadavatel; WEB-007 až WEB-009 | Zapsané připomínky vyřešené a odsouhlasené předlohy pro implementaci |

## C. Funkční web v sandboxu — první verze

| ID | Úkol / vazba | Stav | Kdo / závislost | Hotovo znamená |
| --- | --- | --- | --- | --- |
| WEB-011 | Založit reprodukovatelné lokální prostředí a neveřejný staging | Čeká | Na nás; WEB-001, WEB-002 | Fungující oddělená prostředí, návod spuštění, testovací data a žádné ostré rozesílání |
| WEB-012 | Implementovat společné komponenty a redakční správu | Čeká | Na nás; WEB-004, WEB-010, WEB-011 | Hlavička, patička, styly a dohodnuté obsahové typy; editor upraví obsah bez zásahu do kódu |
| WEB-013 | Sestavit a naplnit stránky CZ/EN | Čeká | Na nás + zadavatel; WEB-005, WEB-006, WEB-012 | Kompletní dohodnuté stránky, média a partnerství, skutečné texty místo pracovních zástupných údajů |
| WEB-014 | Dokončit kontakty, odkazy a nastavení publikace | Čeká | Na nás; WEB-013 | Ověřené kontaktní formuláře a doručení, jazykové odkazy, vstup do Shoptetu, metadata a archiv |
| WEB-015 | Společně odladit náhled a administraci | Čeká | Na nás + zadavatel; WEB-013, WEB-014 | Připomínky vypořádané; zadavatel zvládne upravit program, text a partnera |

## D. Kontrola a první spuštění

| ID | Úkol | Stav | Kdo / závislost | Hotovo znamená |
| --- | --- | --- | --- | --- |
| WEB-016 | Přejímka první verze | Čeká | Na nás; WEB-015 | Kontrola obsahu, mobilů, CZ/EN, odkazů, přístupnosti a výkonu podle kapitoly 10 zadání; závažné chyby opravené |
| WEB-017 | Zkušební migrace a návrat | Čeká | Na nás; WEB-011 a dokončená kandidátní verze | Ověřený přenos kódu, obsahu a médií, přesměrování, záloha a použitelný postup návratu |
| WEB-018 | Připravit finální verzi a termín přepnutí | Čeká | Na nás + zadavatel; WEB-016, WEB-017 | Schválená konkrétní verze, finální obsah a domluvené přepnutí |
| WEB-019 | Nasadit a ověřit ostrý web | Čeká | Na nás; WEB-018 | Ověřené HTTPS, stránky, média, kontakty, přesměrování a indexace; zachovaný e-shop a pošta |
| WEB-020 | Předat stručný návod a zapsat první provozní poznatky | Čeká | Na nás + zadavatel; WEB-019 | Návod k redakci a aktualizacím; nové potřeby zařazené do zásobníku |

Mapa, vlastní registrace, live ani interní aplikace nejsou závislostí WEB-019.

## E. Zásobník po spuštění — bez závazného pořadí

| ID | Nápad / oblast | Stav | Co vyjasnit před zahájením |
| --- | --- | --- | --- |
| WEB-101 | Interaktivní mapa trati (W04) | Odloženo | Potvrzená trasa, body zájmu, přístupy a jednoduché náhradní zobrazení |
| WEB-102 | 3D trať a překážky (W04) | Odloženo | Dostupnost modelů, licence, lehký webový export, přínos oproti 2D |
| WEB-103 | Vlastní registrace, platby a prezence (W06) | Odloženo | Rozhodnutí o převodu, pravidla, brána, provoz a jeden společný základ s interní aplikací |
| WEB-104 | Live výsledky a mezičasy (W05) | Odloženo | Rozhraní časomíry, pravidla dat, aktualizace a výpadkové stavy |
| WEB-105 | Livestream a společné live centrum (W05) | Odloženo | Poskytovatel, dostupnost, možnost vložení a náhradní odkaz |
| WEB-106 | Další motion a interaktivní obsah partnerství | Odloženo | Konkrétní obsahový přínos, vhodná média a výkon; běžné stavy komponent patří už do V1 |
| WEB-107 | Návaznost interní aplikace | Odloženo | Samostatné zadání pro brigádníky, finance a organizaci; web řeší pouze potřebné propojení |
| WEB-108 | Samostatná revize e-shopu | Odloženo | Vlastní rozsah projektu Shoptetu, soulad s merchem; V1 webu obsahuje pouze dohodnuté odkazy |

Nový nápad přidat s dalším stabilním ID, stručným přínosem a závislostmi. Prioritu stanovit při výběru další práce po spuštění, ne podle pořadí čísel.

## F. Dokončené přípravné práce

| Výstup | Stav | Doklad |
| --- | --- | --- |
| Obsahová a vizuální revize v popsaném rozsahu | Hotovo — 28. 9. 2026 | [Revize](REVIZE_2026-09-28.md) |
| Složka web, zadání a rozcestník podkladů | Hotovo — 28. 9. 2026 | [README](README.md), [ZADANI](ZADANI.md), [ODKAZY](ODKAZY.md) |
| Oddělení prvního spuštění od následných rozšíření | Hotovo — 28. 9. 2026 | ZADANI.md, kapitola 10 |
| Založení pracovní fronty a zásobníku | Hotovo — 28. 9. 2026 | Tento dokument |

Dokončená příprava neznamená hotový návrh obrazovek, implementaci ani nasazení.
