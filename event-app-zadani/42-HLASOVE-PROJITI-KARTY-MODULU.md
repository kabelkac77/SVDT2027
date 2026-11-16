# SVDT 2027 — karty modulů pro hlasové zadání

Připravené návrhy otázek pro hovor16.11.2026. Nejde o nové schválení ani seznam dotazů k okamžitému vyplnění. Aktuální skutečný stav je v [osnově](41-HLASOVE-PROJITI-STAV-A-OSNOVA.md); materiály z Excelů a konkrétní jména/kontakty/částky se procházejí pouze soukromě.

U každé karty projít běžný pracovní příklad, potom hranici první verze a jedinou otevřenou otázku. Další otázku položit až po odpovědi. Doporučené minimum a akceptační příklad níže jsou návrh, nikoli uživatelské potvrzení.

## 1. Lidi a crew

**Účel:** rychle vidět, kdo zajišťuje konkrétní práci a co není potvrzené pro potřebný termín.
**Už potvrzeno:** tabulkový přehled podle minulého podkladu, sbalovací kategorie/pruhy, stav, inline detail, kontakty, peníze/barter/merch, PÁ/SO a uchovaná historie. Místní editace/uložení2027 jsou dodané.
**Pracovní příklad:** rozbalit kategorii → najít člověka → upravit termín/stav/domluvu → uložit → znovu načíst bez ztráty historie.
**První otázka pro hovor:** Který konkrétní úkon ti v dnešním přehledu lidí ještě nejvíc chybí?
**Potom vymezit:** potřebný počet na práci/termín, předběžná versus potvrzená účast, kdo aktualizuje, zástupy; samotný počet zdrojových řádků není počet potvrzených lidí.
**Návrh akceptace:** potvrzené jméno bez potřebného termínu nezakryje neobsazenou práci; starý údaj2026 se nemění. [21](21-LIDE-A-CREW-PRACOVNI-VERZE.md), [28](28-SDILENA-CREW-A-OPRAVNENI.md).

## 2. Sdílení, účty a oprávnění

**Účel:** Vojta, Vlasta a později vedoucí/crew pracují nad stejnými povolenými údaji.
**Stav:** kód připravený, konkrétní účty a živý provoz neaktivované. Organizační role není automatické technické oprávnění.
**Příklad:** koordinátor upraví termín ve své práci; běžný člen si otevře vlastní instrukce; chráněné odměny zůstanou nedostupné bez finančního práva.
**První otázka:** Koho kromě vás dvou potřebujeme pustit do první společné verze a jakou jednu práci tam má dělat?
**Potom vymezit:** celé ročníkové přehledy versus svěřená oblast, kontakty, soukromé poznámky, odměny, historie a exporty.
**Návrh akceptace:** zakázané údaje se nedají získat ani přímým požadavkem; odebrání role platí i při opakování starého požadavku. [28](28-SDILENA-CREW-A-OPRAVNENI.md), [34](34-SDILENY-PROVOZ-AKCEPTACE.md).

## 3. Moje práce a přehled vedení

**Účel:** po otevření aktuálního ročníku vidět rozhodnutí, termíny a problémy, které vyžadují zásah.
**Potvrzený obsah:** Vojta registrace/obsazenost/finance; Vlasta termíny/partneři/produkce. Ukázat ohrožující problém i z delegované oblasti. Kompletní propojený přehled není implementovaný.
**Příklad:** měsíc před závodem najít blokovanou oblast → vidět odpovědného → rovnou upravit jednoduchý údaj nebo předat úkol.
**První otázka:** Které rozhodnutí musíš z úvodního přehledu vyřešit bez proklikávání do dalších sekcí?
**Potom vymezit:** rozdíl celoroční přípravy, posledního měsíce, race week a race day; nevytvořit jeden přeplněný dashboard pro všechny.
**Návrh akceptace:** úvod umožní odbavit důležitou práci a jasně označí stáří nebo chybějící údaj; běžná delegovaná rutina ho nezaplní.

## 4. Partneři

