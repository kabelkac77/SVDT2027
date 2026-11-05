# Aktivace a odložené ruční kontroly

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
