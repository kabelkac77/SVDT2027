# Aktivace a odložené ruční kontroly

## 2026-11-28 — oprava61 implementovaná a synteticky ověřená55

- [x] Technická oprava48/61 v55 implementovaná přímo Codexem a synteticky ověřená: RX01 prošel1/1,12 standardních PG včetně dump/restore,281 app/DB a234 hostitelských kontrol. Sedm původních migrací neměněno, nová8. autoApply:false.
- [ ] Později projít Draft PR a skutečně aplikovaný stav potvrzeného projektu. Není doloženo sloučení/nasazení nebo živé tělo; existence původní signatury v katalogu není důkaz8. opravy. Porovnat prosrc hash/owner/config/ACL a bezpečnou akceptaci55.
- [ ] Před aktivací vyplnit ostatní živé45 důkazy (Auth/scopes/účty/Storage/provider/úplná vzdálená obnova/browser a výslovný souhlas s importem). Technicky zelený RX01 není automatická aktivace; skutečný import stále zakázaný.
- [ ]4 syntetické soukromé temporaries z54 posoudit až později, žádné automatické mazání/obsahové čtení pro inventář. Bez dotazů nyní; Claude přihlášení není podmínka pokračování43/39/44.

## 2026-11-28 — přímý Codex a přerušení zápisu54

- [x] Výslovný pokyn: implementaci nyní provádí přímo Codex. Přihlášení Claude nevyžadovat jako blokátor; případný návrat k němu je volitelný pozdější krok, guard/účet beze změny.
- [x] Dílčí54:4 skutečná přerušení zápisu a6 závodů inventáře,234 hostitelských/70 optimalizovaných,10 skutečných PG/5 přerušení recovery ověřené.
- [ ] Čtyři zachované soukromé syntetické temporaries po SIGKILL/nejasné zbytky posoudit později; bez čtení obsahu pro inventář a bez automatického mazání. Nejsou publikovaným reportem, zámek není stale PID.
- [ ] Před aktivací opravit48/issue61 přímo Codexem a ověřit stejný striktní RX01; nyní selhává0/1. Živé účty/OAuth/Storage/provider/klíč/plná vzdálená obnova/browser/aktivace nadále podle45. Zákaz skutečného importu platí, bez dotazů nyní.

## 2026-11-28 — přerušení recovery a inventář53

- [x] Dílčí53:5 skutečných SIGKILL držitele recovery a nové/opakované převzetí ověřené;226 hostitelských/62 optimalizovaných kontrol prošlo. Řízené body nejsou power loss nebo přerušení uprostřed zápisu.
- [x] Metadatový inventář deklarovaného testovacího rozsahu642 položek bez čtení obsahu/mazání/Dockeru/flock; podrobné nálezy soukromě. Známé credentials a publikační temporaries nenalezené, evidence/zámky/značky zachované.
- [ ] Případné budoucí soukromé zbytky nebo nejasný/orphan stav bezpečně posoudit; inventář nepovoluje mazání, zámek není stale PID a uložený report neprokazuje finální úspěch.
- [ ] Fyzický disk/power loss/síťový filesystem a skutečnou vzdálenou obnovu ověřit až v dohodnutém prostředí. Před aktivací dál48/issue61 a živé brány45; RX01 stále selhává. Přístupy a potvrzení na později, bez dotazů nyní a bez skutečného importu.

## 2026-11-28 — souběžná recovery a pozdní chyby52

- [x] Dílčí52: ochrana aktivního testu a souběh dvou recovery procesů skutečně ověřené; druhý busy bez změny. Šest řízených I/O bodů včetně3 pozdních s novou/opakovanou recovery prošlo.215 hostitelských/51 optimalizovaných kontrol prošlo.
- [ ] Nejasné finální výsledky nebo soukromé dočasné hardlinky později bezpečně posoudit; uložený report sám neprokazuje dokončení. Zámkový soubor nemažte podle domněnky, nepoužívat PID/stáří jako autorizaci.
- [ ] Síťový filesystem, fyzický disk/power loss a úplnou vzdálenou obnovu ověřit v dohodnutém prostředí. Společný flock je pro spolupracující procesy na stejném podporovaném hostu.
- [ ] Před aktivací dál48/issue61 a živé brány45. RX01 selhává; přístupy a potvrzení na později, bez dotazů nyní a bez skutečného importu.