**Účel:** jedna dohledatelná domluva namísto roztříštěných dokumentů a tabulek.
**Potvrzeno:** oslovený / řeší se / potvrzeno / uzavřeno, kandidáti i odmítnutí ve stejné evidenci, odmítnutí výchozím filtrem skrytí. Další krok není povinný. Kód V1 má dosud staré stavy.
**Příklad:** po telefonu zapsat domluvu, co dodá partner/co zajistíme my, změnit stav, později doložit plnění.
**První otázka:** Co konkrétně musí být splněné, abys partnera označil za uzavřeného?
**Potom vymezit:** samostatný stav plnění, fakturace a úhrady; převod starých stavů, přílohy versus odkazy, owner a mobilní kontakt.
**Návrh akceptace:** potvrzení partnera samo neoznačí úhradu ani splněné plnění; odmítnutí je dohledatelné bez zahlcení seznamu. [Model](10-PARTNERI-MODEL-A-FLOW.md).

## 5. Finance a rozpočet

**Účel:** přehled plánu, dohodnutých příjmů/nákladů a skutečných pohybů; jednoduché ruční odbavení.
**Potvrzeno:** samostatná obsluha výdaje Vojtou i Vlastou bez schválení druhým, ale přesný Vlastův datový rozsah zůstává otevřený. Zatím demo a zadání, ne finanční backend.
**Příklad:** pronájem15tisíc → záloha5tisíc → zbývá10tisíc; jiný výdaj zaplatí konkrétní osoba a následné proplacení se nezapočítá jako druhý náklad. Čísla jsou fiktivní příklad.
**První otázka:** Má Vlasta pracovat s celým rozpočtem, jen se svými partnery, nebo i s vlastní produkcí?
**Potom vymezit:** plán/domluva/úhrada, kdo vidí odměny, doklady, osobní plátce, opravy, splatnosti, barter a návaznost na partnera.
**Návrh akceptace:** neznámá hodnota není nula; zůstatek a osobní proplacení sedí; uživatel nevidí údaje mimo dohodnutý rozsah. Evidence platby není její odeslání do banky. [Plán](11-FINANCE-IMPLEMENTACNI-PLAN.md).

## 6. Úkoly a harmonogram

**Účel:** kdo, co, kde a do kdy; rychle poznat blokaci a další potřebný zásah.
**Stav:** V1 v kódu umí úkol, odpovědného, zónu, místní časy a deadline. Neumí automatické připomínky, kapacitní plánování nebo offline.
**Příklad:** objednání techniky → příjezd → připravené místo → předání odpovědnému; odlišit čas události od deadline úkolu.
**První otázka:** Který skutečný úsek příprav chceme jako první celý převést z vašeho současného harmonogramu?
**Potom vymezit:** přípravné měsíce versus minuta v race day, odpovědnost, vazby/blokace, změna termínu a kdo označí hotovo.
**Návrh akceptace:** zpožděný blokující úkol má odpovědného a je dohledatelný vedení; časy zůstanou v čase akce. [30](30-PROVOZNI-MODULY.md).

## 7. Registrace závodníků a rider care

**Účel:** přihláška, platba a prezence jsou srozumitelné samostatné údaje.
**Stav:** ruční registrační evidence v kódu; online formulář, kategorie/kapacity/čísla, import a bankovní párování nejsou hotové.
**Příklad:** dohledat přihlášku → ověřit poplatek → připravit prezenci/číslo → zapsat skutečnost dle pravidel.
**První otázka:** Odkud budou do první verze přihlášky přicházet a kdo je bude spravovat?
**Potom vymezit:** potřebná data/doklady, kategorie, kapacity, zrušení/náhradníci, čísla, registrační grant; zdravotní/licenční pravidla nevymýšlet odhadem.
**Návrh akceptace:** potvrzená přihláška neznamená zaplaceno a běžná crew nevidí soukromé kontakty riderů. [30](30-PROVOZNI-MODULY.md).

## 8. Zóny a mapa

**Účel:** dohledat místo, vedoucího, lidi, instrukce, vybavení a připravenost.
**Stav:** kód umí zóny a orientační plán. Uliční LIVE mapa, vrstvy, offline, sledování polohy a tisk v měřítku jsou další návrh.
**Příklad:** najít konkrétní zónu → instrukce a pracovní kontakt → navázané úkoly a změny na místě.
**První otázka:** Jakou konkrétní mapu nebo plán dnes používáte jako základ, který má první verze zobrazit?
**Potom vymezit:** traťové versus produkční zóny, vrstvy, tisk, poslední potvrzení dat, oprávnění; relativní bod není ověřená geografická poloha.
**Návrh akceptace:** bez podkladu se ukáže přiznaný plán, ne falešná přesná mapa; neaktuální informace není označená jako živě potvrzená. [08](08-MAPA-A-ZONY.md), [30](30-PROVOZNI-MODULY.md).

