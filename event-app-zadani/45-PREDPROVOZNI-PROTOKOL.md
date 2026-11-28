# Předprovozní protokol a evidence důkazů

Připraveno2026-11-27 pro pozdější použití podle [31](31-AKTIVACE-A-RUCNI-KONTROLY.md), [32](32-PREDPROVOZNI-KONTROLA.md) a [34](34-SDILENY-PROVOZ-AKCEPTACE.md). Tento formulář nic nespouští ani neuděluje souhlas. Vyplněná kopie se skutečnými identifikátory, účty a odkazy patří pouze do neveřejné provozní evidence; ne do veřejného PR/CI. Hesla, tokeny a obnovovací klíče do protokolu nepatří.

## Pravidla záznamu

Stavy: **NEPROVEDENO**, **BLOKOVÁNO**, **PROŠLO**, **NEPROŠLO**. Výchozí stav živých kroků je NEPROVEDENO, nikoli PROŠLO. Každé PROŠLO vyžaduje čas/časovou zónu, vykonavatele, přesný build/commit, potvrzené prostředí, očekávání, skutečný výsledek a neveřejnou referenci důkazu. Test, jehož modul chybí, není úspěšný po kontrole syntaxe. Lokální fixture, CI, izolovaný skutečný PostgreSQL a živý provoz jsou různé úrovně důkazu.

Zjištěnou odchylku zaznamenat se závažností, omezením a dalším krokem; neodškrtávat ji obecným „řeší se“. Blokace zápisu/importu/zálohy neopravňuje automaticky změnit role, přepnout účet, opakovat jiný request nebo nahradit aktuální zdroj starým snapshotem.

## Záhlaví soukromé kopie

| Pole | Vyplnit až později |
| --- | --- |
| ID protokolu / časové okno | — |
| Vykonavatel / nezávislý kontrolující | — |
| Potvrzený projekt a ročník | — |
| Schválený commit / verze aplikace | — |
| Migrační inventář a hashe, zjištěný aplikovaný stav | — |
| Výchozí autoritativní zdroj zápisů | — |
| Zdrojový snapshot, datum a SHA256 | — |
| Cílový export, datum a serverový fingerprint | — |
| Odkazy na soukromé důkazy / výjimky | — |
| Samostatný rozsah souhlasu, kdo a kdy jej dal | — |

## Pořadí kontrol a podmínky pokračování

| ID / krok | Konkrétní požadovaný důkaz | Stav dnes |
| --- | --- | --- |
| G01 Správné prostředí | Potvrzená identita projektu, dostupnost, schválený commit a operátor. Veřejný klient není přístup pro dump/DDL. | BLOKOVÁNO přístupy/potvrzením |
| G02 Katalog a migrace | Soukromý katalogový výstup a porovnání přesných7 migračních hashů; identifikovat již aplikované části bez opakování DDL. Inventář dnes očekává26 aplikačních +4 platformní tabulky a27 kontrolovaných funkcí. Přítomnost není důkaz správného těla nebo aktivace. | NEPROVEDENO živě |
| G03 Úplná záloha a obnova | Všech6 zdrojů/inventářů, skutečný vzdálený šifrovaný balíček, nezávislé stažení, oddělený dostupný klíč a izolovaná obnova DB/Auth/Storage + aktuálního SQLite a soukromých vstupů. Reference nestačí bez obnovy. | BLOKOVÁNO infrastrukturou |
| G04 Přístupy | Oddělené skutečné testovací účty a výslovné scopes. Povolené i zakázané případy34 přes server, včetně revokace. Crew odměny nejsou celý rozpočet; Vlastův finanční rozsah zůstává k potvrzení. | BLOKOVÁNO účty/rozsahem |
| G05 Mapování a kontrolní protokol | Úplné explicitní mapování každého zdrojového řádku/kategorie, identity create/keep, nový cílový export; dokončený checker39/43, receipt/readback a porovnání bez ztráty. Syntetická shoda není autorita reálných vstupů. | BLOKOVÁNO implementací a mapováním |
| G06 Souběh a obnova chyb | Skutečný víceklientový PostgreSQL: zámky, ztráta role, konflikt verzí, rollback, timeout/nejasná odpověď a opakování téhož requestu. PGlite netestuje síť ani více klientů. | NEPROVEDENO |
| G07 Browser/mobil | HTTPS/OAuth dvěma účty, žádná data staré identity, draft/konflikty, sbalování/PÁ/SO, samostatné scénáře historie44 po její implementaci. | BLOKOVÁNO UI/prostředím |
| G08 Pravidelný provoz záloh | Reálný plánovač/vykonavatel, zaznamenaný úspěch i chyba/zmeškaný běh, upozornění a retence posledního obnovitelného bodu; opakovaně ověřená obnova. | BLOKOVÁNO infrastrukturou |
| G09 Aktivační rozhodnutí | Vyhodnocené G01–G08, otevřené výjimky a samostatný výslovný pokyn k přesně vymezenému skutečnému importu/produkčnímu nasazení. Současný zákaz skutečného importu platí. | BLOKOVÁNO samostatným souhlasem |
| G10 Předání autority zápisu | Až po povoleném převodu kontrola skutečného výsledku, uzavření místního zdroje readonly a určení jediného místa zápisu; žádná tichá obousměrná synchronizace. | NEPROVEDENO, závisí naG09 |

