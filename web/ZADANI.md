# Zadání — web SVDT 2027

Pracovní základ pro úpravy svdtpribram.cz. Založeno 28. 9. 2026 podle požadavků zadavatele, [revize webu](REVIZE_2026-09-28.md) a aktuálního repozitáře. Tento dokument je zdrojem požadavků, rozsahu a rozhodnutí webového projektu; audit uchovává výchozí zjištění. Konkrétní pořadí práce, závislosti a stav jednotlivých úkolů vede [UKOLY.md](UKOLY.md).

## 1. Stav a způsob doplňování

Stejný způsob evidence jako v `DT-grafika-TV/ZADANI.md`:

- Potvrzené informace zapisovat jako fakta se značkou ✔ a datem.
- **K doplnění**, **K potvrzení** a **Rozpracováno** doplnit stranou `(čeká: zadavatel / na nás / časomíra / režie)` a konkrétní chybějící informací.
- **Návrh k rozhodnutí** není schválený rozsah ani závazek dodat funkci.
- Datum odeslání dotazu zapsat pouze tehdy, když byl skutečně odeslán.
- Změny rozhodnutí připsat do záznamu na konci; neplatný požadavek označit jako nahrazený.
- Hotový dokument, prototyp, otestovaná funkce a nasazení jsou různé stavy.
- Pracovní frontu a zásobník vést v [UKOLY.md](UKOLY.md). Změny rozsahu a rozhodnutí zapisovat sem; dokončení konkrétní práce s datem a dokladem do úkolů. Souhrnný stav částí v kapitole 5 aktualizovat při dosažení milníku.

## 2. Potvrzený rámec

- Současný hosting: **Active24 Smart s rozšířením kapacity**, podle screenshotů administrace dodaných zadavatelem. Základní parametry doložené níže; konkrétní serverové nastavení a funkčnost nástrojů dosud neověřené. ✔ 28. 9. 2026
- Nový web vzniká odděleně v lokálním/testovacím prostředí; cílem je přenos kompletní ověřené verze na ostrou doménu. ✔ 28. 9. 2026
- Pořadí realizace: **nejprve odladit kroky 1–3 a spustit základní web; mapu, registrace, live a další rozšíření řešit následně**. ✔ 28. 9. 2026
- Projekt webu má vlastní složku `web/` v tomto repozitáři a respektuje jeho ostatní části. ✔ 28. 9. 2026
- Současný web je postavený na **WordPressu + Divi**. Nový web: **WordPress s vlastní šablonou a redakčními bloky, bez Divi**, potvrzeno zadavatelem. ✔ 28. 9. 2026
- Zachovat vizuální identitu a dodržovat společný [design systém](../design-system/readme.md). ✔ 28. 9. 2026
- Cílem je přehlednost, modernost a jednodušší orientace; důležitou cílovou skupinou jsou noví zahraniční riders. ✔ 28. 9. 2026
- Připravit sekci **Chci se stát partnerem** z aktuální Canva prezentace, obohacenou o vhodná webová média bez zahlcení návštěvníka. ✔ 28. 9. 2026
- E-shop zůstává na **Shoptetu**; jeho přestavba a vlastní revize jsou samostatná práce. Web s návazností počítá. ✔ 28. 9. 2026
- Požadováno je posouzení interaktivní mapy, 3D překážek, motion grafiky, live výsledků, mezičasů a streamu. Dostupnost podkladů a rozsah ostré implementace ještě nejsou potvrzené.
- Vlastní registrace s kartovými platbami je **návrh k rozhodnutí** (čeká: zadavatel). Byla posouzena proveditelnost; nahrazení nazavody.cz zatím není schválené.

Z [TV zadání](../DT-grafika-TV/ZADANI.md) přebíráme referenci na 11. ročník a datum 22. 5. 2027, nikoli automaticky jeho technické požadavky, rozpočet nebo termíny realizace. Při publikaci ověřit aktuální potvrzené údaje. Starší údaje 2026 v ukázkách design systému nejsou zdrojem obsahu pro rok 2027. Status MČR, pravidla, program a partneři vyžadují potvrzení pro příslušný ročník.

### Architektura nového webu — aktuální doporučení

Po upřesnění zadavatele není cílem pouze přerovnat sekce Divi. Doporučením je znovu postavit veřejnou část webu, její strukturu a komponenty, se zachováním značky a využitelných podkladů. Zadavatel potvrdil WordPress s vlastní šablonou bez Divi. Konkrétní obsah první verze se upřesní ve struktuře; migrace ani implementace zatím neproběhly.

| Varianta | Přínos pro SVDT | Náklady a omezení | Doporučení |
| --- | --- | --- | --- |
| WordPress + vlastní šablona a bloky, bez závislosti na Divi | Známá administrace, vlastní design a strukturovaný obsah, standardní redakční nástroje | Vývoj šablony a funkcí, průběžná údržba a aktualizace | Potvrzená volba — 28. 9. 2026 |
| WordPress jako obsahový systém + oddělený web | Zachová redakci a umožní samostatnou aplikaci | Dva propojené celky; náhledy, publikování, cache a přihlášení vyžadují další práci | Pouze pokud oddělení přinese konkrétní výhodu |
| Payload + vlastní web | Přizpůsobitelná administrace, strukturovaná data a aplikace ve společném technologickém základu | Nové prostředí, migrace a větší závislost na vývojáři | Relevantní alternativa při dlouhodobém rozvoji závodního portálu |
| Vlastní CMS od nuly | Úplná kontrola | Vývoj médií, oprávnění, verzování, publikování a dalších základních funkcí navíc | Nedoporučeno pro současný rozsah |

