# Úkoly a zásobník — web SVDT 2027

Aktualizováno 16. 11. 2026. Pracovní fronta navazující na [ZADANI.md](ZADANI.md). Postup: **základ → návrh → funkční web → kontrola a spuštění → rozšíření**.

## Jak tento seznam používat

- ZADANI.md určuje požadavky, rozsah a rozhodnutí. Zde vedeme konkrétní práci, její pořadí, závislosti a dokončení. Při změně rozsahu aktualizovat nejprve zadání a následně odpovídající úkol.
- Stavy: **Připraveno**, **Čeká**, **Probíhá**, **Hotovo**, **Odloženo**. Čeká znamená konkrétní nesplněnou závislost; Odloženo označuje práci mimo první vydání.
- ID úkolu se nemění. Při dokončení připsat datum a odkaz na výstup nebo záznam ověření. Samotné napsání zadání neznamená dokončenou funkci.
- „Na nás“ označuje přípravu a realizaci v tomto projektu; „zadavatel“ dodává podklady a rozhodnutí. Konkrétní další osoby zatím nejsou přiřazené.
- Vždy vybrat jeden hlavní rozpracovaný krok; další rozpracované přípravné body uvést jako související. Nezávislé podklady lze sbírat průběžně.
- Nové nápady zapisovat do zásobníku dole. Do první verze je nepřidávat automaticky.
- Termíny doplníme po rozhodnutí o platformě a dostupnosti podkladů. Tento seznam neslibuje konkrétní datum spuštění.

## Nejbližší postup