Vývojové přihlášení Claude je samostatná překážka kódu, nikoli aplikované Auth oprávnění pro G04 nebo oprávnění k importu. Případné připravení izolovaného testovacího prostředí pro G04/G06/G07 má vlastní omezený rozsah a oprávnění; nelze jej zaměnit za produkční aktivaci G09. Zaznamenání tohoto formuláře nepředstavuje žádnou z uvedených provozních bran za splněnou.

## Záznam jednoho testu — kopírovat pro každý případ

| Pole | Vyplnit |
| --- | --- |
| ID případu / odkaz34 nebo HUI44 | — |
| Prostředí a druh důkazu | — |
| Účet/role/scope před testem (bez tokenu) | — |
| Předpoklady, syntetický řádek a výchozí verze | — |
| Konkrétní akce a očekávaný výsledek | — |
| Skutečný výsledek / bezpečný kód chyby | — |
| Kontrola dat/auditu/identity po testu | — |
| Čas, vykonavatel, kontrolující, reference důkazu | — |
| Stav, odchylka a další krok | NEPROVEDENO |

## Rozhodnutí až po vyhodnocení

Povolený rozsah: **žádný nový**. Skutečný import: **zakázaný**. Živý sdílený provoz a automatické úplné vzdálené zálohy: **dosud neaktivované**. Pracovní SQLite a historie zůstávají zachované. Předložené UI texty a otevřené produktové otázky nejsou odsouhlasené mlčením.

## Dodatečný důkaz inventáře pro G03

Zaznamenat přesný schválený seznam requiredRelations a jeho vazbu na skutečně aplikovaný stav G02. Obecné minimum7 relací kolektoru není úplný inventář aplikace. Očekávaných30 relací katalogu platí pro celé cílové schéma; před jeho aktivací se zálohuje skutečný existující stav a po aktivaci i nové tabulky. Uložit výsledek kontroly TABLE DATA pro všechny deklarované relace, nikoli pouze hashe dumpu. Žádná z těchto kontrol sama nepotvrzuje obnovu, globální role, Storage bajty nebo externí Auth konfiguraci.

## Dílčí izolovaný důkaz G03/G06 — 2026-11-27

Podle46 prošly4 skutečné PostgreSQL18.6 případy: tři souběhy s pozorovanými zámky a obnova skutečného custom dumpu přes stávající kolektor do nové DB.30 tabulek, původní zdroj/historie/NULL0, aplikační RLS/politiky a vybrané zákazy RPC zachované. Živé stavy v tabulce výše se tím nemění: Auth/Storage jsou minimální fixture, role jsou předem vytvořené na témže syntetickém serveru, nikoli obnovené z dumpu; chybí reálný provider/OAuth/Storage bajty/vzdálená obnova/klíč/browser a další souběhy. Sanitizovaný důkaz viz [46](46-IZOLOVANY-POSTGRES-SOUBEH-A-OBNOVA.md).

## Dodatečná překážka G05/G06/G09 — 2026-11-28

Oprava48 / issue61 musí předcházet aktivaci. Samostatný RX01 reproducer po tabulkovém čekání selhal: RPC vytvořilo nový syntetický import po expiraci. Šest běžných PG scénářů a SIGTERM47 prošly, ale chybu nezneplatňují. Vyžadovat opravený commit/migrační hash a úspěšný stejný striktní ShareRowExclusiveLock reproducer; teprve potom dále posuzovat ostatní živé brány. Žádný souhlas nebo skutečný import tímto zápisem nevzniká.