Srovnání uchovává posouzené alternativy; volba WordPressu s vlastní šablonou je již potvrzená. Interaktivní 3D ani live výsledky samy o sobě nevyžadují odchod z WordPressu. Registrace bude mít oddělenou doménovou logiku a správu stavů bez ohledu na CMS; běžný obsahový editor nenahrazuje transakční systém.

Administrace má spravovat ročníky, program, místa trati, partnery, média a překlady přes pojmenovaná pole a připravené komponenty. Běžný editor má měnit datum nebo partnera jednou, bez zásahu do kódu a bez možnosti náhodně rozbít design. Požadovány jsou role, náhled před publikací a dohledatelné změny. Přesný rozsah správy registrací a prezence závisí na rozhodnutí o W06.

Při přestavbě zachovat použitelné texty, fotografie, historii a pokud možno adresy. Změněné adresy dostanou přesměrování; starý web zůstane v provozu do ověření nové verze. Inventura musí odhalit obsah svázaný s Divi, který bude nutné převést. Ověřit administraci, správu CZ/EN, hosting a provozní odpovědnost před definitivním výběrem platformy.

Podklady pro srovnání: [WordPress — vlastní bloky](https://developer.wordpress.org/block-editor/), [WordPress REST API](https://developer.wordpress.org/rest-api/), [Payload — přehled](https://payloadcms.com/docs/getting-started/what-is-payload). Posouzeno 28. 9. 2026.

## 3. Pravidla společného designu a návazností

- Základem je kořenový `design-system/`, jeho tokeny, komponenty a webový UI kit. Nevytvářet nezávislou kopii systému v `web/`.
- Exo, výrazné verzálkové nadpisy, tabulární číslice; rozlišovat brand červenou `#E30613` a akcentní `#FF1A1A` podle jejich určení. Použít skutečné dodané logo, ne rekonstruovanou náhradu z ukázky.
- Respektovat pravidla komponent, kontrast, překrytí fotografie, mezery, rádiusy a omezený pohyb. Běžné dekorativní stíny nepřidávat. Reduced motion musí být součástí návrhu.
- React ukázky z UI kitu jsou vizuální reference; samy o sobě nevyžadují změnu WordPressu ani přepis do Reactu. Styl převést do opakovaně použitelných komponent zvolené platformy.
- Samostatné CZ/EN stránky jsou **návrh k rozhodnutí** (čeká: zadavatel): odchylka od vzoru menšího EN překladu pod CZ textem v design systému. Zapsat rozhodnutí před realizací; vizuální pravidla tím neměnit.
- 3D a datové vizualizace jsou funkční rozšíření nad fotografický vizuální základ. Jejich styl vyřešit v dílčím zadání; nepřenášet automaticky televizní žlutou trať, TV rozměry nebo broadcast animace do webového rozhraní.
- Broadcast zůstává samostatný provozní systém. Web může čerpat schválený veřejný datový výstup; nemá poskytovat veřejný přístup k řízení režie.
- Město a modely překážek znovu použít, pokud to formát a licence dovolí. Webový export musí mít vlastní optimalizaci a jednoduchou náhradní mapu.
- Při rozporu podkladů uvést konkrétní konflikt a zdroj rozhodnutí. Neměnit potichu společný design systém ani zadání jiného projektu.

## 4. Obsah a struktura — návrh k rozhodnutí

Navrhovaná navigace: **Pro diváky / Pro jezdce / Trať / Live / Partnerství**, doplněná o Shop a CZ/EN. Afterparty patří do programu, archiv a média mají dostupné sekundární odkazy. Přesné názvy a pořadí se potvrdí při návrhu struktury.

Homepage má vést k rozhodnutí, nikoli opakovat všechny podstránky:

1. Datum, místo, krátká hodnota akce a hlavní akce podle fáze ročníku.
2. Stručné představení s jedním hlavním videem nebo fotografií.
3. Rozcestí divák / jezdec a několik jasně definovaných údajů.
4. Výběr programu a náhled trati s odkazem na podrobnosti.
5. Přiměřená prezentace partnerů, pozvánka k partnerství a případný merch.
6. Praktické kontakty a odkazy.

Rozlišit fáze pozvánka → registrace → závodní den → výsledky/archiv. Jedna redakčně spravovaná hodnota data, kapacity a programu se promítá do souvisejících míst; archiv nesmí přepsat změna nového ročníku.

## 5. Části projektu a aktuální stav

| ID | Část | Cílový výsledek | Stav / návaznost |
| --- | --- | --- | --- |
| W01 | Struktura a obsah | Mapa stránek, pořadí sekcí, CZ/EN cesta, jednotné údaje | Revize hotová; návrh struktury k rozhodnutí |
| W02 | Nová veřejná část a mobilní vzhled | Opakovatelné styly, správný hero výřez, kratší homepage, čitelný program | Vizuální audit hotový v uvedeném rozsahu; nastavení administrace neprověřeno |
| W03 | Partnerství | Stručná nabídka, doložená čísla, ukázky plnění, kontakt | Požadavek potvrzen; obsah a ceny k upřesnění |
| W04 | Trať a překážky | Použitelná mapa, body zájmu, volitelné 3D | Návrh; závisí na trase, modelech a webovém exportu |
| W05 | Live centrum | Stream, výsledky, mezičasy, stav aktuálnosti a výpadku | Návrh; závisí na časomíře a poskytovateli přenosu |
| W06 | Registrace a platby | CZ/EN přihláška, kapacita, platba, správa a prezence | Posouzena proveditelnost; realizace k rozhodnutí |
| W07 | Návaznost e-shopu | Jednotný vstup do Shoptetu a vizuální návaznost | Rozsah hlavního webu; vlastní revize obchodu později |

Dílčí složky zakládat až při zahájení práce. Tabulka nepředstírá existenci implementace.

## 6. Prioritní zásahy z vizuálního auditu

- Opravit mobilní ořez hero fotografie a nadbytečné svislé mezery.
- Zkrátit homepage: odstranit opakování a zmenšit partnerský blok při dodržení smluvené viditelnosti.
- Dokončit EN obsah včetně CTA, programu, obrázkových podkladů a navazujících kroků.
- Nahradit obrázkový program skutečným textem; mapu umožnit zvětšit, důležité pokyny zpřístupnit i bez mapy.
- Zjednodušit hierarchii tlačítek a doplnit kotvy na dlouhé stránce jezdce.
- Sjednotit karty a ověřit kontrast časů ve výsledcích.

Podrobnosti, rozměry a hranice ověření jsou v kapitole 17 auditu. Nejde o změřené Core Web Vitals ani úplný audit přístupnosti.

## 7. Partnerství

Návštěvník má rychle pochopit akci, publikum, přínos spolupráce a další krok. Z prezentace vytvořit webový příběh, nikoli vložených 18 slidů. Základ: stručný úvod → nejvýše několik doložených metrik → ukázky plnění → možnosti spolupráce → kontaktní výzva. Detaily rozbalovat nebo přesunout níže.

- Ceny a rozsah balíčků: **K potvrzení** (čeká: zadavatel) — audit našel odlišné částky v souhrnu a detailech V4.
- Metriky a jejich období: **K doplnění** (čeká: zadavatel) — oddělit dosah, zobrazení a zhlédnutí konkrétního videa.
- Fotky, videa, práva a ukázky aktivací: **K doplnění** (čeká: zadavatel).
- Kontaktní formulář, příjemce a potvrzení odeslání: **K doplnění** (čeká: zadavatel).

## 8. Mapa, motion a live

Nejprve čitelná 2D mapa a seznam bodů; volitelné 3D spouštět až na vyžádání. Program, registrace ani navigace nesmějí vyžadovat načtení 3D. Pohyb má vysvětlovat trať nebo plnění pro partnera; nesmí blokovat scrollování a čtení.

- Trasa 2027, body, uzavírky a bezpečné divácké přístupy: **K doplnění** (čeká: zadavatel).
- Modely a formát lehkého webového exportu: **K doplnění** (čeká: na nás) — navázat na [3D zadání](../DT-grafika-TV/3D/zadani.md).
- Veřejné rozhraní časomíry, identifikátory, frekvence, opravy a stavy DNF/DNS/DSQ: **K doplnění** (čeká: časomíra).
- Dostupnost a význam splitů: **K potvrzení** (čeká: časomíra) — počet a umístění neurčuje vzhled současné grafické komponenty.
- Stream, poskytovatel, možnost vložení a záložní odkaz: **K potvrzení** (čeká: režie).

Live musí rozlišit čekání, vysílání, přerušení, nedostupná/zastaralá data a konečné výsledky. Ukázková data nikdy neprezentovat jako živá. Veřejná návštěvnost nesmí zatěžovat řídicí systém přenosu.

## 9. Vlastní registrace — návrh k rozhodnutí

Zvolená webová platforma může tvořit uživatelské rozhraní; transakční logika potřebuje udržovanou funkční část a ověřenou platební bránu. Data karty nemá zpracovávat vlastní formulář. Výběr brány, pluginu nebo vlastního řešení následuje po potvrzení rozsahu.

Minimální návrh zahrnuje dočasnou rezervaci kapacity, kategorie a věková pravidla, jezdce odlišného od plátce/rodiče, ověřenou zprávu brány, potvrzovací e-mail, správu přihlášky, storno, export časomíře a prezenci. Zaplacení, splnění podmínek účasti a přítomnost na prezenci jsou různé stavy.

- Převod z nazavody.cz pro 2027: **K rozhodnutí** (čeká: zadavatel).
- Kategorie, kapacity, startovné, licence, nezletilí a storna: **K potvrzení** (čeká: zadavatel).
- Brána, měna, poplatky, účetní návaznost a provozní odpovědnost: **K doplnění** (čeká: zadavatel).
- Technický návrh a testovací prostředí: **K doplnění** (čeká: na nás).

Před přechodem ověřit souběžné přihlášení na poslední místo, opožděnou či opakovanou zprávu brány, neúspěšnou platbu, refundaci, více dětí jednoho rodiče, export a obnovu ze zálohy. Podrobnosti obsahuje kapitola 16 auditu.

## 10. Postup a podmínky dokončení

**Potvrzené pořadí: kroky 1 → 2 → 3 → kontrola a spuštění první verze → následná rozšíření.** ✔ 28. 9. 2026

Toto rozhodnutí nahrazuje dřívější návrh zapojit mapu a integrace před prvním spuštěním. Rozšíření nejsou podmínkou dokončení základního webu. Technické rozhraní pro ně zohledníme v návrhu, jejich implementaci odložíme.

| Etapa | Výstup | Zařazení / termín |
| --- | --- | --- |
| 1. Základ a rozhodnutí | Technologie, hosting, inventura obsahu, struktura a rozsah první verze; hranice vůči interní aplikaci | První verze; přesný termín k doplnění |
| 2. Návrh | Homepage, partnerství a stránka pro jezdce; mobil i desktop, společný design systém a CZ/EN obsah | První verze; po kroku 1 |
| 3. Funkční web v sandboxu | Administrace, dohodnuté obsahové stránky, CZ/EN, program, partneři a média; průběžné připomínky a odladění | První verze; po odsouhlasení návrhu |
| Kontrola a spuštění | Finální obsah, funkční a mobilní přejímka, zkušební migrace, záloha, přepnutí domény a redakční návod | Bez čekání na etapu 4 |
| 4. Následná rozšíření | Mapa, případné 3D, vlastní registrace s platbami, live výsledky, mezičasy a stream | Až po spuštění první verze; pořadí podle priorit a připravenosti |
| Další rozvoj | Nové potřeby z provozu a návaznost interní organizační aplikace | Průběžně evidovat; nezařazovat automaticky do první verze |

### Hranice první verze

První verze je plnohodnotný obsahový web s administrací. W01–W03 tvoří její základ, W07 zahrnuje návaznost odkazem na stávající Shoptet. W04–W06 patří do následné etapy. Propojení na interní aplikaci není podmínkou spuštění.

Pokud bude v době spuštění potřeba registrace či výsledky, použít aktuální potvrzený externí odkaz. Pro rok 2027 neodkazovat automaticky na registraci 2026; dostupnost řešení pro nový ročník ověřit. Navigace nesmí vést do prázdných budoucích modulů. Existující použitelný statický podklad lze zachovat po ověření aktuálnosti, ale vývoj nové mapy první verzi neblokuje.

- Inventura současného WordPressu, převod obsahu, hosting a staging: **K doplnění** (čeká: na nás).
- Odpovědnosti za obsah, EN překlad a provoz webu: **K doplnění** (čeká: zadavatel).
- Rozpočet a data spuštění: **K potvrzení** (čeká: zadavatel). Pořadí etap je potvrzené; termíny TV projektu nejsou automaticky termíny webu.
- Konkrétní pořadí a rozsah rozšíření po spuštění: **K potvrzení** (čeká: zadavatel) — podle provozních potřeb a připravenosti podkladů.

### Přejímka podle vydání

První verze: správné údaje 2027 a oddělený archiv, průchozí CZ/EN cesty v dohodnutém rozsahu, responzivní kontrola 360/390/768/1024/1440 px, funkční odkazy a kontaktní formuláře, ověřená redakční správa, klávesnice a reduced motion, kontrast a měření výkonu. Před nasazením ověřit zálohu, migraci a postup návratu.

Následná vydání přidají vlastní přejímku podle funkce: náhradní zobrazení mapy, dostupnost a stáří live dat, případně transakční scénáře registrací a plateb. Tyto testy nejsou podmínkou první verze, která příslušné funkce neobsahuje.

Nejbližší práce: upřesnění redakční správy, inventura obsahu a návrh konkrétního pořadí homepage s vazbou na W01–W03. Nové nápady zapisovat do následného rozvoje; změnu rozsahu první verze výslovně zaznamenat.

## 11. Vývoj, neveřejný náhled a nasazení

Potvrzený směr: vývoj mimo ostrý web. Následující provedení je doporučený postup pro preferovanou variantu WordPress; konečné nástroje závisejí na volbě platformy a možnostech hostingu. Žádné prostředí ani automatické nasazování zatím nebylo vytvořeno.

### Tři oddělená prostředí

| Prostředí | Účel | Data a integrace |
| --- | --- | --- |
| Lokální vývoj | Tvorba šablony, bloků, administrace a funkcí | Fiktivní data, zachytávání e-mailů, testovací platby |
| Neveřejný staging | Sdílený náhled, redakční plnění, kontrola na telefonu a zkouška nasazení | Samostatná databáze, přístup chráněný přihlášením, noindex jako doplněk; oddělené testovací klíče |
| Produkce | Veřejný web na svdtpribram.cz | Schválený obsah, produkční služby a skutečné přihlášky |

Lokální WordPress navrhuji spouštět v reprodukovatelném prostředí, například přes wp-env/Docker; před zavedením ověřit dostupnost nástroje a sladit verze WordPressu, PHP a databáze s cílovým hostingem. Sdílený staging umístit pokud možno na stejný typ hostingu jako produkci. Ukázková subdoména typu preview.svdtpribram.cz je jen návrh, nikoli založená adresa.

Staging nesmí používat produkční databázi, rozesílat e-maily jezdcům ani přijímat ostré platby. Webhooky platební brány ověřovat na dostupné HTTPS testovací adrese; veřejná výjimka pro callback musí být omezená a zprávy ověřené. Samotný noindex není ochrana přístupu.

### Upřesnění pro Active24

Podklady doplněny 28. 9. 2026: screenshoty administrace poskytnuté zadavatelem. Jde o doložené údaje rozhraní, nikoli provedenou provozní zkoušku. Screenshoty a fakturační údaje se do veřejného repozitáře neukládají.

- Balíček Smart s rozšířením úložné kapacity a počtu domén.
- Úložiště má omezenou rezervu pro souběh starého webu, náhledu a migračních souborů. Před vytvořením kopie zjistit velikost samotného SVDT včetně médií a databáze; nekopírovat celý multihosting.
- Rozhraní uvádí Let's Encrypt WildCard SSL, denní zálohování webu a e-mailů, PHP paměťový limit 512 MB a shell konzoli. Přítomnost funkce v přehledu není ověření vystavení certifikátu pro nový náhled, obnovy zálohy ani SSH/WP-CLI.
- Nový screenshot služeb potvrzuje pro svdtpribram.cz **Apache 2.4 / PHP 7.4**; rozhraní označuje PHP jako staré. Rozšířená podpora PHP je aktivní podle předchozího snímku, její konkrétní rozsah oprav ale nebyl ověřen. Nastavení celého multihostingu neměnit bez kontroly ostatních webů.
- Verze WordPressu **6.9.9** je údaj dodaný zadavatelem 28. 9. 2026; snímek hostingu ji nezobrazuje a nebyla nezávisle ověřena v administraci WordPressu.
- Snímek potvrzuje dostupné rozhraní WebFTP a phpMyAdmin pro MySQL/MariaDB; neprokazuje konkrétní verzi databáze ani kvótu pro novou databázi.
- Nové prostředí nestavět na PHP 7.4. Pro potvrzený WordPress zvolit podporovanou verzi dostupnou na hostingu a ověřenou s novou šablonou a pluginy; nově doporučujeme PHP 8.5, případně PHP 8.4 při doložené nekompatibilitě potřebné závislosti. WordPress doporučuje PHP 8.3+, MariaDB 10.11+ nebo MySQL 8.0+. Nabídka hostingu je již doložená; konkrétní cílovou verzi uzavřít po kontrole kompatibility zvolených závislostí. Zdroje: [WordPress requirements](https://wordpress.org/about/requirements/), [podpora PHP](https://www.php.net/supported-versions.php), ověřeno 28. 9. 2026.
- Přechod současného Divi webu na nové PHP posoudit odděleně na kopii, s inventurou pluginů a možností návratu; nepřepínat produkci naslepo. Založení nového sandboxu není dokončením údržby starého webu.
- Graf CPU za zobrazené období ukazuje nízké využití, ale nepotvrzuje výkon při závodní špičce ani parametry budoucího webu.
- Screenshot nabídky z 28. 9. 2026 potvrzuje Apache 2.4 s PHP **8.5, 8.4, 8.3 a 8.2**, vedle starších 7.4, 7.2 a 5.6. Zaškrtnutá je stále 7.4; zvýrazněný řádek 8.2 není důkaz uložené změny. Doporučený základ nového sandboxu je po ověření podpory WordPressu PHP 8.5; dostupnost verze neprokazuje kompatibilitu současného Divi webu. Rozhraní zmiňuje možnost testu kompatibility, ten zatím nebyl proveden.
- Zbývá ověřit: možnost odděleného nastavení PHP náhledu, verzi databáze pro SVDT, možnost nové samostatné databáze a náhledu, pravidla započítávání subdomén, skutečný způsob přenosu/nasazení, rozsah záloh včetně databáze, dobu uchování a postup obnovy.



Pro první verzi zatím neplánovat stěhování hostingu. Doporučený směr je lokální vývoj a oddělený náhled na Active24 s vlastní databází; proveditelnost konkrétního umístění potvrdit v účtu před založením. Oficiální dokumentace popisuje [subdomény](https://www.active24.cz/centrum-napovedy/vytvareni-subdomen) i [oddělené subservery multihostingu](https://faq.active24.com/cz/090035-Multihosting---spr%C3%A1va-multihostingov%C3%BDch-bal%C3%AD%C4%8Dk%C5%AF), ale postup závisí na platformě účtu. Parametry dnešní nabídky nelze automaticky přisoudit staršímu tarifu.

Název tarifu sám o sobě nepotvrzuje SSH, automatické nasazování ani podporu běžící Node.js aplikace. Budoucí interní aplikace může mít jiný hosting při zachování subdomény aplikace.svdtpribram.cz. Toto rozhodnutí nebrání přípravě obsahového webu.

### Vlastní šablona a funkční plugin

Potvrzený směr je vlastní WordPress šablona bez Divi. Potvrzené provedení: **samostatná bloková šablona SVDT bez rodičovské šablony a oddělený funkční plugin pro správu obsahu**. Zadavatel přijal navržené řešení. ✔ 28. 9. 2026 Child theme dává smysl při přizpůsobování konkrétní existující šablony; pro vlastní vzhled odvozený ze společného design systému zatím nemáme důvod zavádět další rodičovskou závislost. Viz [WordPress — child themes](https://developer.wordpress.org/themes/advanced-topics/child-themes/).

- **Šablona SVDT:** vzhled, rozložení, hlavička/patička, šablony stránek a styly podle společného design systému; přednastavené vzory bloků pro redakci.
- **Funkční plugin SVDT:** obsahové typy a pole pro ročníky, partnery a program, potřebné vlastní bloky a související logika. Údaje nemají zmizet ze správy při změně vzhledu.
- **Editor:** standardní blokový editor WordPressu s připravenými komponentami a přiměřeně uzamčeným rozložením. Vlastní blok vyvíjet pouze tam, kde nestačí standardní bloky a vzory.
- **Údržba:** zdroje a vydání vlastní šablony/pluginu v Gitu. Aktualizace jádra WordPressu jejich soubory běžně nepřepisuje, ale kompatibilitu musíme testovat a vlastní kód udržovat. Změny přímo v produkčních souborech by další nasazení přepsalo, proto patří do zdrojů.
- **Přenos:** šablona a plugin mohou mít instalační ZIP balíčky; kompletní nasazení navíc vyžaduje databázi, média a konfiguraci podle této kapitoly. Rozlišovat šablony uložené v kódu od redakčních úprav uložených v databázi, které je mohou překrýt.

Názvy balíčků a jejich strukturu upřesní implementace; zatím nebyly vytvořeny. Budoucí transakční registrace a interní aplikace zůstávají v následné etapě.

### Co se bude skutečně vyvíjet

Stavět od prvních funkčních stránek vlastní šablonu a bloky v reálném WordPressu, včetně editace obsahu. Krátké vizuální studie lze dělat samostatně, ale nemají se stát celým hotovým webem, který se teprve nakonec předělává do CMS.

Ve web/ budou při zahájení implementace oddělené zdroje šablony, pluginu pro obsahové typy a případných funkčních modulů, konfigurace lokálního prostředí, sestavení, migrací a návod k nasazení. Konkrétní složky nevytvářet prázdné předem. Obsahové typy a registrace nevázat na šablonu, aby změna vzhledu neodstranila data.

### Kód, obsah a konfigurace

- Git obsahuje vlastní kód, závislosti s pevnými verzemi, bezpečné příklady konfigurace, migrační postupy a fiktivní testovací data. Společný design systém zůstává zdrojem pravidel.
- Databáze, nahrané fotografie a videa jsou samostatná data s vlastním zálohováním a přenosem. Git commit sám o sobě nepřenáší kompletní WordPress.
- Hesla, klíče, databázové exporty s osobními údaji a provozní konfigurace zůstávají mimo veřejný repozitář.
- Doména, připojení k databázi, pošta a brány se nastavují pro prostředí zvlášť. Adresu localhost ani staging nevkládat natvrdo do kódu.
- Na staging a do produkce má jít tentýž otestovaný balíček z označené verze v Gitu. Přesný způsob přenosu (nasazovací nástroj hostingu / SSH / jiný podporovaný postup) určit po kontrole hostingu; GitHub Pages není hosting PHP a databáze WordPressu.
- Automatické nasazování je budoucí možnost. Změna dokumentace v main nesmí sama přepnout veřejný web.

### První kompletní přechod

1. Sepsat obsah a adresy současného webu, vybrat zachované podklady a plán převodu obsahu svázaného s Divi. Starý web během vývoje dál funguje.
2. Nový web naplnit na stagingu a provést zkušební migraci kódu, databáze a médií do cílového prostředí. Změny adres ve WordPressu převádět nástrojem, který rozumí serializovaným datům.
3. Před přepnutím udělat úplnou zálohu starého webu, ověřit obnovu, připravit přesměrování a evidovat rozdíly obsahu vzniklé během vývoje.
4. Domluvit krátké uzavření redakčních změn a případných zápisů, přenést finální rozdíly a ověřit novou instalaci. Pokud již běží registrace, připravit samostatný převod a párování rozpracovaných plateb; databázi nelze prostě nahradit starší kopií.
5. Po schválení konkrétní připravené verze přepnout web na hlavní doméně. Způsob přepnutí závisí na hostingu: změna cílové složky/instalace nebo DNS při stěhování serveru. E-shop na Shoptetu a poštovní DNS záznamy zachovat.
6. Ověřit HTTPS, CZ/EN adresy, média, přesměrování, formuláře, doručování pošty, cache, indexaci a případné produkční platební napojení. Testovací ochranu odstranit pouze z produkce; staging zůstává neveřejný.

Doba přepnutí a případný výpadek se určí až po zkušební migraci; neslibovat bezvýpadkové nasazení bez ověřené infrastruktury.

### Další aktualizace a návrat

Po spuštění je produkce zdrojem skutečných přihlášek, plateb a aktuálního redakčního obsahu. Další vydání přenášejí kód a řízené změny datové struktury, nikoli celou starší databázi ze stagingu. Obsahové změny přenášet cíleně; osobní údaje při případné kopii do testu anonymizovat.

Pro návrat uchovat předchozí balíček a předmigrační zálohu. Návrat kódu musí být slučitelný s databází. Jakmile nová verze přijme skutečné přihlášky nebo platby, prosté obnovení staré databáze by je ztratilo; nejdříve zastavit dotčené zápisy a uchovat či vypořádat nové transakce podle připraveného postupu.

### Co zjistit před založením prostředí

- Hosting: **Active24, klasický multihosting** ✔ 28. 9. 2026. Technická inventura: **Rozpracováno** (čeká: na nás) — screenshoty dokládají balíček Smart a nabídku SSL, denních záloh, 512MB PHP limitu a shell konzole; zbývající ověření jsou vypsaná v oddílu Upřesnění pro Active24. Přímý přístup ani obnova zatím nebyly ověřené.
- Platforma: **WordPress s vlastní šablonou bez Divi** ✔ 28. 9. 2026. Místní vývojový nástroj a přesný způsob nasazení: **K doplnění** (čeká: na nás).
- Kdo schvaluje obsah a má přístup do náhledu: **K doplnění** (čeká: zadavatel).
- Ověřený postup sestavení, migrace a návratu: **K doplnění** (čeká: na nás).

Technické reference: [lokální WordPress přes wp-env](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/), [oficiální postupy migrace WordPressu](https://developer.wordpress.org/advanced-administration/upgrade/migrating/). Ověřeno 28. 9. 2026.

## 12. Návaznost na interní organizační aplikaci SVDT

- Počítat se samostatnou interní aplikací pro správu brigádníků, financí a dalších organizačních agend. ✔ 28. 9. 2026
- Detailní rozsah bude mít vlastní zadání; tato kapitola určuje hranici vůči veřejnému webu. Nevytváří hotový seznam funkcí ani závazek dodat účetní systém.
- Kontext: chat „povidani SVDT 2027“. Z dostupných posledních zpráv ověřena práce na organizační hierarchii, kapacitách a otevřených rolích; kompletní dřívější diskuse o aplikaci nebyla tímto načtením dostupná. Brigádníci a finance jsou potvrzené aktuálním požadavkem zadavatele.

### Adresa a rozdělení systémů — doporučení

| Adresa | Účel | Technologie / stav |
| --- | --- | --- |
| svdtpribram.cz | Veřejná prezentace, program, partnerství, trať a vstup do registrace | CMS podle rozhodnutí v kapitole 2 |
| aplikace.svdtpribram.cz | Interní organizační aplikace, pracovní název „SVDT — organizace“ | Samostatná aplikace mimo WordPress; doporučení k potvrzení |
| eshop.svdtpribram.cz | Obchod | Shoptet podle potvrzeného rámce |

Subdoména aplikace.svdtpribram.cz je navržená, nikoli zřízená. Je srozumitelná a dostatečně obecná pro další agendy. Cesta /aplikace může později sloužit jako snadno zapamatovatelný přesměrovávací odkaz. Provoz celé aplikace pod cestou /aplikace je také možný, ale potřebuje směrování oddělené služby; pro tento projekt zatím nepřináší jasnou výhodu oproti subdoméně.

### Oddělení provozu a oprávnění

Interní aplikaci doporučujeme vyvíjet a nasazovat nezávisle na šabloně a pluginech WordPressu, s vlastní databází/přístupovými údaji, rolemi, zálohami a testovacím prostředím. Nemusí mít vlastní fyzický server, ale vyžaduje skutečné oddělení přístupů. Samotná subdoména není bezpečnostní hranice.

Účty organizačního týmu nesmějí automaticky získat oprávnění správce WordPressu. Navrhnout role podle činnosti: brigádník vidí své přidělení; vedoucí týmu přidělené lidi; finance jen oprávněné osoby. Konkrétní role, schvalování, vícefaktorové ověření privilegovaných účtů a záznam změn dopracovat v zadání aplikace. Přihlášení a cookies nesdílet plošně mezi všemi subdoménami; případné společné přihlášení řešit cíleně.

Design vychází ze společné značky, ale pracovní obrazovky potřebují čitelné formuláře, tabulky a střídmý pohyb. Marketingové efekty veřejného webu nejsou vzorem pro každodenní práci s rozpočtem.

### Sdílené údaje a registrace jezdců

Před implementací určit pro každý údaj jediný zdroj pravdy. Veřejný web spravuje publikační obsah; interní aplikace organizační agendy. Sdílet pouze potřebné údaje přes popsané rozhraní, nikoli přímým přístupem obou aplikací do všech databázových tabulek. Osobní a finanční údaje se nesmějí objevit ve veřejném výstupu či cache.

Vlastní registrace jezdců W06 musí být navržena také s ohledem na interní aplikaci. Veřejný formulář může být na hlavním webu, zatímco evidence, platby a prezence patří do společné registrační služby a jejího neveřejného rozhraní. Umístění tohoto modulu do interní aplikace nebo samostatné služby je **návrh k rozhodnutí** (čeká: na nás). Nevytvářet dvě nezávislé evidence registrací a plateb ve WordPressu a aplikaci. Brigádník, jezdec a redaktor jsou odlišné role; společný uživatelský účet není automatický požadavek.

### Další kroky a hranice tohoto projektu

- Název a finální subdoména: **K potvrzení** (čeká: zadavatel).
- Úplné zadání organizační aplikace z předchozí diskuse, rozsah financí, týmů a oprávnění: **K doplnění** (čeká: zadavatel).
- Technologie, hosting, datový model a vazba na registraci: **K doplnění** (čeká: na nás).
- Aplikace dostane vlastní projektovou složku a zadání při zahájení její přípravy; web/ zůstává pro veřejný web a jeho integrační rozhraní.
- Veřejný web lze spustit před interní aplikací. Její budoucí vznik sám o sobě není důvodem nahrazovat redakční systém vlastním CMS.

## Záznam rozhodnutí

- 28. 9. 2026: zadavatel požaduje samostatnou složku `web/`, společné zadání a respektování design systému i ostatních částí repozitáře.
- 28. 9. 2026: založeno zadání, rozcestník a odkazy; převzat audit po vizuální kontrole. Detailní návrhy auditu zůstávají návrhy, dokud nejsou potvrzené. Žádná změna veřejného webu ani přechod registrací zatím neproběhly.

- 28. 9. 2026: zadavatel upřesnil, že Divi není omezení nového řešení a administrace je nutná. Zachování WordPressu je doporučená varianta, nikoli potvrzená platforma; doplněno srovnání a návrh přestavby veřejné části.

- 28. 9. 2026: zadavatel požaduje vývoj nového webu v sandboxu/lokálně a snadný kompletní přechod na produkci. Doplněn návrh lokál → neveřejný staging → produkce, oddělení kódu a dat, první migrace, následná vydání a návrat. Prostředí zatím nezaložena.

- 28. 9. 2026: zadavatel doplnil budoucí interní aplikaci pro brigádníky, finance a organizaci. Doplněna návaznost veřejného webu, doporučení samostatné aplikace na subdoméně a společného návrhu registrací; přesná adresa a technologie zůstávají otevřené.

- 28. 9. 2026: zadavatel potvrdil nejprve odladění kroků 1–3 a spuštění základního webu. Etapa 4 (mapa a integrace) i další vzniklé potřeby následují až po spuštění. Přesunuta přejímka a nasazení před rozšíření, vymezen rozsah první verze a samostatné testy dalších vydání.

- 28. 9. 2026: na žádost zadavatele založen UKOLY.md: nejbližší postup, úkoly první verze, přejímka/nasazení a odložený zásobník. Zadání zůstává zdrojem požadavků a rozhodnutí; pracovní stav úkolů má vlastní evidenci.

- 28. 9. 2026: zadavatel uvedl Active24, klasický multihosting. Poskytovatel je známý; konkrétní funkce a kapacity zbývá ověřit. Pro první verzi zatím neplánována migrace hostingu.

- 28. 9. 2026: doplněny doložené parametry Active24 Smart ze screenshotů. Před kopírováním je nutné ověřit velikost SVDT a rezervu pro staging; WEB-001 zůstává rozpracovaný. Hosting ani jeho placené parametry nebyly změněné.

- 28. 9. 2026: ze screenshotu potvrzen Apache 2.4 / PHP 7.4 a rozhraní WebFTP/phpMyAdmin; WordPress 6.9.9 evidován jako údaj zadavatele. Nové prostředí má použít podporovanou větev PHP po ověření kompatibility a nabídky hostingu; produkční nastavení nebylo změněno.

- 28. 9. 2026: z nabídky služeb ověřena dostupnost PHP 8.2–8.5. PHP 8.4 zůstává doporučením pro nový sandbox; produkce podle snímku stále používá 7.4. Žádná změna hostingu nebyla provedena.

- 28. 9. 2026: po dotazu zadavatele ověřena aktuální oficiální podpora: WordPress 6.9 a 7.0 plně podporují PHP 8.5 ([vyjádření WordPress Core z 22. 5. 2026](https://make.wordpress.org/core/2026/05/22/php-support-clarification-2026/)). Předchozí doporučení 8.4 bylo konzervativní, bez doložené překážky pro 8.5. Nově doporučeným základem nového sandboxu je 8.5; šablonu a pluginy ověříme samostatně. Starší záznamy doporučení 8.4 jsou tímto nahrazené; produkční PHP nebylo změněno.

- 28. 9. 2026: zadavatel potvrdil WordPress s vlastní šablonou a bloky bez Divi. Doplněno doporučení samostatné blokové šablony SVDT a odděleného funkčního pluginu; child theme není pro navržené provedení potřebná. Předchozí otevřená volba CMS je tím uzavřená.

- 28. 9. 2026: zadavatel přijal navržené provedení vlastní samostatné šablony SVDT. Uzavřena volba samostatné blokové šablony bez child theme a odděleného funkčního pluginu. Další obsahový krok: WEB-003/WEB-004 — rozsah stránek, navigace a pořadí homepage; implementace následuje po návrhu podle potvrzených etap.