1. **WEB-007 — hlavní krok:** opravit druhé kolo homepage podle [aktuálního zadání](ZADANI.md#nejbližší-návrhové-kolo): ořez fotografie „Přijdu fandit“, délku mobilních karet/mezer/patičky, nadbytečné popisky, odkaz na program, partnerský blok při vyšším počtu log a interní placeholdery.
2. **WEB-008/WEB-009:** po opravách navrhnout Pro jezdce (včetně pracovní EN varianty), Pro diváky a Partnerství. Desktop 1440 / mobil 390 px, kontrola 360/768/1024 px; společné komponenty a jeden propojený prototyp.
3. **WEB-010:** získat odkaz nebo zdrojový export prototypu, provést funkční kontrolu a zapracovat připomínky. Teprve potom odvodit zbývající šablony podle WEB-009 a uzavřít celé návrhové vydání.
4. **Souběžně WEB-003 až WEB-006:** úplná inventura WordPressu/médií, finální obsah 2027, jazykové rozhodnutí, autorské kredity, partnerská čísla/ceny a potvrzená loga. Chybějící fakta nepředkládat jako schválená.
5. **Souběžně WEB-001/WEB-002:** dokončit možnosti stagingu, databázi, velikost SVDT, zálohu/obnovu a způsob nasazení. Parametry hostingu uvedené níže jsou historické doklady ze září, nikoli nové provozní ověření.

**Doložený stav:** existují screenshoty druhého kola homepage včetně celé mobilní a desktopové stránky a koláže šířek. Vizuální kontrola proběhla 16. 11. 2026; klikatelnost, klávesnice, přesný kontrast ani reduced motion nebyly ověřené. Doklady a hranice kontroly jsou v [ZADANI.md](ZADANI.md#stav-vizuálního-návrhu--16-11-2026). Finální schválení návrhu není zaznamenáno. Implementace WordPressu a nasazení nejsou doložené.

## A. Základ a rozhodnutí — první verze

| ID | Úkol / vazba | Stav | Kdo / závislost | Hotovo znamená |
| --- | --- | --- | --- | --- |
| WEB-001 | Ověřit hosting, doménu, zálohy a možnost stagingu | Probíhá | Active24 Smart doložen screenshoty 28. 9. 2026; PHP 7.4 potvrzeno, WordPress 6.9.9 dle zadavatele; PHP 8.2–8.5 dostupné; na nás: velikost SVDT, databáze, oddělený náhled a jeho PHP, skutečný přenos a obnova | Zapsané možnosti hostingu a návrh odděleného náhledu bez zásahu do produkce |
| WEB-002 | Potvrdit CMS, architekturu a způsob nasazení | Probíhá | CMS a provedení potvrzené 28. 9. 2026: WordPress + samostatná bloková šablona bez Divi/child theme a funkční plugin; na nás: dopracovat prostředí a nasazení podle WEB-001 | Volba CMS je zapsaná; dokončení vyžaduje také konkrétní postup prostředí a vydání |
| WEB-003 | Inventura stránek, adres a podkladů; rozsah V1 (W01) | Probíhá | [Pracovní inventura](STRUKTURA_V1.md) hotová 28. 9. 2026; zbývá úplný export stránek, jazyků a médií | Seznam ponechat / přepsat / archivovat / přesměrovat a konkrétní seznam stránek první verze |
| WEB-004 | Navigace, CZ/EN a redakční obsahový model (W01) | Probíhá | [Návrh v1](STRUKTURA_V1.md) připraven 28. 9. 2026; na nás + zadavatel: připomínky a dokončení návaznosti na inventuru | Mapa stránek, jazykový postup, správa ročníku/programu/partnerů a hranice vůči interní aplikaci |
| WEB-005 | Shromáždit a ověřit obsah 2027 | Probíhá | 16. 11. 2026 připraveno logo a ZIP 13 webových fotografií; zadavatel + na nás: potvrzení obsahu 2027, autoři/ročníky snímků a práva | Evidence zdrojů, chybějících údajů, práv k médiím a odpovědností; neznámé údaje označené, nikoli domyšlené |
| WEB-006 | Vyřešit obsah partnerské nabídky (W03) | Připraveno | Na nás + zadavatel | Sjednocené balíčky/ceny z Canvy, vysvětlené metriky a období, kontaktní cesta; neověřená tvrzení se nepublikují |

WEB-005 a WEB-006 lze připravovat při práci na struktuře. Pro první návrhy mohou být chybějící podklady označené; před veřejným spuštěním musí být nahrazené nebo odpovídající obsah vynechaný.

### Průběžná údržba současného webu

- **WEB-021 — Posoudit přechod současného webu z PHP 7.4. Stav: Čeká.** Na nás: inventura Divi/pluginů, záloha a test kompatibility na kopii; závisí na dostupném přístupu a testovacím prostředí. Výsledek: ověřený postup aktualizace nebo konkrétní seznam překážek. Produkční přepnutí provést až po testu a dohodě o nasazení. Nejde o nové rozšíření etapy 4 ani o důvod odkládat návrh nového webu.

## B. Návrh — první verze

| ID | Úkol / vazba | Stav | Kdo / závislost | Hotovo znamená |
| --- | --- | --- | --- | --- |
| WEB-007 | Navrhnout homepage pro mobil i desktop (W02) | Probíhá | Druhé kolo screenshotů posouzeno 16. 11. 2026; opravy dle ZADANI.md, kapitola 3. Vizuální směr zachovat; finální přejímka zbývá | Konkrétní návrh s pořadím sekcí, CTA a mobilním ořezem fotografie; společný design systém |
| WEB-008 | Navrhnout Chci se stát partnerem (W03) | Čeká | Navazující prompt připraven 16. 11. 2026; následuje po opravách WEB-007. WEB-006 určuje ověřený obsah; neznámé ceny/metriky vynechat | Krátká srozumitelná nabídka s postupně dostupnými detaily a kontaktem |
| WEB-009 | Navrhnout Pro jezdce, Pro diváky a šablony ostatních stránek | Čeká | Zadání připraveno 16. 11. 2026; po opravách WEB-007 první dvojice stránek včetně pracovní EN jezdecké varianty. Ostatní šablony až po připomínkách k hlavním stránkám | Čitelné praktické informace, program, dokumenty, archiv a navigace; bez prázdných budoucích modulů |
| WEB-010 | Zapracovat připomínky a uzavřít návrh první verze | Čeká | Na nás + zadavatel; WEB-007 až WEB-009, odkaz/export propojeného prototypu. Ověřit menu, odkazy, focus, klávesnici, kontrast a reduced motion | Zapsané připomínky vyřešené a odsouhlasené předlohy pro implementaci |

### Dokončení navazujících šablon (součást WEB-009)

Po připomínkách ke stránkám Pro jezdce / Pro diváky / Partnerství dopracovat Program, Dětský závod, Partnery, Výsledky, Fotogalerii, Kontakty, Archiv a detail ročníku; detail afterparty podle inventury. V nejbližším kole pouze přehled jejich společných komponent. Pořadí podrobně viz ZADANI.md, kapitola 3. Nové ID nejsou nutné: jde o rozpracování existujícího WEB-009, ne rozšíření V1.

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
| Pracovní návrh struktury V1 a známých URL | Hotovo — návrh 28. 9. 2026; schválení a úplná inventura zbývají | [STRUKTURA_V1.md](STRUKTURA_V1.md) |
| Předávací zadání vizuálního návrhu pro Claude Design | Hotovo — původní zadání 28. 9. 2026; návrh mezitím dospěl do druhého kola | [VIZUALNI_NAVRH.md](VIZUALNI_NAVRH.md) |
| Předávací ZIP design systému, dokumentů a skutečného loga | Hotovo — 16. 11. 2026 | Předáno v chatu; ZIPy nejsou součástí Gitu |
| Balíček 13 fotografických podkladů ze současného webu | Hotovo — 16. 11. 2026; kredity/ročníky zbývají | ZIP v chatu, hlavní svdt-hero.jpg 1440 × 960 px; ZADANI.md, kapitola 3 |
| Vizuální kontrola druhého kola homepage | Hotovo — kontrola 16. 11. 2026; opravy a funkční přejímka zbývají | Tři screenshoty zadavatele identifikované v ZADANI.md; WEB-007 zůstává Probíhá |
| Zadání dalšího kola pro Claude Design | Hotovo — 16. 11. 2026; realizace návrhů zbývá | ZADANI.md: opravy homepage, tři hlavní stránky, následně ostatní šablony |
| Založení pracovní fronty a zásobníku | Hotovo — 28. 9. 2026 | Tento dokument |

Dokončená příprava a vizuální kontrola screenshotů neznamenají schválený návrh celého webu, ověřený funkční prototyp, implementaci ani nasazení.
