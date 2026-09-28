# Zadání celého úkolu — grafika pro TV přenos DownTown Příbram

Pracovní dokument. Slouží jako společný základ, ze kterého později vzniknou jednotlivá dílčí zadání, například pro vizuální návrh, jednotlivé grafické části, práci s daty a ovládání.

## Stav a způsob doplňování

- Potvrzené informace jsou uvedeny jako fakta.
- **K doplnění** a **K potvrzení** znamenají dosud nezodpovězenou otázku, nikoliv požadavek.
- **Rozpracováno** označuje bod s částečnou odpovědí, kterému chybí upřesnění.
- Zodpovězený bod je zapsán jako fakt a ukončený značkou ✔ s datem, kdy odpověď přišla.
- **Návrh k rozhodnutí** označuje možnost, která ještě nebyla schválena.
- Výčty příkladů níže nejsou potvrzeným rozsahem dodávky.

Otevřené a rozpracované body nesou v závorce stranu, která má odpověď dodat —
`(čeká: zadavatel)`, `(čeká: časomíra)`, `(čeká: režie)`, `(čeká: LED)` nebo `(čeká: na nás)`.
Jakmile dotaz odejde, připíše se za stranu datum: `(čeká: časomíra, dotaz 12. 9. 2026)`.
Dashboard z něj počítá, jak dlouho se na odpověď čeká, a podle toho řadí nejbližší kroky.
Z tohoto zápisu se generuje [dashboard stavu zadání](docs/index.html); jiný zdroj stavu neexistuje.

## Dosud potvrzené informace

- Úkolem je připravit grafiku pro televizní přenos závodu DownTown Příbram a pro LED velkoformátové panely.
- Součástí bude více grafických částí, nejen grafika z referenční fotografie.
- Výsledkem bude vlastní broadcast systém pro centrální řízení grafiky profesionálním způsobem. HTML/CSS/JS zůstává renderovací technologií grafických komponent; broadcast systém je řídicí vrstva nad nimi.
- Grafiku bude během přenosu ovládat režie. Ovládání musí být co nejjednodušší, bezpečné a rychlé.
- TV a LED panely jsou samostatné výstupy s rozdílnými formáty; používají společná data a mohou být spuštěny jedním povelem.
- Primárním datovým vstupem bude externí server poskytovatele časomíry.
- Nejprve vznikne obecné zadání celého úkolu; následně z něj odvodíme dílčí zadání.
- Informace se budou doplňovat postupně. Neznámé požadavky zůstávají otevřené.
- Původní referenční fotografie a archiv `SVDT Design System.zip` byly vstupními podklady při přípravě zadání, ale nejsou uloženy v tomto repozitáři. Rozbalený design systém je součástí složky `../design-system/` (sdíleno napříč repozitářem, v kořeni nad `DT-grafika-TV/`); použité obrazové podklady aktuální studie jsou popsány v `karta-jezdce/README.md`.

## 1. Základní informace o akci

