# SVDT 2027 — osnova hlasového projití a skutečný stav

Připraveno16.11.2026 pro dnešní hlasový rozhovor s Vojtou. Tento dokument je podklad k diskusi, nikoli nové schválení funkcí, práv, termínů, importu nebo nasazení. Navazuje na [backlog](BACKLOG.md), [stav implementace](IMPLEMENTATION-STATUS.md), [karty modulů](42-HLASOVE-PROJITI-KARTY-MODULU.md) a [odložené kontroly](31-AKTIVACE-A-RUCNI-KONTROLY.md). Konkrétní provozní podklady a osobní údaje zůstávají v místním soukromém indexu, nikoli v tomto veřejném dokumentu.

## Co říct na začátku

„Máme funkční místní evidenci crew pro2027 s historií2026/2025 a základ Partnerů. Pro sdílenou crew, účty, úkoly, harmonogram, registrace, zóny a mobilní službu je připravený otestovaný kód. Tyto nové části ale nejsou spuštěné ve společném provozu. Finance jsou zatím demo a podrobné zadání. Importer a čtení původu jsou připravené v kódu; následná kontrola převodu a její UI ještě hotové nejsou. Úplné automatické vzdálené zálohy nejsou aktivované. Dnes oddělíme, co už vyhovuje, co má umět první verze každého modulu a co necháme později.“

Poslední celé ověření kódu je z12.11.2026:270 aplikačních testů,162 Python kontrol,37 původních Node kontrol, TypeScript/build a GitHub CI prošly. Dnešní příprava je kontrola dokumentace, zdrojů a stavu PR, nikoli nové spuštění testů nebo živá akceptace.26 připravených testů checkeru se mezi prošlé testy NEPOČÍTÁ. Viz [evidence historie](crew-history-verification.json).

## Jak povedeme hovor

1. Krátký souhrn skutečného stavu, potom jeden modul po druhém. Začít Lidi a crew, protože to je platná první priorita.
2. Vždy jeden konkrétní pracovní příklad a jedna otázka. Nechat uživatele domluvit; nepřeskakovat z jeho vysvětlení rovnou na další formulářové pole.
3. U modulu si ujasnit účel, kdo pracuje, potřebný vstup, běžný průchod a výsledek. Až potom stavy, obrazovku, práva a výjimky. Zachovat jednoduchou částečně ruční aplikaci.
4. Vysvětlovat běžnými slovy. Technické detaily řešit až tam, kde mění soukromí, sdílení nebo schopnost skutečně pracovat.
5. Po bloku stručně shrnout: potvrzeno / doporučení / otevřeno / odloženo. Mlčení ani „pokračuj“ nejsou souhlas se všemi podrobnostmi.
6. Potvrzené změny průběžně zapsat do příslušného modulu, DECISIONS a backlogu. Zápis udrží i konkrétní akceptační příklad. Úprava zadání není povolení skutečného importu nebo změna účtových grantů.

Není nutné projít vše v jediném hovoru. Krátká varianta: stav → crew → přístupy → finance → další priority. Úplná varianta přidá ostatní karty níže. Při přerušení zaznamenat poslední otevřenou otázku a pokračovat od ní.

## Doporučené pořadí

