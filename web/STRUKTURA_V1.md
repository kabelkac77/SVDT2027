# Struktura první verze webu SVDT 2027

Pracovní návrh v1 — 28. 9. 2026. Výstup pro WEB-003 a WEB-004, podklad pro následný vizuální návrh. Navazuje na [zadání](ZADANI.md), [audit](REVIZE_2026-09-28.md) a [úkoly](UKOLY.md). Jde o konkrétní návrh k připomínkám, nikoli schválenou grafiku či hotovou implementaci.

## 1. Hranice první verze

První vydání návštěvníkovi vysvětlí akci, pomůže naplánovat účast a umožní oslovit organizátory kvůli partnerství. Redakce spravuje obsah v potvrzeném WordPressu s vlastní šablonou a funkčním pluginem.

Součástí: homepage, informace pro diváky a jezdce, dětský závod, program, partnerství, přehled partnerů, kontakty, dostupné výsledky a fotografie minulých ročníků, CZ/EN a odkaz na Shoptet.

Po spuštění: nová interaktivní mapa, 3D, vlastní registrace a platby, live výsledky a stream. Budoucí funkce nemají prázdné položky menu. Podmínky a cizí formuláře nelze prezentovat jako hotové jen proto, že existuje návrh.

## 2. Navigace

**Desktop:** logo → Pro diváky / Pro jezdce / Program / Partnerství → Shop → CZ | EN.

Logo vede na homepage. Partnerství vede přímo na nabídku pro nové zájemce; seznam podporovatelů je propojená samostatná stránka. Shop otevírá existující Shoptet, bez druhého košíku na hlavním webu.

**Mobil:** logo, viditelné CZ | EN a tlačítko menu. V otevřeném menu stejné čtyři hlavní položky a Shop, pod nimi Dětský závod / Partneři / Výsledky / Fotogalerie / Kontakt. Jazyk nebude až na konci dlouhého menu. Konkrétní rozměry a stavy řeší vizuální návrh.

**Patička:** kontakt a pořadatel, výsledky, fotogalerie, archiv, přehled partnerů, sociální sítě a informace o soukromí. Afterparty patří primárně pod Program. Registrace má výrazné tlačítko jen při ověřeném otevření přihlášek pro daný ročník.

Výsledky minulého ročníku budou dostupné z patičky i stránky jezdce. V pozávodním režimu je lze zvýraznit na homepage; prvotní navigace pro pozvánku 2027 se kvůli nim nemusí rozšiřovat.

## 3. Mapa stránek a jejich úloha

Navržené nové adresy nejsou založené. Zachováváme známé existující adresy, i pokud má položka navigace jiné označení.

| Stránka | CZ adresa | Obsah v pořadí | Hlavní akce |
| --- | --- | --- | --- |
| Homepage | / | Úvod → pro diváky/jezdce → atmosféra → program → partnerství → partneři | Informace pro jezdce; podle fáze ověřená Registrace |
| Pro diváky | /pro-divaky/ | Kdy a kde → kdy dorazit → kde fandit → příjezd/parkování → bezpečné průchody a zázemí → děti → stručné FAQ | Zobrazit program; navigovat na potvrzené místo |
| Pro jezdce | /hlavni-zavod/ | Souhrn účasti → stav registrace → podmínky/kategorie → harmonogram → příjezd/prezence → výbava/dokumenty → kontakt | Registrovat se, jen při otevřených přihláškách |
| Dětský závod | /detsky-zavod/ | Věk/kategorie → místo a čas → způsob přihlášení → doprovod a výbava → kontakt | Postup přihlášení nebo potvrzená registrace |
| Program | /program/ — nová | Potvrzené dny a časy → sport → doprovodný program → afterparty | Najít místo konkrétního bodu programu |
| Chci se stát partnerem | /partnerstvi/ — nová | Přínos → publikum → příklady plnění → možnosti spolupráce → kontakt | Probrat partnerství |
| Partneři | /partneri/ | Poděkování a ročník → loga podle úrovní → odkaz na nabídku | Chci se stát partnerem |
| Výsledky | /vysledky/ | Volba dostupného ročníku → hlavní/dětský závod → souhrn a úplné výsledky | Otevřít příslušné výsledky/PDF |
| Fotogalerie | /fotogalerie/ | Ročník → vybrané galerie a video → autoři | Otevřít galerii |
| Kontakty | /kontakty/ | Pořadatel → závod/jezdci → partneři/média → faktické organizační údaje | Zavolat nebo napsat správné osobě |
| Archiv | /archiv/ — nový rozcestník | Dostupné ročníky → fakta, výsledky, fotky a dobové informace | Otevřít konkrétní ročník |
| Soukromí a cookies dle použitých služeb | Adresy podle inventury existujících dokumentů | Srozumitelný popis zpracování a skutečně použitých služeb | Kontakt / správa voleb, kde je relevantní |