## Dílčí doplnění souběhů a recovery49 — 2026-11-28

RP07–RP10 rozšiřují izolovaný důkaz o různé requesty, ztrátu klientského výsledku po commit a dvě oddělené akce2027 se skutečně pozorovaným globálním zámkem; skutečný pád serveru před/po COMMIT zachoval rollback/potvrzená data a přesný replay. SIGKILL/recovery po ready checkpointu a druhý idempotentní úklid prošly. Nejde o provozní obnovu ani důkaz výpadku napájení; existující orphan volume se automaticky nemaže. G05/G06/G09 dál blokuje61/48, RX01 je stále selhávající. Živé projektové/backup/Auth/Storage/browser brány zůstávají otevřené.

## Dílčí důkaz chyb startu50 — 2026-11-28

Čtyři skutečné řízené chyby startu a jejich opakovaná recovery v nových procesech prošly; v2 odlišuje prepared/creating a chybějící ID přebírá jen z ověřených živých metadat. Creating+absence či orphan se automaticky neuklízí. Jde pouze o testovací infrastrukturu. Živé stavy G03/G06, fyzický výpadek hostitele, provider/Auth/Storage/vzdálené zálohy a aktivační rozhodnutí zůstávají neprovedené. Striktní RX01 opět selhal,48/61 je stále blokátor. Viz [50](50-POSTGRES-STARTUP-A-NEUPLNE-CHECKPOINTY.md).

## Dílčí důkaz ochrany evidence51 — 2026-11-28

Poškozené/chybějící checkpointy a změna během inspekce zastaví testovací cleanup bez přepsání důkazů. Prošly3 skutečné řízené chyby publikace checkpointu/reportu a následná/opakovaná recovery;13 nových unit případů odlišuje ověřený úklid od neuloženého výsledku. Viz [51](51-POSTGRES-POSKOZENA-EVIDENCE-A-CHYBY-ZAPISU.md). Živé stavy G03/G06 ani souhlas s výpadkem hostitele/aktivací se nemění. Fyzický disk/power loss, provider/Auth/Storage/vzdálená obnova nejsou ověřené;48/61 zůstává blokátor.

## Dílčí důkaz koordinace recovery52 — 2026-11-28

Společný flock ochránil aktivní syntetický test i souběh dvou recovery procesů. Pozdní chyby po odstranění/publikaci byly samostatně ověřené, včetně nového nezávislého potvrzení již provedených kroků a opakování. [52](52-POSTGRES-SOUBEZNA-RECOVERY-A-POZDNI-CHYBY.md) je technický dílčí důkaz, nikoli změna živých stavů G03/G06 nebo souhlas s výpadkem hostitele. Uložený report může být dřívější snapshot; vyžadovat finální odpověď a exit, při ztrátě nové ověření.48/61 i ostatní živé účty/backup/Auth/Storage/browser brány zůstávají otevřené.

## Dílčí důkaz pádu recovery53 — 2026-11-28

Pět řízených SIGKILL přímo držitele syntetické recovery a nové/opakované převzetí prošly. Samostatný metadatový inventář deklarovaného testovacího rozsahu je pouze read-only přítomnostní snapshot, ne oprávnění smazat nálezy nebo důkaz platnosti checkpointů/živosti zámků. Viz [53](53-POSTGRES-PRERUSENI-RECOVERY-A-INVENTAR.md). Živé stavy G03/G06 ani souhlas s výpadkem hostitele/aktivací se nemění;48/61 a projektové/Auth/Storage/backup/browser brány zůstávají otevřené.

## Dílčí54 a změna implementátora — 2026-11-28

Přímo Codexem ověřené4 filesystem SIGKILL před zveřejněním a6 skutečných adresářových fixture závodů. Zachované syntetické zbytky pouze evidované, inventář není autorita k mazání/živé aktivaci. [54](54-POSTGRES-CASTECNY-ZAPIS-A-ZMENY-ADRESARU.md). Přihlášení Claude už neblokuje implementaci; uživatel výslovně určil přímý Codex.48/61 stále neopravena a přednostní, živé stavy G03/G06/projektové účty/backup/Auth/Storage/browser i samostatný aktivační pokyn zůstávají otevřené.