| Blok | Co spolu projít | Výstup |
| --- | --- | --- |
| 1. Stav a priority | Místní evidence, demo, kód, sdílený provoz; příprava do konce2026 versus potřeby před závodem. | Stejná představa, co je použitelné dnes a co se teprve připravuje. |
| 2. Lidi a crew | Kategorie, řádky/detail, PÁ/SO, potvrzení, potřeba lidí, domluvené odměny a historie. | Hranice první verze a chybějící úkony. |
| 3. Vedení, role a osobní práce | Vojta/Vlasta, delegované oblasti, manažeři, běžná crew, Moje práce. | Kdo vidí/upravuje co, bez automatického vytváření účtů. |
| 4. Partneři a Finance | Jedna domluva s partnerem a jeden výdaj s částečnou úhradou. | Význam stavů a Vlastův finanční rozsah. |
| 5. Denní operativa | Úkoly/harmonogram, registrace, zóny/mapa, mobilní služba. | Běžné postupy, vedoucí a potřebné vstupy. |
| 6. Produkce a závod | Stavba/návoz/odvoz, dodavatelé/dokumenty, Race Control a incidenty. | Co evidovat společně a co vyžaduje vlastní modul. |
| 7. Vzhled a další etapy | Claude Design, post-event, externí pohledy, AI. | Rozsah vizuálního zadání a odložených funkcí. |
| 8. Provoz a uzavření hovoru | Sdílení, zálohy/obnova, kontrola převodu, akceptace a další pořadí práce. | Konkrétní další balíky práce a samostatné aktivační kroky. |

## Stav jednotlivých částí

„Kód“ znamená implementované a synteticky ověřené, nikoli automaticky nasazené a zkontrolované na reálných účtech. Připravený modul není potvrzená účast lidí nebo závazek2027.