Samostatná stránka Trať není podmínkou V1. Potvrzené základní informace a použitelný statický plánek patří na stránky diváka a jezdce. U obrázku umožnit zvětšení a zásadní orientační/bezpečnostní pokyny uvést také textem.

## 4. Homepage — konkrétní pořadí sekcí

| Pořadí | Sekce | Náplň a rozsah | Co se sem nepřenáší |
| --- | --- | --- | --- |
| H01 | Úvodní obrazovka | Jedna akční fotografie s vhodným mobilním výřezem; Svatohorský Downtown Příbram, datum 22. 5. 2027, Příbram, stručné vysvětlení závodu; jedna hlavní a jedna vedlejší akce | Nepotvrzený status MČR, obří odpočet, automaticky přehrávané těžké video |
| H02 | Vyber si svou cestu | Dvě krátké karty: Chci závodit / Přijdu fandit. U diváka také odkaz na dětský závod | Kopie kompletních propozic a pravidel |
| H03 | Zažij SVDT | Jeden krátký odstavec a jedno video spouštěné kliknutím. Historické video označit ročníkem. Nejvýše tři doložená čísla s obdobím | Druhý podobný blok atmosféry, druhé hlavní video a automatický sociální feed |
| H04 | Co tě čeká | Nejvýše čtyři potvrzené body programu a odkaz na celý program. Před zveřejněním časů stručná informace o jejich přípravě | Celý plakát s drobným písmem, opakované programové tabulky |
| H05 | Staň se součástí závodu | Krátká partnerská výzva, fotografie skutečného plnění a tlačítko Chci se stát partnerem | Kompletní balíčky, cenové tabulky a celá Canva prezentace |
| H06 | Partneři ročníku | Kompaktní přehled podle potvrzených smluv a úrovní, odkaz na úplnou stránku partnerů | Neodsouhlasené zmenšení smluvené viditelnosti nebo automatické převzetí partnerů 2026 |
| — | Patička | Pořadatel, kontakty, praktické odkazy a sociální sítě | Další dlouhý obsahový blok |

Cíl je šest obsahových sekcí, nikoli pevný počet obrazovek. Přesná výška závisí na obsahu, písmu a dohodnuté prezentaci partnerů. Shop je ve V1 dostupný z navigace; vlastní promo sekci přidat až s konkrétní aktuální kolekcí.

### Úvodní obsah a stav akce

Pracovní znění: **SVATOHORSKÝ DOWNTOWN PŘÍBRAM** / **22. 5. 2027** / „Městský sjezd ze Svaté Hory do centra Příbrami.“ Datum vychází z potvrzení v TV zadání; před publikací redakčně ověřit. Fotografie ani video nemají vydávat minulý ročník za záběry z budoucí akce.

| Stav | Hlavní tlačítko | Vedlejší tlačítko | Informace |
| --- | --- | --- | --- |
| Pozvánka, registrace ještě nejsou otevřené | Informace pro jezdce | Pro diváky | Registrace připravujeme; datum otevření pouze je-li potvrzené |
| Registrace otevřené | Registrovat se | Pro diváky | Přímý ověřený odkaz 2027; při externím portálu to stručně uvést |
| Registrace uzavřené / naplněné | Informace pro jezdce | Program | Srozumitelný skutečný stav; čekací listinu neslibovat bez její existence |
| Závodní den bez nových live modulů | Program dne | Pro diváky | Ověřené organizační informace; žádné nefunkční tlačítko Live |
| Po závodě | Výsledky, až jsou dostupné | Fotogalerie, až je dostupná | Ročník a stav výsledků; do zveřejnění jasné sdělení |

Nevyplněná sekce se skryje nebo použije věcný stav bez falešného odpočtu. Po skončení registrací nezůstane aktivní stará výzva.

## 5. Stránka pro jezdce a anglická cesta

