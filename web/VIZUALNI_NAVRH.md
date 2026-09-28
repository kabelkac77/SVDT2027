# Vizuální návrh — zadání pro Claude Design

Připraveno 28. 9. 2026. Zadání prvního návrhového kola pro WEB-007; následující kola pokrývají WEB-008/WEB-009. Jde o předání podkladů, nikoli hotový návrh nebo jeho schválení. Claude Design zatím nebyl v rámci této práce otevřen ani naplněn.

## 1. Použití a zdroje

Do nového projektu Claude Design vložit úvodní zadání z kapitoly 2 a zpřístupnit tento dokument spolu s následujícími podklady. Samotné vložení URL není dokladem, že nástroj obsah skutečně přečetl. Před kreslením má uvést, které podklady viděl a co chybí.

| Podklad | Úloha |
| --- | --- |
| [Společný design systém](../design-system/readme.md), [SKILL.md](../design-system/SKILL.md), tokeny, guidelines a komponenty v kořenovém design-system/ | Závazný vizuální základ |
| [Současný web](https://svdtpribram.cz/) | Rozpoznatelnost značky, fotografie, atmosféra a výchozí rozložení; prohlédnout desktop i mobil |
| [ZADANI.md](ZADANI.md) | Rozhodnutí, rozsah a hranice první verze |
| [STRUKTURA_V1.md](STRUKTURA_V1.md) | Pracovní navigace, šest sekcí homepage, obsah a stavy stránek |
| [REVIZE_2026-09-28.md](REVIZE_2026-09-28.md), zejména vizuální kontrola v kapitole 17 | Doložené problémy, které návrh řeší; starší preference Divi je překonaná |
| [Webový UI kit](../design-system/ui_kits/website/README.md) | Vizuální reference komponent, nikoli schválený obsah ani požadavek na registrační formulář |
| [Canva prezentace](https://www.canva.com/design/DAHV1OOC1N4/0HR_9guA_CHSOQdkYPKoew/edit) | Obsahový podklad pro druhé kolo; není nutná pro první návrh homepage |

Veřejný repozitář: https://github.com/kabelkac77/SVDT2027. Pokud import celého repozitáře není dostupný, dodat soubory design systému se zachováním jejich vzájemných cest a uvedené webové dokumenty. Nevytvářet v repozitáři druhou nezávisle upravovanou kopii design systému.

**Hierarchie:** aktuální rozhodnutí zadavatele a ZADANI.md → společný design systém pro vzhled → současný web jako reference kontinuity → pracovní struktura a audit. Rozpor hlásit, ne tiše vyřešit změnou značky.

Konkrétní známé rozpory:
- V readme design systému je starší doporučení považovat živý kód za zdroj pravdy. Pro tento projekt ho nahrazuje výslovné rozhodnutí zadavatele: **při vizuálním rozporu má přednost design systém**.
- Vzory obsahují rok 2026 a vlastní registraci. Nejde o obsah 2027 ani rozsah V1.
- Design systém používá menší EN překlad pod CZ textem; oddělené jazykové stránky jsou dosud návrh k potvrzení. První pracovní návrh může ukázat CZ stránku a přepínač jako navrženou variantu, ale musí tuto odchylku viditelně zaznamenat v poznámkách. Neoznačit jazykové řešení za schválené.
- V původním exportu nejsou skutečná loga ani fotografie. Schematický kruhový znak z ukázek není logo pro nový web.

## 2. Úvodní zadání k vložení do Claude Design

> Navrhni první vizuální kolo webu Svatohorský Downtown Příbram pro rok 2027 podle tohoto dokumentu a připojených podkladů.
>
> Chceme dlouhodobou evoluci současného svdtpribram.cz. Návštěvník má poznat stejnou akci. Nadřazený je design systém z kořenové složky design-system v repozitáři kabelkac77/SVDT2027. Každý další rok se mají měnit obsah, fotografie a program, nikoli celá identita.
>
> Nejprve skutečně přečti pravidla a prohlédni současný web na počítači a mobilu. Uveď krátce dostupné podklady, rozpory a chybějící média. Pak vytvoř jeden propracovaný směr: kompletní homepage na šířce 1440 a 390 px a otevřené mobilní menu. Respektuj šest sekcí a obsahové stavy níže. Nepřipravuj několik odlišných značek ani všechny podstránky najednou.
>
> Výsledkem má být prohlédnutelný responzivní prototyp, nikoli jen popis. Zachovej reálnou hierarchii, čitelnost a délku textů. Použij skutečné dostupné SVDT podklady; chybějící média transparentně označ a nevyráběj logo. Neověřené ceny, statistiky, program ani partnery nevydávej za fakta.
>
> Budoucí realizace je WordPress s vlastní samostatnou blokovou šablonou a odděleným funkčním pluginem. Sekce proto navrhuj jako opakovatelné redakční bloky. Z návrhu nyní nevytvářej WordPress, registrace, platby ani interní aplikaci.
>
> Na konci přilož stručné vysvětlení změn oproti současnému webu, vazbu komponent na design systém, otevřené obsahové otázky a seznam skutečně ověřených velikostí a stavů. Po prvním kole ponech prostor pro připomínky před návrhem dalších stránek.

## 3. Závazná vizuální pravidla

Používat skutečné tokeny a pravidla společného systému; následující výběr je kontrolní připomenutí, nikoli jeho nová definice.

- Exo; nadpisy a CTA verzálkami, nadpisy váha 900. Odstavce běžným písmem, nikoli celé verzálkami. Tabulární číslice pro časy a statistiky.
- Brand červená #E30613 pro primární CTA a značku; akcentní #FF1A1A pro role určené systémem. Tmavé plochy a textové barvy převzít z tokenů. Kontrast ověřit, ne odhadnout pohledem.
- Zachovat akční závodní fotografii jako hlavní obrazový prostředek. Pod textem minimálně předepsané tmavé překrytí; rider musí zůstat viditelný i v mobilním výřezu.
- Žádné generické ilustrace, textury, dekorativní 3D nebo nová barevnost. Použít skutečné logo, případně dočasně prostý text označený v poznámkách jako náhrada.
- Mezery, šířky kontejnerů, rádiusy, typy tlačítek a vlasové linky podle systému. Násilně nezmenšovat písmo kvůli kratší stránce.
- Běžné karty bez stínů. Jemné nadzvednutí a červený glow pouze u klikacích prvků. Žádné trvalé pulzování všech tlačítek.
- Motion v první verzi: stavy tlačítek, menu a rozbalovacích detailů podle systému; obsah je čitelný i bez animace. Reduced motion vypíná pohyb. Bez převzetí scrollování a povinných nástupních animací.
- Zachovat klidné čitelné plochy mezi fotografiemi. Nový web nemá připomínat obecnou šablonu softwarové firmy.

## 4. První kolo — homepage a navigace

**Pracovní stav:** pozvánka na rok 2027, registrace ještě nejsou potvrzené jako otevřené. Neaktivovat Registrovat se ani odpočet k nepotvrzenému termínu.

Hlavička: skutečné logo / Pro diváky / Pro jezdce / Program / Partnerství / Shop / CZ–EN. Mobil: logo, viditelný jazyk a ovládání menu. Otevřené menu ukáže stejné hlavní cesty a sekundární odkazy podle STRUKTURA_V1.md. Jazykové řešení nese výše uvedenou poznámku k rozhodnutí.

| Sekce | Návrhový obsah | Co kontrolovat |
| --- | --- | --- |
| H01 — úvod | SVATOHORSKÝ DOWNTOWN PŘÍBRAM; 22. 5. 2027; „Městský sjezd ze Svaté Hory do centra Příbrami.“ CTA INFORMACE PRO JEZDCE a PRO DIVÁKY | V prvním pohledu identita, datum a srozumitelný další krok; vhodný výřez a čitelný text. Datum z interního zadání ověřit před publikací |
| H02 — dvě cesty | CHCI ZÁVODIT / PŘIJDU FANDIT; u diváka krátký odkaz na dětský závod | Dvě stručné návštěvnické cesty, neopakovat celou úvodní sekci |
| H03 — atmosféra | ZAŽIJ SVDT; jeden krátký odstavec, jedna video upoutávka na kliknutí s ročníkem | Bez automatického přehrávání; nejvýše tři doložené statistiky, při chybějících údajích blok čísel vynechat |
| H04 — program | CO TĚ ČEKÁ; nejvýše čtyři potvrzené položky a odkaz na program | Bez potvrzených dat zobrazit „Program připravujeme.“ Nevymýšlet časy a účinkující; program jako text, ne nečitelný plakát |
| H05 — partnerství | STAŇ SE SOUČÁSTÍ ZÁVODU; stručná pozvánka ke spolupráci a CHCI SE STÁT PARTNEREM | Jedna fotografie reálného plnění, žádné balíčky a dlouhá prodejní prezentace |
| H06 — partneři | PARTNEŘI ROČNÍKU; kompaktní přehled podle smluvených úrovní | Bez potvrzeného seznamu jen označená strukturální ukázka „Logo partnera — podklad chybí“; nepřevzít firmy 2026 jako partnery 2027 |
| Patička | Pořadatel, ověřené kontakty, výsledky, galerie, archiv, partneři, sociální sítě a soukromí | Přehledný konec, bez dalšího dlouhého promo bloku |

Texty jsou pracovní návrh k redakčnímu doladění. Jejich délku držet realistickou. Bez dostupných podkladů použít poctivý prázdný stav, nikoli efektní fiktivní čísla.

Mobilní kontrola: hlavička nesmí zabrat nepřiměřenou část obrazovky; hero nemá mít nuceně obrovskou výšku. Na 390 px musí být vidět jezdec a hlavní informace. Zkrácení stránky řešit odstraněním opakování a kompaktními partnery. Pozadí, fotografický styl a typografie mají stále připomínat současný SVDT.

## 5. Další kola po připomínkách

### Kolo 2 — Chci se stát partnerem

Použít odsouhlasené komponenty prvního kola. Struktura: přínos → maximálně čtyři doložené metriky s obdobím → tři příklady plnění → stručné možnosti spolupráce s detaily na vyžádání → důvěra → konkrétní kontakt.

Canvu číst jako zdroj obsahu. Nevkládat celých 18 slidů a nekopírovat jejich hustotu textu. Nejasné ceny a metriky jsou uvedené v auditu; do potvrzení použít nabídku podle rozsahu spolupráce a čísla vynechat. Video spouštět na kliknutí. Fotografie plnění musí být doložené. TV ani livestream neslibovat jako potvrzenou součást nabídky.

Formulář má normální stav, focus, chybu konkrétního pole, odesílání, úspěch a chybu doručení. V prototypu se nic skutečně neodesílá; úspěch označit jako demonstraci. Zájemce nemá muset studovat balíčky, aby mohl napsat.

### Kolo 3 — Pro jezdce, včetně EN cesty

Přehled termínu, místa a potvrzených podmínek; stav registrace; kotvy Registrace / Kategorie / Program / Příjezd / Výbava a dokumenty; praktický kontakt. Kritické podmínky účasti jsou čitelné přímo na stránce. Historická PDF nepoužívat jako propozice 2027.

Navrhnout také EN jezdeckou stránku jako pracovní variantu jazykového řešení. Zahraniční jezdec musí pochopit místo závodu, dopravu, prezenci, podmínky a možnosti anglického kontaktu. Všechny konkrétní služby a pravidla potřebují podklad. Přepínač má zachovat stejnou stránku.

Ostatní obsahové šablony odvodit až po odladění těchto tří hlavních stránek.

## 6. Stavy a chování

- Menu otevřené/zavřené, aktuální položka, klávesnicový focus; zavření Escape a návrat focusu na tlačítko.
- Viditelný focus a dostatečně velké dotykové cíle; minimálně cílit na 44 × 44 px ovládací plochy.
- Video před načtením, spuštění na vyžádání a náhradní odkaz při nedostupnosti.
- Přirozené zalamování delších CZ/EN názvů; žádný vodorovný posun stránky.
- Rozbalovací obsah lze ovládat klávesnicí; povinné údaje nezůstávají pouze uvnitř sbaleného detailu.
- Registrace: připravujeme / otevřeno s ověřeným externím odkazem / uzavřeno. Nevyvíjet registrační formulář.
- Ročník: pozvánka / závodní den bez live / po závodě s dostupnými výsledky. Ve druhých stavech stačí ukázka výměny horního bloku, nikoli další kompletní design.
- Pohyb vypnutý uživatelským nastavením; návrh musí zůstat stejně použitelný.

## 7. Předání a kontrola návrhu

První kolo dodat jako sdílený náhled a pokud to nástroj umožní, také přenosný HTML/CSS/JS prototyp se seznamem použitých médií a zdrojů. Export je podklad pro realizaci, nikoli hotová WordPress šablona.

Dodat:
1. Kompletní homepage 1440 px a 390 px, otevřené mobilní menu.
2. Kontrolu přizpůsobení také na 360, 768 a 1024 px; uvést, které šířky byly skutečně ověřené.
3. Stručný seznam komponent a vazbu na existující design systém.
4. Popis, co proti současnému webu zůstalo a proč se konkrétní části změnily.
5. Seznam médií s původem, chybějících údajů a odchylek čekajících na rozhodnutí.
6. Oddělení editovatelného obsahu od vzhledu: datum, ročník, stav registrace, fotografie, program, partneři, texty a kontakty.

Návrh lze předat k implementaci až po kontrole:
- [ ] Značka je rozpoznatelná, bez nové identity.
- [ ] Barvy, Exo, překrytí, rádiusy a pohyb odpovídají systému.
- [ ] Mobilní fotografie zachovává jezdce; text a CTA jsou čitelné.
- [ ] Homepage obsahuje šest jasných sekcí bez opakování; případný chybějící obsah má pravdivý stav.
- [ ] Partnerská loga jsou čitelná a jejich hierarchie odpovídá potvrzeným závazkům.
- [ ] Chybějící data nejsou nahrazena neoznačenými výmysly.
- [ ] Klávesnice, focus, kontrast, zalamování a reduced motion mají zaznamenané ověření.
- [ ] Jazyková odchylka je výslovně rozhodnutá před realizací.
- [ ] V1 neobsahuje nové 3D, live, platby, vlastní registrace ani interní správu.
- [ ] Návrh umí další ročník bez změny celé grafiky.

## 8. Aktuální stav a návaznost

**Hotovo:** předávací zadání a kontrolní kritéria.
**Následuje:** vložení podkladů do Claude Design a první vizuální návrh homepage/menu.
**Dosud neproběhlo:** vytvoření návrhu v Claude Design, jeho kontrola zadavatelem, export ani implementace.

Zadání lze použít i v jiném návrhovém nástroji. Nástroj nemění platnost požadavků. Stav jednotlivých kol udržovat v [UKOLY.md](UKOLY.md); změny rozhodnutí v [ZADANI.md](ZADANI.md).
