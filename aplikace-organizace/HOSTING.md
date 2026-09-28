# Hosting — návaznost na veřejný web

## Stav připojení projektu

Projekt `svdt-organizace` je vytvořený a klient je připojen přes ignorované `.env.local`. URL: `https://<project-ref>.supabase.co`; klíče se do dokumentace nezapisují. Uživatel potvrdil `Success` po spuštění partnerské migrace a `bootstrap-admin.sql`, potom potvrdil úspěšné přihlášení do aplikace.

Read-only ověření Data API nejprve vracelo chybějící tabulku, po migraci vracelo odmítnutí anonymního čtení (HTTP 401 / PostgreSQL 42501). To potvrzuje existenci tabulky a omezení anon, nikoli kompletní funkčnost všech RPC a RLS. Zbývá live akceptace více rolí a operací; neopakovat bootstrap jen kvůli staršímu zápisu v historii chatu.

Google/Apple/Facebook mají připravený klientský kód, konfigurace providerů a reálné OAuth ověření zbývají dle `PRIHLASOVANI.md`. WhatsApp/Twilio jsou výslovně odložené. Hosting aplikace zatím není nasazený. Lokální náhled používá `http://127.0.0.1:3000/`; proces může běžet v ověřovací kopii dle `HANDOFF-CLAUDE.md`.

## Nastavení zakládaného Supabase projektu

Doporučená konfigurace podle formuláře uživatele z 2026-09-28: organizace SVDT / Free, projekt `svdt-organizace` (název SVDT také funguje), region Europe. GitHub integraci zatím ponechat nevybranou; přihlášení GitHub účtem samo nevyžaduje propojení repozitáře. Enable Data API zapnout, Automatically expose new tables vypnout, Enable automatic RLS zapnout. Partnerská migrace explicitně nastavuje RLS, politiky i potřebné granty. Heslo databáze uložit do správce hesel, ne do chatu ani Git. Tento odstavec zachycuje doporučené volby při zakládání; existenci projektu a přihlášení potvrzuje aktuální stav výše, každé nastavení dashboardu není nezávisle auditované.

## Ověřené podklady 2026-09-28

Načten chat „Audit SVDT web na 2027“ (ID `01a0e6a4-dcba-77f3-91a7-70598edf9e29`) a přímo prohlédnuto pět přiložených screenshotů Active24 z 28. 9. 2026, 10:10. Screenshoty ani fakturační údaje se do repozitáře nekopírují.

- Active24 klasický multihosting, balíček Smart s rozšířením.
- Celková kapacita 25 GB, využito 20,56 GB; v okamžiku snímku zbývalo 4,44 GB.
- Obsazené 4 z 5 domén.
- Administrace uvádí wildcard SSL, denní zálohování webu/e-mailů, PHP paměťový limit 512 MB a shell konzoli.
- Navazující zprávy v témže chatu evidují Apache 2.4 / PHP 7.4 současného webu a dostupnost PHP 8.4/8.5. Veřejný web má podle rozhodnutí v onom chatu pokračovat jako WordPress s vlastní šablonou.

## Význam pro interní aplikaci

Snímky neprokazují dlouhodobě běžící Node.js službu, podporu Next.js serveru ani možnost provozovat celý Supabase stack. Shell konzole sama toto nepotvrzuje. Veřejná aktuální nabídka Active24 nemusí přesně odpovídat existujícímu účtu.

Dosavadní volba Next.js + Supabase se tímto nemění. Doporučení: veřejný WordPress ponechat na Active24, databázi a přihlašování interní aplikace řešit Supabase. Umístění samotného aplikačního rozhraní zůstává otevřené: ověřit statický export současné klientské aplikace pro Active24, nebo použít hosting podporující Next.js. Statický export zatím není nakonfigurován ani otestován; budoucí serverové funkce by vyžadovaly odpovídající službu.

Samotné založení Supabase nezajišťuje nasazení Next.js rozhraní. Navržená subdoména z webového chatu `aplikace.svdtpribram.cz` zatím není zřízená ani finálně potvrzená.

Žádný tarif, DNS záznam ani produkční web nebyl v rámci tohoto ověření změněn.