## 9. Produkce, stavba, sklad a logistika

**Účel:** odlehčit vedení; odpovědnost za návoz, stavbu, techniku, předání a odvoz je dohledatelná.
**Stav:** organizační zadání, obecné úkoly a zóny; samostatný sklad/návoz/demontáž nejsou implementované.
**Příklad:** překážka ve skladu → vozidlo/nakládka → místo/čas vykládky → montáž/předání → demontáž/návrat. Bez předpokladu detailní kusové inventury v první verzi.
**První otázka:** Která dnešní logistická práce zbytečně končí na tobě nebo Vlastovi a potřebuje vlastního odpovědného?
**Potom vymezit:** vedoucí stavby versus logistika překážek, produkční vedoucí versus partner/VIP, zóny, technika a dodavatelé, výhrady a fyzické vyklizení.
**Návrh akceptace:** z úkolu je jasné kdo/odkud/kam/kdy a kdo potvrdil předání; aplikace neoznačí fyzicky nedokončenou oblast za bezproblémovou. [01](01-ORGANIZACNI-STRUKTURA.md), [04](04-PRODUKCE-A-VLASTA.md), [12](12-POST-EVENT.md).

## 10. Dodavatelé, dokumenty a podklady

**Účel:** u práce rychle najít platnou domluvu, kontakt a správný dokument.
**Stav:** u partnerů existují kontakty/URL; jednotný dodavatelský a dokumentový modul není hotový. Kód zálohování Storage není uživatelský upload příloh.
**Příklad:** najít dodavatele techniky → kontakt → objednávka/smlouva → plán příjezdu a odpovědný.
**První otázka:** Které tři druhy dokumentů nebo dodavatelských dohod nejčastěji hledáte po složkách?
**Potom vymezit:** odkaz versus soukromý upload, platná verze, vazba na ročník/zónu/partnera, viditelnost a archiv; soukromé soubory nepatří do veřejného webrootu.
**Návrh akceptace:** oprávněný člověk najde platný podklad z kontextu práce, jiný jej nezíská přímým odkazem.

## 11. Race Control, incidenty a bezpečnost

**Účel:** řídit ověřený provoz a eskalace, zatímco Vojta zůstává mobilní Race Director.
**Stav:** organizační postupy a role, ne hotová kritická aplikace. Miro a starší specifikace mají rozdílné úrovně a kandidáty rolí; nejde o nové potvrzení obsazení.
**Příklad:** hlášení problému → čas/oblast/odpovědný → vyřešení a jasný stav. Kritické READY/HOLD/GO vyžaduje zvlášť schválenou odpovědnost a skutečnou provozní validaci.
**První otázka:** Co má první verze jen evidovat a u čeho opravdu očekáváš, že na aplikaci bude stát rozhodnutí o provozu?
**Potom vymezit:** kompetence Race Coordinatora, incident log, timing/broadcast/IZS vazby, stáří dat, výpadek spojení a funkční ruční záloha. Nepovažovat mobilní seznam úkolů za Race Control.
**Návrh akceptace:** kritické rozhodnutí nelze zaměnit s neověřenou poznámkou; závod funguje i bez AI a bez nehotové aplikace. [03](03-RACE-OPERATIONS.md), [05](05-KRIZOVE-PROCESY.md).

## 12. Mobilní crew, vedoucí a docházka

**Účel:** člověk rychle zjistí kdy/kam přijít, co má dělat a komu volat; vedoucí řeší vlastní oblast.
**Stav:** responzivní Moje služba v kódu. Samoobslužné příchody/dokončení nejsou zapnuté ani odsouhlasené.
**Příklad:** otevřít svou službu → instrukce/kontakt → povolená akce podle role.
**První otázka:** Má příchod a dokončení práce potvrzovat sám člen crew, jeho vedoucí, nebo každý něco jiného?
**Potom vymezit:** kdo opravuje chybný zápis, zástupy a vypůjčený telefon; účast, docházka, odpracovaný čas a nárok na odměnu nejsou totéž.
**Návrh akceptace:** uživatel nesplní práci někomu jinému a nevidí skryté odměny; čitelnost venku a výpadek mají vlastní ruční akceptaci. [30](30-PROVOZNI-MODULY.md).