Hned nahoře datum, místo, potvrzená kapacita, startovné a stav přihlášek. Neověřené startovné 2026 se nepřenese jako cena 2027. Následují kotvy **Registrace / Kategorie / Program / Příjezd / Výbava a dokumenty**.

Praktické údaje psát jako krátké přehledy. Kritické podmínky účasti neskrývat pouze do PDF nebo rozbalovacího FAQ. Dokumenty mají ročník a datum platnosti. Podmínky licencí pro zahraniční závodníky musí dodat organizátor; neodvozovat je automaticky z pravidel českých jezdců.

EN obsah navíc srozumitelně vysvětlí polohu Příbrami vůči Praze, dopravu na místo, možnosti příjezdu s kolem, prezenci a kontakt pro anglickou komunikaci. Ubytování či vývoz neslibovat bez potvrzení.

Navrhujeme plnohodnotné oddělené jazykové stránky: /en/ a párové podstránky. Menu například **Spectators / Riders / Programme / Become a partner / Shop**. Přepínač zachovává téma stránky. Konkrétní EN adresy zvolit až po inventuře stávajících URL; změny dostanou cílená přesměrování.

Toto je nadále výslovně navržená odchylka od vzoru malého EN překladu pod CZ textem v design systému. V první verzi je důležité dokončit celý jezdecký průchod: informace, dokumenty, kontakt a jazykové možnosti externí registrace. Pokud cizí registrační portál EN nepodporuje, nabídnout pravdivý návod a kontakt; netvrdit, že je průchod plně přeložený.

## 6. Partnerská stránka bez přehlcení

1. **Proč SVDT:** stručná hodnota spolupráce a první Probrat partnerství.
2. **Komu se značka ukáže:** maximálně čtyři doložené metriky, označené ročníkem a obdobím.
3. **Jak spolupráce vypadá:** tři konkrétní příklady, například viditelnost u tratě, obsah a aktivace; skutečné fotografie, případně jedno video na kliknutí.
4. **Možnosti zapojení:** stručné úrovně spolupráce, detaily až po rozbalení. Nevyřešené částky nezveřejňovat; lze uvést Nabídka podle rozsahu spolupráce.
5. **Důvěra:** vybrané doložené realizace/partneři s příslušným ročníkem.
6. **Kontakt:** konkrétní odpovědná osoba a krátký formulář jméno, firma, e-mail, volitelně telefon a zpráva; potvrzení úspěchu a jasný postup při chybě.

Canva zůstává obsahový zdroj, ne vložená prezentace místo webu. Ceny, dosahy a rozsah TV/streamového plnění se potvrdí před zveřejněním. První verze použije kvalitní fotografie, video na vyžádání a běžné interakce; pokročilé motion, paralaxy a 3D patří do zásobníku.

## 7. Inventura známých adres a návrh převodu

Výchozí inventura vychází z auditu 28. 9. 2026 a známých odkazů. Není úplným exportem WordPressu ani kompletním seznamem všech indexovaných URL. Samostatné podstránky, které nebyly vizuálně zkontrolované, nejsou tímto označené za prověřené.

| Současná adresa / obsah | Zásah | Cílové řešení |
| --- | --- | --- |
| / — ročník 2026 | Přepsat úvod pro 2027, zachovat relevantní historické podklady | Nová homepage; historická fakta a odkazy do /archiv/2026/ |
| /pro-divaky/ | Zkrátit a aktualizovat | Stejná adresa; program a místa ze společných údajů |
| /hlavni-zavod/ | Přepsat hierarchii, zachovat adresu | Položka Pro jezdce; propozice 2026 odložit do archivu, nepřepsat stará PDF |
| /detsky-zavod/ | Prověřit obsah a aktualizovat | Stejná adresa, jasné oddělení od hlavního závodu |
| /afterparty/ | Vyjmout z hlavního menu; rozhodnout podle inventury obsahu | Preferovaně zachovat jako detail programu s ročníkem; sloučit do Programu jen při zajištění obsahově odpovídajícího přesměrování a zachování archivu |
| /partneri/ | Ponechat a zkompaktnit | Poděkování, ročník, loga; obchodní nabídka na nové /partnerstvi/ |
| /vysledky/ | Ponechat, zpřehlednit ročníky | Historické výsledky/PDF; bez vývoje live systému ve V1 |
| /fotogalerie/ | Ponechat, uspořádat podle ročníků | Fotografie, videa a odkazy s autory |
| /kontakty/ | Ponechat, ověřit kontakty | Klikací telefon/e-mail a rozdělení podle účelu |
| /en/ a jazykové podstránky | Dokončit překlad; inventarizovat všechny adresy | Párové CZ/EN stránky, bez automatického přesměrování všech EN odkazů na homepage |
| PDF, obrázky a odkazy ve wp-content/uploads | Inventarizovat a zachovat použité adresy | Dostupné historické dokumenty; při změně adresy cílený převod |
| eshop.svdtpribram.cz | Zachovat | Odkaz na existující Shoptet |