## 2026-11-28 — poškozená evidence a chyby zápisu51

- [x] Dílčí důkaz51: poškozené checkpointy se neinterpretují ani nepřepisují při cleanup;203 hostitelských/39 optimalizovaných kontrol a3 skutečné řízené I/O chyby s novou/opakovanou recovery prošly.
- [ ] Poškozenou/ztracenou evidenci, nejasné/orphan prostředky nebo neuložený report později bezpečně posoudit. Samotný existující report není důkaz dokončeného procesu; ověřit exit i výsledek úklidu. Žádný prune/automatická rekonstrukce z odhadu.
- [ ] Power loss/disk full, pozdní I/O chyby a případný výpadek hostitele vyžadují dohodnuté prostředí; řízené chyby51 je nenahrazují.
- [ ] Před aktivací stále opravit48/issue61 a projít živé brány45. RX01 selhává; přístupy a potvrzení zůstávají na později, skutečný import zakázaný. Zatím bez dotazů.

## 2026-11-28 — chyby startu a neúplné checkpointy50

- [x] Dílčí start/recovery50:4 řízené skutečné chyby, ztracené ID ověřené z živých metadat, čtyři opakované recovery.190 hostitelských/26 optimalizovaných a10 standardních PG, SIGTERM/SIGKILL prošlo.
- [ ] Creating bez kontejneru/orphan či neověřitelný checkpoint později ručně posoudit; žádné slepé opakování create, globální prune nebo volume rm. CP sám zásah neautorizuje.
- [ ] Fyzický výpadek hostitele/disk full a úplnou vzdálenou obnovu řešit až v dohodnutém prostředí. Řízené chyby50 tento důkaz nenahrazují.
- [ ] Před aktivací dál48/issue61 a živé projektové/Auth/Storage/backup/browser brány45. RX01 stále selhává. Přístupy/potvrzení odložené, skutečný import zakázaný; bez dotazů nyní.

## 2026-11-28 — dílčí recovery a souběhy49

- [x] Čtyři další skutečné případy souběhu/pádu serveru a řízený SIGKILL→nový recovery proces→opakovaná recovery ověřené na vlastních syntetických serverech. Kontejnery/volumes/přístupy uklizené;10 standardních PG případů,182 hostitelských a18 optimalizovaných bezpečnostních prošlo.
- [ ] Nepřenášet tento důkaz na výpadek napájení, ztrátu/neúplnost checkpointu, cizí/orphan volumes nebo provozní data. Při neprokázané identitě recovery odmítne zásah, případné ruční posouzení evidovat zvlášť.
- [ ] Před aktivací dál opravit48/issue61 a projít skutečné projektové/user JWT/OAuth/backup/restore/browser brány45. Striktní RX01 stále selhává a runtime oprava hotová není.

Bez přístupových dotazů a bez provozního importu/DDL/grant/deploy nebo vzdálené aktivace. Checkpoint není uživatelské schválení skutečného převodu crew.

## 2026-11-28 — potvrzená překážka aktivace: expirace po čekání

- [x] SIGTERM/checkpoint47, šest běžných skutečných PG scénářů a174 hostitelských kontrol ověřené; samy nepovolují aktivaci.
- [ ] **Před jakoukoli aktivací opravit a samostatně akceptovat48 / issue61.** RX01 přes ShareRowExclusiveLock vytvořil nový syntetický import i po expiraci schválení. Reproducer nyní selhává a není počítaný jako úspěch.
- [ ] Po opravě znovu ověřit RX01, úspěšný replay po expiraci, ostatní oprávnění/rollback a skutečný syntetický dump/restore se8. migrací. Zelené běžné CI není náhrada tohoto důkazu.
- [ ] SIGKILL/power loss a automatický úklid z checkpointu dosud nejsou ověřené; nikdy nekopírovat jeho ID do globálního prune nebo mazat cizí resources.