- Oficiální název: **Svatohorský Downtown Příbram (SVDT)**. Jde o městský sjezd horských kol na čas.
- Číslo a označení dalšího ročníku: **11. ročník (XI)** ✔ 11. 9. 2026
- Datum dalšího ročníku: **22. 5. 2027** ✔ 17. 9. 2026
- Web nyní popisuje 10. ročník ze dne 23. 5. 2026; datum, harmonogram, status MČR ani partnery tohoto ročníku nepřebírat automaticky do nové grafiky.
- Místo: Příbram, trať ze Svaté Hory do Pražské ulice. Pořadatel: **COWÁRNA z.s.** Zdroj: [oficiální web](https://svdtpribram.cz/), ověřeno 8. 9. 2026.
- Veřejné kontakty z webu: info@svdtpribram.cz, +420 721 332 266; ředitel závodu Vojtěch Hrach, partneři / marketing / PR Vlastimil Ševr.
- Jazyk a jazykové varianty přenosu: **čeština, s přípravou anglické mutace** ✔ 11. 9. 2026
- Odpovědná kontaktní osoba pro tento projekt: **Hrášek a Lipánek** ✔ 11. 9. 2026
- Kontaktní osoba za televizní produkci a režii: **K doplnění** (čeká: režie)

### Odpovědné osoby na straně zadavatele

Potvrzeno 11. 9. 2026. Jména jsou uvedena tak, jak je předal zadavatel.

| Osoba | Odpovídá za |
| --- | --- |
| Hrášek | Seznam závodníků, kontrola údajů, provoz a řešení problémů během akce |
| Lipánek | Texty a validace obsahu, provoz během akce společně s Hráškem |
| Vlasta a Lachtan | Portréty, loga partnerů, práva k podkladům a termíny dodání |

## 2. Cíl a rozsah celého úkolu

- Výsledkem budou grafické soubory a funkční broadcast systém pro odbavení grafiky do TV přenosu a na LED velkoformátové panely.
- Broadcast systém nenahrazuje HTML. HTML/CSS/JS je preferovaná renderovací technologie jednotlivých grafických komponent; systém nad nimi zajišťuje data, stavy, náhled, odvysílání, animace a koordinaci výstupů.
- Grafiku bude odbavovat režie z centrálního ovládacího rozhraní.
- Základní provozní tok musí odpovídat profesionálním režiím: **Preview → Take → Program → Out**. Režie musí vždy poznat, co je připravené, co je právě ve vysílání a na kterém výstupu.
- TV a LED jsou rozdílné výstupní formáty. Jedna událost nebo povel může spustit odpovídající TV a LED variantu se stejnými zdrojovými daty, ale s vlastním rozložením, velikostí textu, bezpečnými okraji a animací.
- Cílem je maximálně zjednodušit živou obsluhu: běžný úkon má být proveditelný výběrem objektu (například jezdce), volbou grafiky a povelem **TAKE**, bez ručního otevírání stránek nebo přepisování stejných dat na více místech.
- Systém musí umožnit ruční řízení režie a být připraven na automatizované workflow založené na událostech závodu.
- Primární datový vstup tvoří externí server poskytovatele časomíry. Konkrétní rozhraní, autentizaci, datový formát, frekvenci aktualizace a chování při výpadku je nutné potvrdit s poskytovatelem.
- Současné HTML grafiky v repozitáři se mají pokud možno znovu použít. Před začleněním se ověří jejich kompatibilita se společným datovým modelem, odděleným obsahem a prezentací, řízenými IN/OUT animacemi a TV/LED variantami.
- Řešení má být opakovaně použitelné pro další ročníky. Údaje konkrétního ročníku nesmí být napevno svázány s grafickými šablonami.
- Preferuje se řešení bez průběžných licenčních poplatků. Případné placené závislosti musí být předem schváleny.
- Priority a minimální rozsah pro první ostré použití budou rozděleny do MVP a následných rozšíření.

## 3. Formát a pravidla závodu

Níže je referenční stav ročníku 2026, nikoliv potvrzená pravidla dalšího ročníku. Zdroje ověřené 8. 9. 2026: [hlavní závod](https://svdtpribram.cz/hlavni-zavod/) a [pravidla 2026, PDF](https://svdtpribram.cz/wp-content/uploads/2026/04/Pravidla_Svatohorsky_Downtown_Pribram_2026.pdf).

- Kategorie podle PDF: Ženy od 12 let, Open od 12 let, Junior 12–18 let, Elite 19–29 let a Masters 30+. Open je pro nelicencované; ostatní kategorie vyžadují licenci. Minimální účast: 3 ženy, ostatní kategorie 4 jezdci. Případné slučování určuje pořadatel.
- Dvě měřené jízdy. Běžně rozhoduje lepší čas, pro MČR pouze čas druhé jízdy.
- Způsob hodnocení: **lepší čas z obou jízd; pokud bude MČR, rozhoduje pouze čas druhé jízdy** — status MČR se potvrdí 15. 1. 2027 ✔ 17. 9. 2026
- PDF spojuje pořadí první jízdy s odbavením při prezenci. Web uvádí pořadí kategorií ženy, open, junior, master, elite, interval 30 sekund a druhou jízdu podle časů od nejpomalejšího. Posledních 10 startujících z licencovaných kategorií startuje po dojezdu předchozího.
- Startovní pořadí ve druhé jízdě: **reverse order v rámci kategorií** — prozatím platí, může se změnit kvůli live-streamu ✔ 17. 9. 2026
- Důsledek pro návrh: počítat s možností více jezdců současně na trati; přiřazení grafiky k jezdci na obraze se musí vyřešit s režií.
- Web uvádí délku 1 200 m a převýšení 85 m.
- Finální trasa a mapa trati: **Rozpracováno** (čeká: zadavatel) — na trase se pracuje, podklad pro G03 zatím není k dispozici.
- Rozpor zdrojů: stránka hlavního závodu uvádí limit 120 jezdců, PDF 140.
- Kapacita startovního pole: **140 jezdců** ✔ 17. 9. 2026
- Počet měřených úseků a mezičasů: **K doplnění** (čeká: časomíra) — rozhoduje o realizovatelnosti volitelné části G08.
- Shodné časy: rozhoduje **součet časů obou jízd** ✔ 17. 9. 2026
- Zobrazení DNF / DNS / DQ: **zkratka místo času, vizuální styl podle Red Bull Cerro Abajo** (potlačená barva, bez pořadí) ✔ 17. 9. 2026

## 4. Seznam grafických částí

Potvrzené části:

| ID | Část | Obsah / upřesnění | Realizace | Stav |
| --- | --- | --- | --- | --- |
| G01 | Tabulka výsledků jezdců | 10 výsledků: startovní číslo, jméno, stát, čas / ztráta. Měnitelná kategorie a jízda, loga vpravo ve společném panelu. [Dílčí zadání](karta-vysledky/ZADANI_KARTA_VYSLEDKU.md). Průběžná/finální varianta a stránkování se doplní. | Dílčí zadání i HTML generátor podle studie 04 | Čeká na schválení |
| G02 | Představení / popis jezdce | Údaje o jezdci podle oddílu 5; podoba a okamžik zobrazení se doplní. | Verze 06.5 — vodorovná i rohová, s portrétem i bez | Čeká na schválení |
| G03 | Mapa trati | Finální trasu a požadované body je nutné dodat nebo potvrdit. | Čeká na finální trasu od pořadatele | Blokováno |
| G04 | Časomíra | Kompaktní čas vpravo dole, rovný levý okraj, bez reliéfu. [Generátor a návod](časomíra/README.md). Přesné stavy a formát živého času se doplní podle dostupných dat. | HTML/CSS editor a PNG generátor hotové; živé napojení čeká na rozhraní časomíry | Čeká na schválení |
| G05 | Jmenovka pro rozhovory | Jméno, startovní číslo a tým. | Studie 01 — jméno a funkce, generování PNG hotové | Čeká na schválení |
| G06 | Přechody mezi sestřihy | Počet variant, délka a způsob použití se upřesní s režií. | Neřešeno, upřesní se s režií | Otevřené |
| G07 | Partneři | Loga a způsob prezentace podle postupně dodávaných podkladů. | Čeká na podklady od zadavatele | Otevřené |
| G08 | Split time | Jezdec a lídr, 2 mezičasy se symbolem stopek a čísly 1/2, cíl a pořadí. Bez startu. [Návod](split-time/README.md). | HTML/CSS editor a PNG generátor dle návrhu 04; živá data čekají na časomíru | Rozpracováno |

**G08 — potvrzený vizuální rozsah:** dva mezičasy od startu vůči lídrovi a cíl s pořadím. Start se nezobrazuje. Symbol stopek a čísla 1/2 nahrazují nápisy SPLIT. Generátor je implementovaný; živá integrace závisí na dostupnosti dat časomíry.

Další části z původní osnovy (například startovní listina, program, stupně vítězů nebo informační sdělení) zatím nejsou objednaným rozsahem.

- Priority G01–G07: **na pořadí nezáleží, části vznikají souběžně** ✔ 11. 9. 2026
- Schválení hotových vizuálních studií G01, G02 a G05: **Rozpracováno** (čeká: zadavatel) — studie jsou implementované, čeká se na písemné schválení.

Pro každou zvolenou část později určujeme: účel, zobrazovaná data, podobu, okamžik spuštění, dobu zobrazení, způsob skrytí, varianty a prioritu při souběhu s jinou grafikou.

## 5. Údaje o závodnících a další obsah

- Rozsah údajů: **jméno, startovní číslo, země, tým, kategorie, portrét a vlajka** ✔ 8. 9. 2026
- Kontrola správnosti jmen, týmů a dalších údajů: **Hrášek a Lipánek** ✔ 11. 9. 2026
- Rozdělení na povinné a volitelné údaje pro jednotlivé grafiky: **K doplnění** (čeká: na nás) — vyplyne z dílčího zadání grafických částí.
- Konkrétní portréty, vlajky a další obrazové podklady: **Rozpracováno** (čeká: zadavatel) — dodají Vlasta a Lachtan, termín zatím neurčen.
- Kdo dodá seznam závodníků a kontroluje jeho správnost: **Hrášek** ✔ 11. 9. 2026
- Formát a termín dodání seznamu závodníků: **Excel / Google Sheet z registračního systému na webu** ✔ 28. 9. 2026 — letos by registrace měly běžet přes systém na webu, data budou dostupná v požadovaném formátu; termín dodání se upřesní.
- Pravidla pro dlouhá jména, diakritiku a chybějící údaje: **K doplnění** (čeká: na nás) — obsah validují Hrášek a Lipánek.
- Texty pro informační grafiku a další obsah: **Informační grafika bude** ✔ 28. 9. 2026 — konkrétní texty se upřesní.

- G04 — vizuální generátor: **implementován editor, ukázkový čas, průhledný PNG export a společné Actions** ✔ 13. 9. 2026
- G04 — rozměry a vizuální shoda s původním návrhem: **K potvrzení** (čeká: zadavatel) — pracovní rozměr 344 × 112 px; původní obrázek nebyl dostupný pro přesné porovnání.

## 6. Časomíra a závodní data

- Zadavatel poskytl [výsledkovou stránku SLCR Live](https://vysledky.ok1kuo.cz/?s=22147) jako podklad k časomíře.
- Ověření 8. 9. 2026: stránka zobrazuje rozhraní pro jezdce na trati a dojezd, pole pořadí, číslo, jméno, kategorie, klub / země, Run 1, Run 2, Time a Gap. Při kontrole nebyly zobrazeny konkrétní výsledkové řádky ani název zvoleného závodu.
- Samotný odkaz nepotvrzuje dostupnost datového rozhraní, automatického odběru, živého času ani mezičasů. Způsob propojení a zdroj pro příští ročník je nutné dohodnout s časomírou; nevycházet pouze z vzhledu veřejné výsledkové stránky.
- Dodavatel a systém časomíry, technický kontakt: **K doplnění** (čeká: časomíra) — bez toho nelze začít žádné z dalších témat tohoto oddílu.
- Jaká data jsou dostupná a jak se předávají: **K doplnění** (čeká: časomíra)
- Automatické napojení, import souboru nebo ruční zadávání: **K doplnění** (čeká: časomíra)
- Dostupnost startů, živého času, mezičasů, cílových časů a pořadí: **K doplnění** (čeká: časomíra)
- Přesnost a způsob zápisu času: **K doplnění** (čeká: časomíra)
- S kým se jezdec porovnává a zda se porovnání během jízdy mění: **K doplnění** (čeká: časomíra)
- Rozlišení času úseku a celkového času od startu: **K doplnění** (čeká: časomíra)
- Rozlišení předběžných a potvrzených výsledků: **K doplnění** (čeká: časomíra)
- Postup při opravě výsledku, opožděných datech nebo výpadku: **K doplnění** (čeká: časomíra)
- Dostupnost ukázkových dat pro přípravu a zkoušku: **K doplnění** (čeká: časomíra) — nutná k prototypu i k demoverzi bez ostrého napojení.

## 7. Ovládání během přenosu

- Grafiku během přenosu ovládá režie prostřednictvím centrálního ovládacího rozhraní.
- Rozhraní musí být navrženo pro rychlou a bezpečnou živou obsluhu s co nejmenším počtem kroků.
- Základní stavový model je **Preview → Take → Program → Out**:
  - **Preview:** příprava a kontrola grafiky s konkrétními daty bez zobrazení divákům;
  - **Take:** potvrzený povel k odvysílání;
  - **Program:** jasná indikace toho, co je skutečně ve vysílání, včetně cílového výstupu;
  - **Out:** řízené skrytí se správnou OUT animací.
- Typický ruční postup: režisér vybere například **#27 Novák → Karta jezdce → TAKE**. Systém doplní společná data, zvolí správnou TV a LED variantu, spustí příslušné IN animace a podle nastavení provede ruční nebo automatický OUT.
- Ovládání musí umožnit:
  - výběr jezdce, kategorie, jízdy nebo jiné závodní entity;
  - náhled výsledné grafiky před odvysíláním;
  - společné i samostatné spuštění TV a LED varianty;
  - nastavení nebo použití přednastavené doby zobrazení;
  - ruční OUT, automatický OUT a okamžité nouzové skrytí;
  - jasné rozlišení připraveného, vysílaného, ukončovaného a chybového stavu;
  - zákaz nebo varování před nebezpečným souběhem grafik;
  - ruční opravu dat oprávněnou obsluhou s viditelným označením zdroje nebo změny.
- Často používané operace mají být dostupné jako přednastavené akce nebo makra, aby režie nemusela opakovaně nastavovat každý výstup zvlášť.
- Systém musí podporovat automatizované workflow. Událost například **„jezdec projel cílem“** může postupně vyvolat: cílový čas → kartu jezdce → aktuální pořadí → aktualizaci výsledkové tabulky → LED výsledek. Konkrétní workflow a jejich časování budou samostatně schválena.
- Automatizace nesmí odebrat režii kontrolu. Musí být možné workflow pozastavit, přeskočit krok, ručně převzít řízení a provést nouzový OUT.
- Postup realizace: **nejdřív demoverze ovládání bez napojení na TV a časomíru, potom ostrá verze** ✔ 11. 9. 2026
- Role uživatelů, počet pracovišť, klávesové zkratky, hardwarové ovladače a chování při souběhu: **K doplnění** (čeká: režie)

## 8. Technické prostředí přenosu

### 8.1 Architektura broadcast systému

- Systém bude mít centrální řídicí vrstvu, společný datový model a samostatné renderovací výstupy.
- HTML/CSS/JS komponenty nesmí samy nést provozní logiku celé režie. Přijímají připravená data a pokyny ke stavu a animaci.
- Řídicí vrstva eviduje minimálně: aktivní závod, jízdu, vybraného jezdce, poslední platná data, obsah Preview, obsah Programu, cílové výstupy, průběh IN/OUT a chyby.
- Komunikace mezi ovládáním a výstupy musí být průběžně synchronizovaná. Po znovupřipojení musí každý klient získat aktuální stav.
- Jediný povel může atomicky připravit nebo spustit více souvisejících výstupů. Selhání jednoho výstupu musí být viditelné obsluze a nesmí vytvářet falešný dojem, že je vše odvysíláno správně.
- Grafické komponenty mají oddělovat data od vzhledu a používat verzované, zdokumentované rozhraní.
- Technologie a konkrétní způsob předání obrazu do režie budou zvoleny po potvrzení technického prostředí, ale architektura nesmí být závislá na ručním otevírání samostatných HTML stránek.

### 8.2 Výstupy

- Povinné cíle jsou **TV přenos** a **LED velkoformátové panely**.
- Každý typ grafiky může mít TV variantu, LED variantu nebo obě. Varianty sdílejí význam a zdrojová data, nikoliv nutně stejné rozložení.
- Pro každý fyzický výstup se nakonfiguruje rozlišení, poměr stran, obnovovací nebo snímková frekvence, bezpečné okraje, barevné zpracování a požadavek na průhlednost.
- Systém musí umožnit nezávislé Preview a kontrolu správné varianty pro každý cílový výstup.
- Přesný počet, rozměry, orientace a mapování LED panelů: **K doplnění** (čeká: LED)
- Způsob předání TV grafiky do mixážního nebo odbavovacího systému: **K doplnění** (čeká: režie) — určuje technologii výstupu celého systému.
- Požadavek na stream jako další samostatný výstup: **Možný, závisí na smlouvě s televizí** ✔ 28. 9. 2026

### 8.3 Provozní prostředí

- Odbavovací systém režie, jeho verze a podporované vstupy: **K doplnění** (čeká: režie)
- Počítače, operační systém, grafické výstupy a další dostupné vybavení: **K doplnění** (čeká: režie)
- Dostupnost a topologie místní sítě a internetu: **K doplnění** (čeká: režie)
- Systém musí být navržen tak, aby krátkodobý výpadek internetu neznemožnil ovládání již načtených grafik; přesná úroveň offline provozu závisí na rozhraní externí časomíry.
- Technická omezení a požadavky produkce: **K doplnění** (čeká: režie)

## 9. Vizuální směr a pravidla značky

- Podklad: dodaný archiv `SVDT Design System.zip`; jeho rozbalená pracovní podoba je uložena v `../design-system/`, samotný archiv není součástí repozitáře.
- Zjištění z archivu: téměř černé plochy, bílý text, značková červená `#E30613`, akcentní červená `#FF1A1A`, písmo Exo a číslice se stejnou šířkou.
- Archiv obsahuje zejména pravidla a komponenty pro web a další materiály; konkrétní pravidla pro TV grafiku je potřeba určit.
- Potvrzený směr: vycházet z dodaného design systému a přizpůsobit jej televiznímu přenosu a velkoplošným obrazovkám. Konkrétní návrhy schvaluje zadavatel.
- Fotografie slouží jako reference rozložení závodních informací; výslednou grafiku převést do identity SVDT. Detailní rozložení bude předmětem dílčího zadání.
- Umístění grafiky, bezpečné okraje a prostor pro logo televize: **K doplnění** (čeká: režie)
- Velikost textů a čitelnost nad světlými i tmavými záběry: **Rozpracováno** (čeká: na nás) — ověřitelné až na výstupu režie.
- Barevné významy náskoku, ztráty, lídra a dalších stavů: **Náskok: zelená #00B140 / Ztráta: červená #E30613 / Lídr: zlatá #FFD700 / Neutrální: bílá** ✔ 28. 9. 2026
- Průhlednost podkladů, animace a délka jejich trvání: **Střední délka animací 0,5–1 s; poloprůhledné pozadí** ✔ 28. 9. 2026
- Návrh k rozhodnutí: doplnit do pravidel značky použití zelené pro náskok; archiv ji nyní vyhrazuje formulářovým stavům.

## 10. Loga, fotografie, písma a partneři

- Zjištění z archivu: skutečné logo akce, fotografie ani loga partnerů nejsou přiloženy; písmo je odkazované z internetu, nikoliv přibalené jako soubor.
- Oficiální loga a další podklady bude **zadavatel dodávat postupně**.
- Partneři budou upřesněni později; zadavatel následně dodá jejich loga. Partnery z webu ročníku 2026 automaticky nepřebírat.
- Kdo dodá portréty a ostatní obrazové podklady: **Vlasta a Lachtan** ✔ 11. 9. 2026
- Hierarchie a pravidla zobrazování partnerů: **K doplnění** (čeká: zadavatel)
- Zajištění potřebných práv k použití podkladů a písem: **K doplnění** (čeká: zadavatel)
- Termín dodání finálních podkladů: **K doplnění** (čeká: zadavatel) — bez termínu nelze naplánovat finální naplnění šablon.

## 11. Spolehlivost a náhradní postupy

- Potvrzený požadavek: **zajistit zálohování dat**.
- Zálohovat minimálně seznam jezdců, naposledy přijaté výsledky a časy, ruční opravy, konfiguraci výstupů, nastavení workflow a grafické podklady. Zachovat historii změn a ověřit obnovu.
- Broadcast systém musí průběžně sledovat dostupnost externího serveru časomíry, řídicí vrstvy a jednotlivých TV/LED výstupů. Stav musí být srozumitelně viditelný režii.
- Při přerušení datového spojení nesmí systém bez upozornění vydávat zastaralá data za aktuální. Má zobrazit čas poslední úspěšné aktualizace a umožnit bezpečný ruční režim.
- Po restartu musí systém obnovit konzistentní provozní stav. Nesmí automaticky odvysílat grafiku pouze proto, že byla před výpadkem v Programu; přesný návratový režim se schválí při technické zkoušce.
- Povinné nouzové funkce: okamžitý OUT všech grafik, samostatný OUT pro TV a LED, zastavení automatizace a přechod na ruční řízení.
- Náhradní ruční režim a sada statických záložních podkladů budou součástí provozního návrhu.
- Odpovědnost za provoz a řešení problémů během akce: **Hrášek a Lipánek** ✔ 11. 9. 2026
- Interval záloh, nezávislé umístění kopie, délka uchování a odpovědná osoba: **Rozpracováno** (čeká: zadavatel) — zálohování dat zajišťuje zadavatel, parametry chybí.
- Požadovaná redundance řídicího počítače, sítě a renderovacích výstupů: **K doplnění** (čeká: režie)

## 12. Výstupy a předání

- Potvrzené výstupy:
  - zdrojové soubory grafických komponent;
  - funkční centrální broadcast systém;
  - ovládací rozhraní pro režii;
  - samostatně nakonfigurovatelné TV a LED výstupy;
  - napojení na externí server časomíry;
  - společný datový model a popis rozhraní;
  - konfigurovatelné IN/OUT animace, automatický OUT a schválená workflow;
  - zálohování, obnova a náhradní ruční režim;
  - ukázková data a scénář demonstrace celého průběhu závodu;
  - instalační, provozní a stručný obslužný návod.
- Současné grafiky v repozitáři budou vyhodnoceny a použity jako základ tam, kde splní vizuální a technické požadavky. Jejich začlenění nesmí vyžadovat ruční duplikaci dat mezi TV a LED.
- Zdrojové řešení musí být editovatelné a připravené pro doplnění dalších grafik, výstupů a workflow.
- Součástí předání bude seznam externích závislostí, licencí a postup spuštění bez závislosti na autorovi řešení.
- Rozsah návodu: **priorita je intuitivní ovládání, ne rozsáhlá dokumentace** ✔ 11. 9. 2026
- Uložení zdrojů a výstupů: **repozitář kabelkac77/SVDT2027 (dříve DT-grafika_TV) na GitHubu** ✔ 11. 9. 2026
- Rozsah zaškolení obsluhy, místo instalace a osoba přebírající výstupy: **K doplnění** (čeká: zadavatel)

## 13. Ověření a schválení

- Finální schválení: **zadavatel**. Návrh ověření: režie ověří kompatibilitu a časomíra správnost přebíraných dat; schválení zadavatele tím není nahrazeno.
- Kritéria, podle kterých bude úkol považován za dokončený: **K doplnění** (čeká: na nás) — bez akceptačních kritérií nelze projekt uzavřít.
- Termín a prostředí zkoušky s režií a časomírou: **Rozpracováno** (čeká: režie) — rámcově přelom ledna a února 2027, místo a prostředí chybí.
- Situace pro ověření — běžná jízda, dlouhé jméno, chybějící portrét, více jezdců na trati, oprava výsledku, výpadek dat: **K doplnění** (čeká: na nás)

## 14. Termíny, priority a omezení

- Termín prvního návrhu: **do konce roku 2026** ✔ 11. 9. 2026
- Termín funkční ukázky a společné zkoušky: **přelom ledna a února 2027** ✔ 11. 9. 2026
- Cílový termín dokončení: **březen 2027** ✔ 11. 9. 2026 — nahrazuje dřívější údaj začátek ledna 2027.
- Rozpočet a omezení placených nástrojů nebo služeb: **bez licenčních poplatků, jinak bez omezení** ✔ 11. 9. 2026
- Přesný den dokončení a den ostrého nasazení: **K doplnění** (čeká: zadavatel) — datum závodu dosud není známo.
- Co vypustit při nedostatku času: **K doplnění** (čeká: zadavatel) — pořadí částí G01–G07 nerozhoduje, vznikají souběžně.

### Milníky

Sloupec Datum je kotva pro časovou osu dashboardu, nikoliv potvrzený den. Milník bez
data se v ose nezobrazuje, protože zatím nemá termín.

| Milník | Termín | Datum | Stav |
| --- | --- | --- | --- |
| Doplnění zadání | probíhá | 2026-09-08 | Nyní |
| První návrh | do konce roku 2026 | 2026-12-31 | Připravuje se |
| Demoverze ovládání | navazuje na první návrh | | Připravuje se |
| Společná zkouška s režií a časomírou | přelom ledna a února 2027 | 2027-02-01 | Připravuje se |
| Předání ostré verze | březen 2027 | 2027-03-31 | Připravuje se |

## 15. Navazující dílčí zadání

Navržený postup realizace na žádost zadavatele. Tento dokument zůstává společným základem.

Skutečný postup se od plánu odchýlil: místo jednoho dokumentu pro všechny grafické části
vznikají samostatná dílčí zadání jednotlivých karet, vždy současně s jejich realizací.
Obě roviny jsou proto vedené zvlášť — plánované kroky níže a hotová zadání karet pod nimi.

| Krok | Dílčí zadání | Výsledek a závislosti | Stav |
| --- | --- | --- | --- |
| 1 | `01_VIZUALNI_SYSTEM.md` | Pravidla TV grafiky podle SVDT, čitelnost pro oba výstupy a ukázky výsledkové tabulky, jezdce a časomíry. Lze připravit nyní s označenými ukázkovými daty; rozměry zůstanou pracovní do potvrzení režií. | Lze psát hned |
| 2 | `02_GRAFICKE_CASTI.md` | Přesné zadání G01–G07: obsah, rozložení, varianty, animace a chování při chybějících údajích. G08 oddělit jako volitelné rozšíření. | Nahrazeno zadáními karet |
| 3 | `03_PODKLADY_A_OBSAH.md` | Seznam a organizace jezdců, portrétů, log a mapy; pravidla pojmenování a doplňování. Podklady lze shromažďovat současně s kroky 1 a 2. | Lze psát hned |
| 4 | `04_DATA_A_CASOMIRA.md` | Integrace externího serveru poskytovatele časomíry, datový kontrakt, autentizace, aktualizace, přiřazení jezdců a jízd, pravidla pořadí, mezičasy, opravy, cache, výpadkové stavy a ukázková data. Vyžaduje součinnost časomíry a potvrzení pravidel dalšího ročníku. | Blokováno časomírou |
| 5 | `05_BROADCAST_SYSTEM_A_REZIE.md` | Architektura centrálního broadcast systému, společný datový model, Preview → Take → Program → Out, jednoduché ovládání režie, řízené IN/OUT, TV a LED varianty, makra a automatizovaná workflow. Zahrne posouzení a začlenění současných HTML grafik. Vyžaduje technické parametry od režie, LED dodavatele a dohodu o datech. | Blokováno režií a LED |
| 6 | `06_ZALOHOVANI_A_OBNOVA.md` | Zálohování dat a nastavení, ověřená obnova a dohodnuté chování při výpadku. Navazuje na konkrétní funkční řešení. | Po funkčním řešení |
| 7 | `07_ZKOUSKA_A_PREDANI.md` | Zkouška průběhu závodu a všech grafik v prostředí režie, kontrola TV i velkoplošného výstupu, opravy, finální soubory a schválení zadavatelem. Rozsah návodu se ještě dohodne. | Po dohodě termínu zkoušky |
| 8 | `1_Broadcast/design-system/` | Broadcast Design System TV grafiky jako snímek z Claude Design: tokeny, vzory, komponenty G01, G02, G04, G05, G08 a jejich nástup a odchod podle pravidel rodiny. Pohyb G02 a G05 je rozkreslený, G01, G04 a G08 čeká na schválení. Podkladem pro krok 5 — ukázka ovládání v `1_Broadcast/` z něj už čerpá. | Rozpracováno |

### Dílčí zadání jednotlivých karet

Vznikají po částech, každé s vlastní realizací. Nahrazují plánovaný krok 2.

| Část | Dokument | Stav |
| --- | --- | --- |
| G01 | `karta-vysledky/ZADANI_KARTA_VYSLEDKU.md` | Hotovo |
| G02 | `karta-jezdce/ZADANI_KARTA_JEZDCE.md` | Hotovo |
| G04 | `časomíra/README.md` | Hotovo |
| G05 | `karta-hosta/ZADANI_KARTA_HOSTA.md` | Hotovo |
| G03 | zatím nevzniklo | Blokováno trasou |
| G06 | zatím nevzniklo | Otevřené, upřesní režie |
| G07 | zatím nevzniklo | Čeká na podklady |

Nejbližší navazující práce: připravit zadání vizuálního systému. Získání technických informací od režie a časomíry může probíhat souběžně; jejich kontaktování není tímto dokumentem automaticky zadáno.

### Orientační harmonogram

Rámec podle termínů potvrzených 11. 9. 2026. Dílčí termíny uvnitř jednotlivých etap zatím potvrzené nejsou.

- Září–říjen 2026: doplnění zadání, vizuální směr a získání technických vstupů.
- Listopad–prosinec 2026: návrhy jednotlivých částí a demoverze ovládání s ukázkovými daty; první návrh do konce roku 2026.
- Leden–únor 2027: napojení časomíry a režie, zálohování a společná zkouška na přelomu ledna a února.
- Březen 2027: cílové dokončení a předání. Později dodané logo partnera, datum nebo startovní listina se doplní do připravených šablon; termín finálního naplnění obsahem se dohodne samostatně.

## Záznam rozhodnutí

- 8. 9. 2026: zapracovány odpovědi zadavatele k bodům 1–15. Potvrzeny TV a velkoplošné výstupy, části G01–G07, údaje o jezdcích, postupné dodávání log, zálohování, soubory a funkční řešení, schvalování zadavatelem a preferované dokončení na začátku ledna 2027. G08 zůstává volitelná.
- 8. 9. 2026: ověřen web, pravidla 2026 a poskytnutá výsledková stránka. Pravidla dalšího ročníku, výpočet výsledků, limit jezdců, živé datové propojení a technické řešení zůstávají otevřené.

- 9. 9. 2026: G01 implementována podle studie 04 ve složce karta-vysledky. Potvrzeno 10 výsledků vlevo, menší loga vpravo ve stejné tabulce bez nadpisu Partneři, celý reliéf na pravém horním kraji. Při tvorbě živé HTML vrstvy vytvořit editor rozmístění log. Externí výsledkový server se napojí později. Detailní datová smlouva, současný stav a zbývající kroky jsou v karta-vysledky/ZADANI_KARTA_VYSLEDKU.md.


- 11. 9. 2026: zapracovány odpovědi zadavatele z doplňujícího kola. Potvrzeno: 11. ročník (XI), čeština s přípravou anglické mutace, první návrh do konce roku 2026, společná zkouška na přelomu ledna a února 2027, cílové dokončení březen 2027, řešení bez licenčních poplatků a bez rozpočtového omezení, postup přes demoverzi ovládání bez napojení na TV a časomíru, zálohování dat zajišťuje zadavatel, priorita intuitivního ovládání před rozsáhlou dokumentací, výstupy se ukládají do repozitáře na GitHubu. Odpovědné osoby: Hrášek a Lipánek za seznam závodníků, kontrolu údajů a provoz během akce, Vlasta a Lachtan za portréty, loga partnerů a práva k podkladům. **Cílový termín březen 2027 nahrazuje dřívější údaj začátek ledna 2027.**

- 11. 9. 2026: doplněny další odpovědi zadavatele. Odpovědnou kontaktní osobou za projekt jsou Hrášek a Lipánek. Na pořadí grafických částí G01–G07 nezáleží, vznikají souběžně. Seznam závodníků dodá a jeho správnost kontroluje Hrášek; formát a termín dodání zůstávají otevřené.

- 11. 9. 2026: sjednocen zápis otevřených bodů. Každý sledovaný bod nese značku stavu a stranu, která má odpověď dodat; zodpovězené body zůstávají v dokumentu jako fakt se značkou ✔ a datem. Z tohoto zápisu se generuje dashboard stavu zadání ve složce `docs/`.

- 9. 9. 2026: schváleno přenesení menšího nápisu SVATOHORSKÝ / DOWN / TOWN pod reliéf do všech variant jezdce, hosta a výsledkové tabulky. Nápis je centrovaný s celým reliéfem, bez kruhu, přidané linky a roku. Host mírně zmenšen na 620 px. Toto rozhodnutí nahrazuje dřívější požadavek bez samostatného nápisu. Požadavky na animace doplní zadavatel; stávající technické chování tím není schválením budoucích animací.

- 17. 9. 2026: doplněn zápis stáří dotazů. Za stranu, která má odpověď dodat, lze připsat datum odeslání dotazu ve tvaru `(čeká: časomíra, dotaz 12. 9. 2026)`; dashboard z něj počítá, jak dlouho se čeká, a podle toho řadí nejbližší kroky. Oddíl 15 nově vede vedle plánovaných kroků i tabulku dílčích zadání jednotlivých karet, protože zadání vznikají po kartách současně s realizací; plánovaný krok `02_GRAFICKE_CASTI.md` je jimi nahrazen.

- 13. 9. 2026: vytvořena složka `časomíra/` pro G04: HTML/CSS editor, ukázková data, validace času, skrytí karty, nastavení v URL a PNG renderer. Umístění vpravo dole, rovný levý okraj, bez reliéfu. Přidáno do společného menu, `npm run render` a Actions včetně vstupu `timer_time`. Doplněny README a stav G04 v Dashboardu. Živá data, produkční formát a animace nejsou tímto označeny za hotové.

- 17. 9. 2026: G08 implementováno ve `split-time/` podle návrhu 04. Dva kumulované mezičasy vůči lídrovi, bez zobrazení startu, stopky a čísla 1/2, zelený náskok a červená ztráta, pořadí vedle cílového rozdílu. Editor dat a exporty zapojeny do společného menu a Actions. Živá integrace a animace zbývají.

- 28. 9. 2026: zapracovány odpovědi zadavatele (otázky Q6–Q11). Formát seznamu závodníků: Excel/Google Sheet z registračního systému na webu. Informační grafika bude, texty se upřesní. Rozměry G04 (Q8) zůstávají otevřené. Stream je možný, závisí na smlouvě s televizí. Barevné stavové kódy: náskok zelená #00B140, ztráta červená #E30613, lídr zlatá #FFD700, neutrální bílá. Animace střední délky 0,5–1 s, poloprůhledné pozadí.