| Oblast | Co skutečně existuje | Co ještě hotové není |
| --- | --- | --- |
| Místní Lidi a crew | Editovatelná SQLite evidence2027, oddělená historie2026/2025, ukládání, kategorie/barvy, detail pod řádkem, kontakty/odměny, PÁ/SO, exporty/snímky. [21](21-LIDE-A-CREW-PRACOVNI-VERZE.md), [26](26-CREW-PATEK-SOBOTA.md). | Internetové sdílení, ověřené účty dalších lidí, aktuální skutečné domluvy a ruční úklid zdrojových nejasností. Dnešní stav jednotlivých lidí se v této přípravě nepřepočítával. |
| Sdílená crew a účty | Oddělené provozní/finanční oprávnění, roster, kategorie, formuláře a přehledy v kódu. [28](28-SDILENA-CREW-A-OPRAVNENI.md). | Živá aktivace, konkrétní členství, skutečný převod a víceúčtová/browser akceptace. |
| Import a historie | Náhled, porovnání cíle, transakční create/keep importer a privátní čtecí DB rozhraní. [33](33-CREW-PREVOD-A-NAHLED.md), [37](37-CREW-TRANSAKCNI-IMPORT.md), [40](40-CREW-CTENI-HISTORIE.md). | Checker39 není implementovaný: původní nativní běh skončil timeoutem.26 scénářů je pending; historie není zapojená do UI. Skutečný import nebyl spuštěný a zůstává zakázaný. |
| Moje práce / přehled vedení | Potvrzený obsah a UX směr; v provozním kódu existuje omezená Moje služba. | Kompletní osobní úvodní přehled vedení s propojením registrací/financí/partnerů není hotový. Dnešní hlavní routa stále otevírá Partnery, nikoli finální Moje práce. |
| Partneři | Funkční základ seznamu, kontaktů, ownera, partnerství, plnění, URL důkazů, historie a auditu; samostatné demo. [Model](10-PARTNERI-MODEL-A-FLOW.md). | UX stavy „řeší se“ a „uzavřeno“ v kódu chybí; portál, dotazník, upload souborů, VIP QR a report jsou další etapy. Dnešní živý provoz nebyl nově ověřovaný. |
| Finance a rozpočet | Propojené lokální demo a detailní plán skutečného backendu. [Model](11-FINANCE-MODEL-A-FLOW.md), [plán](11-FINANCE-IMPLEMENTACNI-PLAN.md). | Samostatný finanční backend, skutečný ledger a bezpečné provozní finance nejsou dodané. Crew odměny a registrační poplatek je nenahrazují. |
| Úkoly a harmonogram | Kód V1: odpovědný, zóna, místní časy akce, deadline, stav, seznam a inline úpravy. [30](30-PROVOZNI-MODULY.md). | Živý provoz, skutečné harmonogramy, automatické upozornění, závislosti směn a offline synchronizace. |
| Registrace závodníků | Ruční evidence V1, stav přihlášky, poplatek/úhrada a oddělené oprávnění v kódu. [30](30-PROVOZNI-MODULY.md). | Databáze jezdců, pravidla kategorií/kapacit/čísel, bankovní párování a skutečný import; nejsou hotové online samoobslužné přihlášky. |
| Zóny a mapa | Zóny, vedoucí, instrukce, explicitní pracovní kontakt a orientační relativní plán v kódu. | Skutečná uliční LIVE mapa, vrstvy, geolokace, offline, tisk v měřítku a potvrzování stáří dat jsou návrh [08](08-MAPA-A-ZONY.md). |
| Mobilní provoz | Responzivní Moje služba, vlastní přiřazení/úkoly, instrukce a kontakt v kódu. | Samoobslužné příchody/dokončování nejsou povolené; mobilní/venkovní browser akceptace a offline nejsou hotové. |
| Produkce, stavba a logistika | Role, záměr, původní organizační podklady a částečně obecné úkoly/zóny. [04](04-PRODUKCE-A-VLASTA.md). | Samostatný řízený návoz/odvoz, sklad, technika a předání areálu nejsou implementované moduly. |
| Dodavatelé a dokumenty | Návrhové potřeby, kontakty v existujících záznamech a URL u plnění. | Obecný modul dodavatelů, smluv/dokumentů, revizí, příloh a jejich přístupů není hotový. |
| Race Control / incidenty / bezpečnost | Organizační zadání a pracovní postupy [03](03-RACE-OPERATIONS.md), [05](05-KRIZOVE-PROCESY.md). | Bezpečnostně ověřený software READY/HOLD/GO, incident log, timing/radio integrace a krizové řízení nejsou implementované. |
| Post-event / média / další ročník | Zadání uzavření, výhrad, vypořádání, důkazů, reportu a předání historie. [12](12-POST-EVENT.md). | Ucelená automatizace a mediální archiv/reporty/feedback portály nejsou hotové. |
| AI a externí pohledy | Experimentální koncepce [09](09-AI-COPILOT.md). | Žádný ověřený provozní AI copilot ani kompletní portály rider/partner/media/divák. WhatsApp/Twilio zůstávají odložené. |
| Zálohy | Šifrovaný balíček, kolektory SQLite/DB/Storage a syntetické kontroly obnovy; soukromé místní snímky. [29](29-ZALOHY-IMPLEMENTACE.md). | Úplná automatická záloha mimo počítač, skutečný vzdálený vykonavatel/plánovač a ověřená obnova celé služby nejsou aktivované. |
| UX/UI a Claude Design | Zachovaná značka, Exo a tokeny; v hlavní pracovní kopii návrhové MD, wireframy a samostatný design brief. | Finální celková UX akceptace a finální návrh Claude Design nebyly doložené jako hotové. Prototyp není produkční aplikace. |

## Co už znovu nerozhodovat

- Aplikace má být jednoduchá, přehledná a částečně ruční. Zachovat značku SVDT, barvy a Exo.
- Crew je první priorita. Kategorie jsou sbalovací, mají vlastní barevný pruh, detail se otevírá pod řádkem. PÁ/SO od–do patří do přehledu.
- Rok2027 je pracovní,2026/2025 historie. Historická domluva nebo vyplacení se nepřenáší jako potvrzená skutečnost nového ročníku.
- Obsazenost vyžaduje konkrétního potvrzeného člověka pro potřebný termín. Přetížení není první etapa.
- Vojta a Vlasta pracují celoročně, ostatní hlavně provozně. Moje práce má směřovat na aktuální ročník; kritický problém delegované oblasti má být vidět i bez eskalace.
- U partnerů jsou potvrzený UX směr oslovený / řeší se / potvrzeno / uzavřeno a stejná evidence kandidátů/odmítnutých. Další krok není povinný. Fakturace/úhrada a plnění jsou samostatné informace.
- Vojta i Vlasta mohou v dohodnutém rozsahu samostatně zapsat/potvrdit výdaj a evidovat úhradu bez schválení druhým. Přesný rozsah Vlastova čtení/zápisu a správa grantů zůstávají otevřené.
- Neznámá částka není nula, potvrzeno není zaplaceno, barter není tok peněz a proplacení osobního výdaje nezapočítá náklad podruhé.