Bez dotazů na přístupy a bez nativního auth/model pokusu. Dosavadní zákaz skutečného importu a ostatní živé brány zůstávají v platnosti.

## 2026-11-27 — izolovaná zkouška místo provozní aktivace

- [x]4 skutečné testy46 v novém vlastním PostgreSQL prošly:3 souběhové případy a skutečný dump/restore30 tabulek; normální úklid vlastního kontejneru/volumes/přístupů ověřený.
- [ ] Později ověřit globální role a konfiguraci skutečného Auth/Storage, skutečný vzdálený balíček/klíč a izolovanou obnovu v jiném cílovém prostředí. Současná testovací DB je na témže syntetickém serveru a platformní tabulky jsou minimální fixture.
- [ ] Živé user JWT/OAuth, skutečná transportní oprávnění a browser, další souběhy a samostatné aktivační rozhodnutí zůstávají podle45 otevřené.170 hostitelských testů +4 skutečné izolované případy nejsou provozní souhlas.
- [ ] Samostatně dopracovat nouzový checkpoint a úklid při násilném ukončení hostitele; nikdy globální prune nebo mazání cizího kontejneru.

Žádné dotazy na přístupy, žádný skutečný import nebo produkční DDL/grant/deploy v tomto bloku. Vývojové přihlášení Claude se znovu nekontrolovalo.

## 2026-11-27 — podklady připravené bez dalších přístupů

- [x] Připravený návrh44 pro historii pod řádkem a12 konkrétních browser případů. UI ani browser průchod nejsou hotové.
- [x] Připravený protokol45 pro soukromou evidenci skutečných důkazů, rolí, obnovy a samostatného aktivačního rozhodnutí. Výchozí živé kroky NEPROVEDENO/BLOKOVÁNO.
- [ ] Později projít návrh textů a ovládání historie44; určit politiku reautorizace dlouho otevřeného citlivého obsahu. Test odebrání role při dalším volání není okamžité vzdálené odvolání již zobrazených dat.
- [ ] Po implementaci UI provést všech12 HUI scénářů v povoleném prostředí se syntetickými podklady a oddělenými skutečnými testovacími účty. Žádné reálné osoby do veřejných fixture/logů.
- [ ] Před aktivací vyplnit soukromou kopii45 skutečnými výsledky; nepřevzít úspěšné lokální/CI testy jako živou autoritu nebo důkaz zálohy/obnovy.

Zákaz skutečného importu dál platí. Přihlášení Claude ani provozní přístupy se v tomto bloku znovu nekontrolovaly a nevyžadovaly.

## 2026-11-27 — nativní vývojové přihlášení na později

- [ ] Až později obnovit přihlášení místního Claude Code ke stávajícímu nativnímu účtu/předplatnému. Dnes ověřeno pouze auth status exit1/loggedIn:false/authMethod:none; žádný pokus o přihlášení, přepnutí účtu nebo změnu kvóty. Nevyžadovat hesla/klíče do chatu.
- [ ] Po obnovení znovu ověřit čistý HEAD/rozsah a společný guard při novém konkrétním běhu parseru43. Dnešní selhání nebylo modelovým timeoutem a žádný modelový výstup nevznikl.
- [ ] Zlepšit bezpečnou diagnostiku runneru při nenulovém návratu auth status: nyní se projeví obecné HOST_IO_OR_RESPONSE_FAILED; testy ověřují zastavení bez modelu/zápisu, nikoli přesnější veřejnou kategorii.

Tato vývojová kontrola nenahrazuje žádnou provozní bránu a nepovoluje import/DDL/granty nebo nasazení. Zaznamenáno bez dotazu podle dřívějšího pokynu uživatele.

## 2026-11-12 — čtecí historie a odložené kontroly

