# Aktivace a odložené ruční kontroly

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