**Před migrací zbývá:** export úplného seznamu publikovaných stránek/příspěvků a jazykových variant, médií a používaných PDF; porovnání se sitemapou a dostupnými návštěvnickými daty; seznam stará URL → nová URL → ponechat/301/archiv. U každého přesměrování otestovat cílový obsah a zabránit řetězení. Žádný obsah nebyl tímto přesunut.

## 8. Co se bude spravovat v administraci

| Agenda | Hlavní pole | Kde se používá |
| --- | --- | --- |
| Ročník | Rok, datum, místo, stav akce, stav a odkaz registrace, potvrzené základní údaje | Homepage, stránky jezdce/diváka a archiv |
| Program | Ročník, datum/čas, název CZ/EN, místo, cílová skupina, potvrzenost | Celý program, krátký výběr na homepage, související podstránky |
| Partneři | Logo, název, URL; přiřazení k ročníku, úroveň, pořadí a domluvená viditelnost | Partnerské přehledy; profil lze použít opakovaně bez změny historické úrovně |
| Stránky CZ/EN | Texty, připravené sekce, média, párování překladů, metadata | Informační stránky a obchodní nabídka |
| Dokumenty a média | Ročník, jazyk, autor/práva, popis, soubor/odkaz | Propozice, galerie, podklady |
| Kontakty | Účel kontaktu, osoba, veřejné spojení | Patička, jezdci, partnerství a kontakty |

Jazykové znění se liší, ale datum nebo potvrzený čas programu má jediný zdroj. Archiv čerpá z vlastního ročníku, nikoli z automaticky přepisované globální hodnoty.

Běžný redaktor pracuje s připravenými vzory a poli; rozložení chráníme před nechtěnými změnami. Úložiště jednotlivých agend (typ obsahu / pole / taxonomie) a překladový plugin vybereme při technickém návrhu. V této etapě nevytváříme databázi registrací ani interních financí.

## 9. Připravenost obsahu ke spuštění

| Podklad | Stav | Pravidlo publikace |
| --- | --- | --- |
| Datum a ročník | 22. 5. 2027 a XI doložené interním zadáním; finální redakční kontrola před publikací | Jednotné všude |
| Status MČR, pravidla, licence a startovné | K potvrzení pro 2027 | Nepřenášet automaticky z 2026 |
| Program, děti, afterparty | Potvrzené body a časy k dodání | Lze spustit pozvánku bez kompletního programu; uvést věcný stav přípravy |
| Registrace 2027 | Otevření a aktuální externí odkaz k potvrzení | Do potvrzení žádné aktivní Registrovat se |
| Partnerské balíčky a metriky | Rozpory popsané v auditu | Vyřešit nebo zveřejnit nabídku bez cen a neověřených čísel |
| Foto/video a loga | Výběr a práva k potvrzení | Historický ročník označit; ukázková média nevydávat za skutečná |
| Kontakty a příjemce formuláře | K ověření | Před spuštěním otestovat doručení |
| CZ/EN a dokumenty | Texty připravit a zkontrolovat | Kritické podmínky účasti musí být srozumitelné; překlad nesmí měnit jejich význam |
| Historické adresy a obsah | Základní přehled zde, úplný export chybí | Před přepnutím dokončit převod a kontrolu odkazů |

## 10. Další výstup

Na tento návrh naváže vizuální rozložení homepage a partnerské stránky pro mobil a desktop (WEB-007/WEB-008), včetně otevřeného mobilního menu. Nejprve se ověří hierarchie a délka, potom detaily vzhledu. Implementace šablony a pluginu následuje až po odladění návrhu podle dohodnutých etap.

K připomínkám jsou zejména čtyři hlavní položky menu, šest sekcí homepage a oddělení obchodního Partnerství od přehledu Partnerů. Hostingovou inventuru lze dokončit souběžně; není překážkou tohoto obsahového návrhu.