- [x] Čtecí DB rozhraní40 v kódu,6 PGlite scénářů, bez živého DDL. Inventář nyní7 migrací; předchozí počty níže jsou historické.
- [ ] Při pozdější aktivaci ověřit skutečný admin správného2027, odebrání role, zákaz finančního koordinátora/člena/viewera a cizího ročníku. Archiv pouze readonly.
- [ ] Po zapojení UI projít výběr zdroje a bezpečné vykreslení původních sloupců/historie jako textu. Bez přenosu do dema/public/localStorage/logů. UI zatím není implementované.
- [ ] Implementovat a spustit kontrolní protokol39; nativní timeout není hotová implementace ani schválení. Při porovnání používat přesné schválené identity z plánu, ne zdrojové defaultní unresolved.
- [ ] Autorita exportů/readbacku, skutečná záloha/obnova, živý souběh a samotný import/aktivace zůstávají na samostatné pozdější potvrzení. Nyní bez otázek a bez skutečného importu.


## 2026-11-05 — importer připravený v kódu, skutečný převod zakázaný

- [x] Implementovat a synteticky ověřit transakční V1 podle37/38. Předchozí nedokončený bod níže je tímto splněný pouze pro kód/testy.
- [ ] Až později ověřit dostupný správný projekt a stav všech6 migrací; nedělat automatické DDL/granty podle přítomnosti tabulek.
- [ ] Projít úplné privátní mapování všech kategorií/řádků: explicitní create/keep, zachované identity a verze. Stav/finance roku2027 nepotvrzovat z historie2026.
- [ ] Určit konkrétního provozního operátora a způsob vystavení/odvolání neměnného schválení; funkce stage/revoke nejsou klientům povolené. Nastavit správného aktéra a ověřit minimální infrastrukturní přístup bez obcházení RLS.
- [ ] Skutečně ověřit úplnou vzdálenou zálohu a izolovanou obnovu DB/Auth/Storage včetně nových4 tabulek. Backup receipt hash je reference, ne samostatný důkaz obnovy.
- [ ] Potvrdit domluvené okno a limity hostingu/RPC/payloadů. Import vyžaduje read committed a dočasně blokuje zápisy pěti tabulek i u jiných ročníků. Ověřit víceklientový PostgreSQL souběh, odebrání role, timeout/nejistý výsledek a přesný retry téhož requestu.
- [ ] Po novém cílovém snapshotu/otisku připravit soukromý plán0600, ověřit hashe a aktuální verze, ručně schválit s omezenou platností, předat až po samostatném výslovném povolení skutečného importu. Změněný cíl vyžaduje nový plán/schválení.
- [ ] Po případném povoleném převodu znovu provést úplné čtecí porovnání, počty, provenance a dvouúčtovou/browser akceptaci; teprve potom řídit přechod z místní evidence.

Nic z otevřených bodů není schválené mlčením. Žádný skutečný import, schválení, migrace nebo grant nyní neproběhl; pracovní SQLite/historie zůstávají beze změny.


## 2026-11-05 — příprava původu a rozdílového náhledu

- [x] Neveřejný model35 v nové schema-only migraci: přesný source_text/hash, historie a audit, neměnné vazby, ročníky/RLS a ověřený autor;19 syntetických DB scénářů. Nebyl aplikovaný na skutečný projekt.
- [x] Čisté porovnání36 a soukromý report nad snapshotem. Bez cílového exportu/mapování nic nesrovnává jako prázdnou DB a nic nemění.
- [ ] Později získat úplný oprávněný cílový export včetně odměn a provenance/vazeb; veřejný nebo RLS omezený přehled není úplný. Potvrdit přesný projekt, ročník a skutečný migrační stav před použitím5migrací.
- [ ] Později projít mapování jednotlivých kategorií/řádků, osob/skupin a účtových oprávnění. Žádné automatické slučování nebo cílové UUID nebyly vytvořené.
- [ ] Implementovat a synteticky ověřit transakční idempotentní importer nad schváleným plánem a verzemi cíle; potom samostatný aktivační pokyn. Nyní neexistuje nové write RPC nebo produkční import.
- [ ] Před aktivací ověřit skutečnou úplnou zálohu/obnovu včetně nových tabulek, živé víceúčtové zákazy a prohlížeč podle34. Retenční/správcovský zásah do neměnných zdrojů musí být výslovně řízený, nikoli běžná editace crew.