## 13. Post-event, média a další ročník

**Účel:** uzavřít fyzický prostor, finance a partnerská plnění a uchovat použitelnou paměť akce.
**Stav:** zadání a částečná historie/URL plnění, ne ucelený post-event modul.
**Příklad:** zóna uzavřená s výhradou → dořešení odvozu → doklad/foto plnění → finanční vypořádání → lessons learned pro další rok.
**První otázka:** Která práce po závodě vám dnes nejčastěji zůstane nedotažená a chceš ji hlídat jako první?
**Potom vymezit:** uzavření s výhradou, archiv médií a přístupy, reporty, feedback, selektivní převzetí kandidátů/šablon bez starých plateb a incidentů.
**Návrh akceptace:** historický stav zůstane dohledatelný; nový rok nezačíná jako automaticky zaplacený nebo personálně potvrzený. [12](12-POST-EVENT.md).

## 14. AI, hlas a externí portály

**Účel:** usnadnit hledání a zápis, ne vytvořit závislost kritického provozu na AI.
**Stav:** koncepce. Žádný ověřený integrovaný hlasový copilot ani úplné partner/rider/media/divák portály. Nynější hlasový rozhovor o zadání není implementovaný hlas v aplikaci.
**Příklad:** nadiktovat návrh úkolu/poznámky → zkontrolovat → člověk potvrdí uložení do správné oblasti.
**První otázka:** Který jeden hlasový úkon by ti skutečně ušetřil práci jako první?
**Potom vymezit:** komu jsou data dostupná, potvrzení kritických akcí, cenu/limity a chování při výpadku. WhatsApp/Twilio zůstávají odložené, nerozesílat zprávy mlčky.
**Návrh akceptace:** chybný výstup AI sám nezmění kritický stav a jádro pracuje bez AI. [09](09-AI-COPILOT.md).

## 15. UX/UI, navigace a Claude Design

**Účel:** přehledná každodenní aplikace se stejnou značkou; minimum prokliků zejména pro Vlastu.
**Potvrzeno:** Exo/barvy/identita se zachovají. Tabulková hustota, inline detail a rychlé změny jsou základ crew. Finální univerzální navigace, světlo/tma a terénní čitelnost nejsou uzavřené.
**Příklad:** jeden realistický pracovní seznam na desktopu a stejný úkol na telefonu, včetně chyby/konfliktu/neuložených změn.
**První otázka:** Které obrazovky potřebujeme dát Claude Design jako první, aby výsledek pomohl práci a neřešil jen vzhled?
**Potom vymezit:** společná kostra, role, stavy, návrh versus fungující software. Připravený brief13–20 je v hlavní pracovní kopii a uvedený v soukromém indexu; bez předpokladu automatického přístupu designového nástroje k Macu.
**Návrh akceptace:** uživatel zvládne klíčový průchod; fiktivní designová data neobsahují skutečné kontakty, výplaty ani dokumenty.

## 16. Sdílený provoz, zálohy a řízený převod

**Účel:** spolehlivě sdílet a obnovit údaje bez závislosti na jednom počítači.
**Stav:** připravený importer a kolektory/šifrování, ale checker není hotový a vzdálený plánovaný provoz/úplná obnova nejsou ověřené ani aktivované.
**Příklad:** po samostatném povolení převést schválený rozsah → porovnat → otestovat různé účty → obnovit úplnou vzdálenou kopii mimo živý systém. Dnes žádný takový skutečný krok neprovádíme.
**První otázka:** Kdo má v první společné verzi pracovat odkud a potřebujete dostupnost i při vypnutém tvém Macu?
**Potom vymezit:** hosting, přístupy, operátor, schválené mapování, vzdálený cíl/klíč, plán/monitoring/retence, akceptace a termín přechodu.
**Návrh akceptace:** doložená obnova celé deklarované služby, ne jen Git nebo synchronizovaná složka. Souhlas s UX nenahrazuje výslovný aktivační pokyn. [29](29-ZALOHY-IMPLEMENTACE.md), [31](31-AKTIVACE-A-RUCNI-KONTROLY.md), [34](34-SDILENY-PROVOZ-AKCEPTACE.md).