## Rozhodnutí připravená pro dnešní hovor

Nejde o otázky požadující odpověď před hovorem. Používat postupně podle [karet](42-HLASOVE-PROJITI-KARTY-MODULU.md):

1. Praktický rozsah první společné crew verze, odpovědní za aktualizace a potřeba lidí podle termínů.
2. Vlastův rozsah financí, soukromé poznámky/odměny a rozsahy dalších rolí; nezaměnit organizační funkci za databázové právo.
3. Význam nových partnerských stavů a uzavření oproti aktuálnímu kódu.
4. Kdo potvrzuje příchod, dokončení úkolu a připravenost oblasti, kdo opravuje chybu.
5. Požadovaná první úroveň mapy a skutečné podklady; oddělit plán zón od budoucího Race Control.
6. Rozhraní vlastní aplikace, Notionu a Miro: organizační board říká „Notion = zdroj pravdy“, zatímco vývojová specifikace žije v MD. Určit účel jednotlivých evidencí; žádná automatická synchronizace není dodaná ani nově schválená.
7. Další pořadí funkčního vývoje, designu, ruční akceptace a samostatné aktivace. Skutečný import se tímto hovorem automaticky nepovoluje.

## Zdrojové hranice a chybějící podklady

Načtené byly relevantní části projektových MD a hlavní pracovní UX dokumentace, dostupná část chatu „SVDT Staff Roles“ a textové oblasti poskytnutého organizačního Miro. Miro je zdroj ke společnému ověření rolí, nikoli důkaz potvrzené účasti v konkrétním termínu. Některé starší lokální dokumenty stále uvádějí překonané pořadí Partneři→Finance nebo historické počty; rozhoduje novější výslovné zadání a aktuální stav výše.

Původní personální sešit na výslovně uvedené cestě Downloads dnes není dostupný. Zachované jsou zpracované soukromé podklady, historický náhled a místní pracovní evidence. Rozpočet a tabulka partnerů mají zpracovaná projektová shrnutí; jejich původní Excel soubory nebyly dnes znovu otevřené. Mapy, loňský harmonogram, databáze jezdců a dodavatelské podklady nejsou tímto inventářem prohlášené za dodané. Přesné odkazy/dostupnost jsou v neveřejném podkladovém indexu.

## Zápis výsledku při hovoru

U každého bodu uložit datum, modul, výslovné rozhodnutí uživatele, změněnou hranici první verze, příklad „hotovo znamená“, odpovědnost a odkaz na upravené zadání. Nezapsat doporučení asistenta jako souhlas uživatele. Změna názvů stavů, skutečných účtů, mapování dat nebo aktivace má vlastní dopad; nepřepisovat historii automaticky.

Dnešní stav PR ověřený16.11.2026: [35](https://github.com/kabelkac77/SVDT2027/pull/35), [37](https://github.com/kabelkac77/SVDT2027/pull/37), [42](https://github.com/kabelkac77/SVDT2027/pull/42), [47](https://github.com/kabelkac77/SVDT2027/pull/47), [51](https://github.com/kabelkac77/SVDT2027/pull/51), [53](https://github.com/kabelkac77/SVDT2027/pull/53) a [55](https://github.com/kabelkac77/SVDT2027/pull/55) jsou otevřené Draft, nesloučené. To není doklad nasazení nebo funkčního živého provozu.