## 2026-11-05 — posun příloh a převodu

- [x] Storage inventář a kolektor hotové,32 vlastních scénářů plus propojená obnova. Nespouštěný stav z předchozího zápisu níže je historický.
- [x] Soukromý náhled převodu crew vytvořený nad kopiemi dnešního snapshotu, všechny tabulky zachované, zdrojové bajty beze změny, žádný cílový zápis.
- [ ] Před importem doplnit samostatný neveřejný provenance/historický model s RLS/auditem. Zachovat statusNote/contactOriginal/raw, historii2025/2026, zdrojové vazby, místní audit/requests a extra tabulky; nepřimíchat odměny do provozních notes.
- [ ] Později projít konkrétní návrh mapování řádků a osob/skupin, cílové edition/account UUID a rozsahy rolí. Soukromý náhled není jejich schválení a zůstává applyReady:false.
- [ ] Konkrétní živá matice rolí a přechod podle [34](34-SDILENY-PROVOZ-AKCEPTACE.md), včetně zákazu automatického návratu do staré SQLite po zahájení sdílených zápisů.
- [ ] Provozní vytvoření nezávislé úplné Storage autority v konzistentním okně: ověřit skutečné serverové schéma, potřebná práva a přesnost časových identit, nikoli vytvořit complete:true z téhož klientského RLS listu.
- [ ] Skutečné přístupy k DB/Storage, vzdálený provider/executor, oddělený klíč, plánovač/monitoring/retence a izolovaná obnova celé služby stále čekají. Produkční aktivace není součástí tohoto ověřeného kódu.


Neuzavírat mlčením. Uživatel chce samostatnou implementaci a společný průchod později. Tento dokument odděluje konkrétní potřebné vstupy od dalších nezávislých vývojových úkolů. Neobsahuje secrets nebo osobní kontakty.

## Stav přípravy 2026-11-05

- [x] Místní zdroje/vstupy a SQLite snapshot/export, PostgreSQL custom dump, šifrovaný koordinátor a syntetické vzdálené ověření jsou v kódu.
- [x] Soukromě ověřená místní obnova skutečné crew bez změny pracovní SQLite/WAL; není to vzdálená úplná záloha.
- [x] READ ONLY katalogový preflight, tři syntetické DB scénáře a inventář čtyř migrací; postup32.
- [ ] Doplnit Storage kolektor podle29e; nativní návrh při posledním běhu nevznikl. Připravené testy zůstávají nespouštěné.
- [ ] Potvrdit úplný soukromý inventář vstupů, včetně dostupné kopie původního personálního sešitu; na dříve uvedené cestě nebyl dostupný. Neprocházet automaticky celý disk.
- [ ] Samostatné exporty skutečných PostgreSQL provozních tabulek pro čitelnost a zvláštní obnovovací plán globálních rolí/služeb. SQLite JSON/CSV není export celé Supabase služby; XLSX zatím není dodané.
- [ ] Vzdálené připojení/executor, omezené časové a velikostní limity, plánovač, hlídání zmeškaného běhu, retence a skutečná obnova. Neaktivovat jen na základě zelených fixture testů.

Nativní Claude Pro byl ověřený jako přihlášený v oprávněném kontextu. Poslední vývojová chyba není doložený důvod pro nové přihlášení; automatické produkční zálohy nebudou mít závislost na Claude účtu. Vše níže nadále čeká na pozdější aktivaci/potvrzení.

## Sdílený provoz

