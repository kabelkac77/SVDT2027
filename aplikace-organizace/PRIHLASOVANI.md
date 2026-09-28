# Přihlašování týmu a brigádníků

**Aktuální pokyn 2026-09-28:** WhatsApp/Twilio odloženy do backlogu. Připravený klientský kód ponechat vypnutý, žádná další konfigurace ani aktivace do nového pokynu uživatele. Níže uvedený postup a cenový podklad zůstávají pro pozdější návrat.

## Požadavek uživatele — 2026-09-28

Uživatel potvrdil, že se přihlásil do aplikace po založení admin členství. Pro další uživatele požaduje co nejjednodušší přihlášení přes běžné účty bez dalšího opt-in/double-opt-in kolečka. Zvažuje Google, Apple, WhatsApp, Facebook a Instagram.

Po přihlášení přes ověřeného poskytovatele nevkládat další vlastní potvrzovací e-mail ani povinný marketingový souhlas. Výběr účtu, souhlas poskytovatele a případné ověření identity u poskytovatele nelze aplikací odstranit. Ověření identity zachovat; u e-mailového kódu jde o samotné přihlášení, nikoliv druhé potvrzení registrace.

## Schválený rozsah — následný pokyn 2026-09-28

- Uživatel vybral Google, Apple a Facebook. Kód všech tří metod je připravený; zapnutí v Supabase čeká na konfiguraci účtů poskytovatelů. Původní návrh e-mailového OTP není součást tohoto kroku; záloha zůstává existující e-mail/heslo.
- UI načítá veřejné `/auth/v1/settings` a ukazuje pouze zapnuté Google/Apple/Facebook, žádné další poskytovatele. Při chybě settings zůstává heslo a možnost opakovat načtení. Klient nepoužívá provider secrets ani administrátorské API.
- WhatsApp přes Supabase znamená telefonní OTP doručené přes Twilio/Twilio Verify, nikoli běžné OAuth přihlášení WhatsApp účtem. Vyžaduje další službu, konfiguraci a placené ověřování.
- Instagram není vestavěný poskytovatel v Supabase; Instagram API je zaměřené na profesionální účty a není vhodným výchozím přihlášením brigádníků.
- Apple web OAuth vyžaduje Apple Developer konfiguraci a obnovování client secret nejpozději po šesti měsících. Dostupnost a náklady vývojářského účtu je nutné vyřešit před aktivací.

## Navržený průchod a oprávnění

Jeden vstup „Pokračovat přes…“ slouží pro nový i existující účet. Po ověření pouze doplnit skutečně potřebné údaje pro brigádu. Založení účtu nedává členství ani roli manager/admin. Nový uživatel má mít vlastní přihlášku/profil a přístup pouze k tomu, co mu organizátor přidělí; žádný přístup do interních Partnerů či Financí. Crew samoobsluha zatím není implementovaná, stávající model členství neobsahuje roli brigádníka.

Organizační zařazení je samostatné od přihlášení. Pozvánka může navázat konkrétní roli bezpečně; samotná veřejná URL nebo volba role ve formuláři nesmí udělovat privilegia.

Připojení další přihlašovací metody musí zachovat účet i oprávnění. Neprovádět vlastní automatické slučování podle jména nebo neověřeného e-mailu. Apple může použít skrytou e-mailovou adresu; při odlišných identitách nabídnout bezpečné propojení z přihlášeného účtu. Ověřit chování Supabase identity linking před nasazením.

## Co zbývá

Konfigurace poskytovatelů (client ID/secrets mimo Git), produkční doména a testy skutečných nových/existujících účtů. Návrat a chybové stavy jsou implementované, 4 nové browser scénáře používají mock Auth, nikoli reálné účty poskytovatelů. Google/Apple/Facebook nebyli na vzdáleném projektu aktivováni, globální potvrzování e-mailů nebylo vypnuto. Uživatel již potvrdil fungující stávající přihlášení admina.

## Nastavení poskytovatelů

Společný callback, který patří do konzolí Google, Apple a Meta:

```text
https://eiutxbuzbrpetgfirkma.supabase.co/auth/v1/callback
```