- Ověřit správnou adresu a dostupnost existujícího Supabase projektu. Diagnostika 2026-11-02: uložená projektová adresa má očekávaný formát, její DNS vrací ENOTFOUND, veřejná doména služby se překládá; žádný skutečný záznam se nečetl ani neměnil. Nevyvozovat z toho zánik projektu.
- Doplnit přístup oprávněný aplikovat nové schema-only migrace; veřejný klient je nedostatečný. Existující bootstrap/migrace neopakovat naslepo.
- Určit již existující účty obou správců a konkrétních dalších lidí, přístupy crew/finance/registrace, případně založení účtů standardním postupem. Nic se neuděluje podle odhadnutého jména nebo telefonu.
- Nasazení/HTTPS/doména a přesné OAuth návraty včetně /crew, reálné přihlášení alespoň dvou účtů a negativní průchody přístupu. Lokální test RLS není živé víceuživatelské ověření.
- Řízený převod místní evidence: nezměnit historii, zachovat zdrojová pole a domluvy; nejasné identity/skupiny a termíny před potvrzením neslučovat, nezahazovat sloupce ani nepřeklasifikovat mlčky. Přesný importní náhled a uživatelem odsouhlasené mapování jsou další celek. Současná SQLite dál platí jako pracovní evidence do tohoto převodu.

## Úplné zálohy

- Doplnit oddělené přístupy pro úplný DB dump včetně deklarovaného Auth/schémat a soukromé Storage soubory/inventář, kompatibilní exportní nástroje a potřebný rozsah. Veřejné RLS čtení není úplný dump.
- Uchovat obnovovací klíč mimo zálohy ve správci tajemství; žádná hesla do veřejného MD nebo klienta.
- Vzdálený vykonavatel a dříve zvolený neveřejný cíl, doklad uploadu/stažení nové šifrované kopie. Místní iCloud složka sama nedokazuje vzdálenou kopii nebo běh při vypnutém Macu.
- Skutečný plánovaný běh, hlášení chyb i chybějícího běhu, retence a ověřená izolovaná obnova DB/Auth/příloh. Až pak označit automatické úplné zálohy za aktivní.

## Produkční pravidla a UX

- Potřebné počty a přesné termíny obsazení kategorií, nejasné identity a zástupy; neodvozovat člověka ze skupinového řádku.
- Registrace: pravidla kategorií/kapacit/čísel, skutečná databáze/import, podklady k prezenci a význam potvrzení. Ruční stav úhrady není ověření banky.
- Úkoly: skutečný harmonogram a odpovědnosti; časy se zobrazují v místním čase akce Europe/Prague.
- Mapový podklad, práva k použití, skutečné polohy a vedoucí zón. Pracovní kontakt ke sdílení s crew vybrat vědomě.
- Kdo potvrzuje příchod a dokončení úkolu, eskalace problémů. Samoobslužné potvrzování do té doby nepřidávat jako schválený proces.
- Desktop/mobil, klávesnice, otevření detailů, úzký displej a ochrana draftu v prohlížeči. Místní browser byl během implementace vypnutý; bez jeho dostupnosti nelze tvrdit novou vizuální/E2E akceptaci.
- WhatsApp/Twilio zůstávají výslovně odložené. Žádná nová automatická zpráva nebo placená služba.

## Další vývoj po prvním provozním průchodu

- Skutečné databázové migrace a víceúčtový provoz po doplnění správného projektu a oprávnění. Žádné výchozí individuální granty nejsou provedené.
- Řízený import celé místní crew s náhledem všech zdrojových sloupců a nejasných identit; zůstává samostatným celkem.
- Kolektory úplných záloh, konzistence DB/Storage, vzdálené ověření, plánovač a skutečná obnova podle29b.
- Specifická role vedoucího zóny s přístupem jen ke svému týmu; současná V1 má správce/koordinátora/člena, koordinátor provozně celý ročník. Neudělovat tuto širší roli automaticky každému vedoucímu zóny.
- Společné Moje práce napříč partnery, rozpočtem, registracemi a přípravou; souhrn crew není plný rozpočet.
- Průběžná synchronizace, PWA a offline práce jsou další rozsah. Současné Obnovit načítá uložený snímek.
- Interaktivní desktop/mobil/klávesnice a skutečné chybové průchody navigace a souběhu: lokální browser je vypnutý, SSR/build nejsou důkaz této akceptace.