Supabase → Authentication → URL Configuration: do Redirect URLs přidat přesný návrat `http://127.0.0.1:3000/` pro lokální zkoušení. Pokud používáme i localhost, přidat samostatně `http://localhost:3000/`. Site URL nastavit na aktuální adresu aplikace, při nasazení na finální HTTPS doménu. Do allowlistu přidat její kořenovou URL bez širokých wildcardů. Produkční doména zatím není potvrzená.

- **Google:** Google Cloud / Google Auth Platform → projekt a branding SVDT Organizace → Audience External (při Testing přidat testovací účty; pro veřejnost zveřejnit) → OAuth client typu Web application. Nastavit origin aplikace a výše uvedený callback. Pouze základní scopes openid, email, profile. Client ID a Client Secret vložit do Supabase → Authentication → Sign In / Providers → Google a zapnout.
- **Apple:** Apple Developer účet, App ID s funkcí Sign in with Apple a navázaný Services ID pro web. Web domain callbacku je `eiutxbuzbrpetgfirkma.supabase.co`, return URL je výše. Připravit Team ID, Key ID a privátní Sign in with Apple klíč, z něj client secret JWT podle oficiálního návodu. Services ID a secret vložit do Apple provideru Supabase. Secret má nejvýše šest měsíců: určit vlastníka a termín obnovy. `.p8` ani secret nepatří do aplikace/Gitu. Standardní členství Apple Developer stojí 99 USD/rok, případná místní cena/daň dle účtu; nákup nebyl proveden.
- **Facebook:** Meta for Developers → aplikace s Facebook Login → povolit webové OAuth a přesný callback. App ID a App Secret vložit do Facebook provideru Supabase. Pro běžné uživatele nestačí Development režim: dokončit požadavky dashboardu (včetně veřejných informací o soukromí a odstranění údajů) a zpřístupnit aplikaci. Nepřidávat oprávnění ke správě stránek, příspěvků či reklam.

Zdroj klientské implementace: `event-app/src/components/social-login.tsx`. `signInWithOAuth` používá stávající čistě klientský implicit flow Supabase SDK; návrat je vždy kořen aktuálního originu, nikoli uživatelem dodané `next`. SDK převezme session z fragmentu URL a udržuje ji. Chybové callback parametry se odstraní a zobrazí se obecná česká zpráva bez detailů poskytovatele. Při případném přechodu na SSR znovu navrhnout PKCE/cookies; současná implementace netvrdí, že je SSR autentizace.

Před otevřením brigádníkům ověřit každého providera v reálném účtu: přihlášení, odhlášení, obnovení stránky, zamítnutý souhlas, nový účet bez členství a existující admin účet. Apple „skrýt e-mail“ může vytvořit jinou identitu; neslučovat podle jména. Samoobslužné propojení identit ani brigádnický portál zatím nejsou implementované. Pro první OAuth registraci musí Auth povolit vznik účtu, členství však přiděluje výhradně organizátor.

## WhatsApp — schváleno k implementaci, aktivace dosud neproběhla

Následný pokyn uživatele 2026-09-28: WhatsApp přidat, orientační cena za ověření je přijatelná. Toto nahrazuje předchozí stav „pouze nacenit“; samotné účty služby, fakturace a odesílatel stále nejsou nastavené.

Klient `event-app/src/components/whatsapp-login.tsx` obsahuje formulář telefonu s explicitní předvolbou, odeslání `signInWithOtp` s kanálem `whatsapp`, šestimístný kód přes `verifyOtp` typu `sms` (tak Supabase označuje telefonní ověření), chybové stavy a 60sekundový odstup žádostí. Lokální čekání není ochrana proti zneužití API; serverové limity jsou povinná součást aktivace. Založení Auth uživatele nepřiděluje členství. Telefon ani OTP se samostatně neukládají do localStorage ani do logů aplikace.

Tlačítko vyžaduje současně `external.phone=true` v Supabase settings a `NEXT_PUBLIC_WHATSAPP_ENABLED=true` při buildu. Flag je standardně vypnutý, protože zapnutý Phone sám neprokazuje nakonfigurovaný WhatsApp kanál. Před zapnutím:

1. Twilio účet a Verify Service; připojený vlastní WhatsApp Business sender/číslo podle aktuálního onboarding postupu. Twilio Verify vyžaduje vlastní brand/odesílatele; nejde o použití běžného osobního WhatsApp účtu jako API. Nové číslo neobjednávat bez konkrétní volby.
2. V Supabase Auth Phone nastavit Twilio Verify přístupy (Account SID, Auth Token, Verify Service SID), ponechat tokeny mimo Git a prohlížeč. Nastavit délku kódu šest číslic.
3. Nastavit serverové rate limits a sledování spotřeby. Před veřejným zpřístupněním vyhodnotit ochranu CAPTCHA a napojit její token, pokud bude v Supabase vyžadována; klient ji zatím neimplementuje. Rozpočtový alert není automaticky tvrdý výdajový limit. Automatický přechod na SMS nezapínat bez samostatného rozhodnutí.
4. Nastavit veřejný flag a provést nový build/restart. Test skutečného doručení na určené číslo, platného/expirujícího kódu a nového účtu bez přístupu. Teprve pak označit službu jako aktivní.

Browser testy mockují OTP API, neposílají placené zprávy. Testovací server nastavuje veřejný flag; při použití již běžícího serveru pro `npm run test:e2e` musí být spuštěn se stejným flagem. Běžný lokální náhled jej standardně nezapíná. Bezpečné připojení dalších metod k telefonnímu účtu zůstává samostatný úkol před případným sezónním vypnutím WhatsAppu.

Zdroje konfigurace: [Supabase Phone](https://supabase.com/docs/guides/auth/phone-login), [Twilio Verify WhatsApp](https://www.twilio.com/docs/verify/whatsapp).

Uživatel zvažuje zapnutí jen na dva měsíce. Supabase podporuje doručování telefonního OTP přes Twilio/Twilio Verify. Není to OAuth tlačítko: uživatel zadá telefon a kód z WhatsAppu. Souhlas k doručení vyžádaného ověřovacího kódu lze zahrnout přímo do tohoto kroku; marketingové zasílání není předmětem přihlášení.

Orientační model přes **Twilio Verify**, ověřeno 2026-09-28:

- Twilio Verify: 0,05 USD za úspěšné ověření + cena autentizační šablony dle země.
- Veřejný Twilio CSV ceník uvádí pro CZ autentizační zprávu 0,0212 USD. Základ jedné zprávy a jednoho úspěšného ověření: 0,0712 USD. Nezaměňovat s americkou cenou šablony 0,0034 USD ani přičítat poplatek jiné služby Programmable Messaging.
- Při **modelovém, nikoli aktuálním kurzu 22 Kč/USD** asi 1,57 Kč/ověření bez DPH: 100 ověření ≈ 157 Kč, 500 ≈ 783 Kč, 1 000 ≈ 1 566 Kč. Např. 100 lidí × 5 ověření během celých dvou měsíců ≈ 783 Kč.
- Jde o spotřebu, nikoli paušál za dva měsíce. Neobsahuje případný pronájem čísla, opakované zprávy, jiné země, daně a jiné služby. Před zapnutím ověřit konkrétní sender/Verify účet, aktuální sazbu a limity proti zneužití. Uživatel schválil implementaci; placený provoz dosud nebyl aktivován.
- Před sezónním vypnutím musí mít uživatelé připojenou jinou ověřenou metodu, jinak se po vypršení session nedostanou zpět. Bezpečné propojení telefonního účtu s další identitou je samostatná implementace.

Zdroje ceny: [Twilio Verify](https://www.twilio.com/en-us/verify/pricing), [Twilio CSV sazby podle země](https://www.twilio.com/content/dam/twilio-com/pricing-data/en/WhatsAppPricing-pricing-details.csv), [Apple Developer členství](https://developer.apple.com/programs/enroll/).

Ověřené zdroje: [Supabase social login](https://supabase.com/docs/guides/auth/social-login), [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple), [Facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook), [telefon/WhatsApp](https://supabase.com/docs/guides/auth/phone-login), [Twilio Verify ceny](https://www.twilio.com/en-us/verify/pricing).
