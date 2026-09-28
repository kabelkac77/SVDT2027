# Předání organizační aplikace SVDT do Claude Code

Stav k 2026-09-28. Tento dokument je výchozí mapa; aktuální změny ověř proti kódu a `git status`. Source of truth zůstává celý adresář `aplikace-organizace/`.

## Jak začít

Otevři Claude Code v **této existující pracovní složce**:

```sh
cd /Users/vojtechhrach/Documents/ChatGPT/SVDT-codex
claude
```

Claude Code je na tomto Macu nainstalovaný; ověřeno `claude --version`: 2.1.247. Přihlášení k účtu ani načtení skills v běžící relaci nebylo tímto předáním zkoušeno. Root `CLAUDE.md` importuje společné `AGENTS.md`. Projektové skills jsou v `.claude/skills/`; jejich příkazy mají prefix `svdt-`, aby se nekřížily s obecným review/design příkazem.

Úvodní prompt pro vložení:

> Použij /svdt-start. Přebíráš další implementaci organizační aplikace SVDT 2027 v tomto existujícím repozitáři. Načti CLAUDE.md, AGENTS.md a celý adresář aplikace-organizace/, zkontroluj kód event-app a aktuální Git stav. Respektuj rozpracovanou necommitnutou práci. Nejprve mi stručně potvrď architekturu, co je hotové, co je pouze demo a otevřená rozhodnutí. Připrav konkrétní plán dokončení Partnerů a převodu Financí na skutečný backend s akceptačními podmínkami. Důležitá rozhodnutí zapisuj do příslušných MD a DECISIONS.md. UI zatím zásadně nepředělávej, WhatsApp/Twilio neřeš a nic nenasazuj ani neimportuj do produkce při úvodním převzetí.

Tento první prompt je orientace a plán, ne implementace všech modulů. Po jeho zodpovězení zadá uživatel první vybraný funkční celek. Codex následně může provést nezávislé review konkrétní změny.

## Git a předání práce

- Repozitář: `kabelkac77/SVDT2027`, origin HTTPS GitHub.
- Repozitář je veřejný. Uživatel 2026-09-28 výslovně zadal aktualizaci stávajícího GitHub repozitáře. Publikujeme kód, migrace, testy, dokumentaci a projektové skills; soukromé podklady, konfigurace a lokální zálohy zůstávají mimo Git.
- Výchozí commit před integrací: `7e4327741406b97045776d814258bfeba34cc59f`; pracovní větev `codex/partners-v1`. Tato změna zahrnuje dosud lokální aplikaci a handoff. Aktuální commit a stav vždy ověř příkazy `git log -1` a `git status`.
- Cílem integrace je `main`, pouze fast-forward bez force-push. Před další prací načti aktuální vzdálený stav a zachovej případné místní změny.
- Pro nový počítač použij aktuální klon repozitáře; závislosti nainstaluj podle návodu níže a konfiguraci `.env.local` předej samostatně. Soukromé vstupní soubory nejsou součástí klonu.
- Root obsahuje také veřejný web/design a `DT-grafika-TV/`. Nejsou předmětem tohoto handoffu k implementaci.

## Dokumenty k načtení

Při prvním převzetí přečti všechny MD v `aplikace-organizace/`; následující seznam je orientace, ne náhrada celku:

- `00-MASTER-CONTEXT.md`, `CONTEXT.md`, `APP_ARCHITECTURE.md`: organizace a dlouhodobá architektura.
- `DECISIONS.md`, `IMPLEMENTATION-STATUS.md`, `BACKLOG.md`, `INPUTS-NEEDED.md`: aktuální rozhodnutí, důkazy, další práce.
- `10-PARTNERI.md`, `10-PARTNERI-MODEL-A-FLOW.md`, `10-PARTNERI-IMPORT.md`: model interního partnerství a filtrace historických podkladů.
- `11-FINANCE.md`, `11-FINANCE-MODEL-A-FLOW.md`, `11-FINANCE-PODKLAD.md`: finance, hranice dema, zdrojový Excel.
- `PRIHLASOVANI.md`, `HOSTING.md`, `SPOLUPRACE-A-ZALOHY.md`: aktivace přihlášení, nasazení a zálohy.
- Při změně vzhledu také `design-system/SKILL.md` a `design-system/readme.md`.

Některé starší dokumenty popisují cílovou architekturu (např. portály, AI, offline), ne dokončenou implementaci. Rozpory řeš podle novějšího rozhodnutí a ověřeného stavu, nezamlčuj je.

## Co aplikace skutečně umí

| Oblast | Stav | Co ještě chybí |
| --- | --- | --- |
| Interní Partneři | CRUD, owner/stav, kontakt, potvrzení partnerství, plnění, audit a archiv; Supabase migrace/RLS/RPC | Kompletní test rolí a souběhu proti skutečné službě; další portálové funkce |
| Supabase | Projekt založený, uživatel hlásil Success po migraci a bootstrap admina a potvrdil přihlášení | Agentem ověřená úplná live integrace více účtů; nepovažovat login za důkaz všech RLS scénářů |
| Import partnerů | Python filtr, privátní JSON fronta, kontrola a předvyplnění zvoleného záznamu | Skutečný hromadný import není proveden; status 2027 se nesmí odvodit ze starého partnerství |
| Finance | Propojené demo s Partnery; plán/potvrzená částka, úhrady, barter a osobní proplacení | Žádná finance SQL migrace ani produkční finanční evidence, samostatná oprávnění a serverový audit |
| Google/Apple/Facebook | Klientská OAuth podpora připravená | Konfigurace provider účtů a reálné přihlášení každým providerem; žádné údaje nevymýšlet |
| WhatsApp/Twilio | Klientský kód a mock testy existují | **Výslovně odloženo. Neaktivovat ani dále řešit.** |
| Zálohy | Jednorázový archiv zdrojů v určené iCloud složce, ověřená lokální kopie | Automatický denní dump, CSV/XLSX, přílohy, monitoring a test obnovy |
| Hosting | Lokální náhled; veřejný web se plánuje na Active24 | Nasazení aplikace/doména; statický export pro Active24 není otestovaný |

Žádní skuteční partneři nebyli automaticky vloženi a žádná hromadná zpráva ani pozvánka nebyla odeslána. Samoobslužný Crew/Partner/Rider Portal, realtime, PWA a offline synchronizace nejsou implementované.

## Mapa kódu

Všechny následující cesty jsou relativní k `event-app/`:

| Soubor | Význam |
| --- | --- |
| `src/app/page.tsx` | Skutečná evidence `/` |
| `src/app/demo/page.tsx` | Fiktivní lokální `/demo` |
| `src/app/podklady/page.tsx` | Read-only lokální kontrola podkladů |
| `src/components/partners-app.tsx` | Partnerské UI, přihlášení, ročníky, formuláře |
| `src/lib/backend.ts` | Klientský Supabase singleton, načítání a RPC |
| `src/lib/model.ts` | Partnerské typy a validace |
| `src/lib/demo.ts` | Fiktivní partnerství a localStorage |
| `src/lib/finance.ts`, `src/components/finance.tsx` | Výpočty, lokální finanční model a demo UI |
| `src/components/intake.tsx`, `scripts/filter_partners.py` | Filtr a kontrola historických podkladů |
| `src/components/social-login.tsx` | OAuth dostupnost a přesměrování |
| `src/components/whatsapp-login.tsx` | Odložená telefonní metoda, ponechat vypnutou |
| `supabase/migrations/202609280001_partners.sql` | Partnerské tabulky, RLS, RPC a audit |
| `supabase/bootstrap-admin.sql` | Jednorázová příprava admina, ne běžný seed |
| `tests/database.test.ts`, `tests/finance.test.ts` | PGlite/RLS/transakce a peněžní pravidla |
| `tests/browser/` | Uživatelské průchody a mock Auth |

Stack z lockfile/package: Next 16.3.6, React 19.3, TypeScript 7, Supabase JS 2.117.2, Playwright, PGlite. Před použitím nové Next API čti dokumentaci dodanou s nainstalovanou verzí (`node_modules/next/dist/docs/`). Aktuální auth je klientské SDK s implicit OAuth návratem na `/`, bez SSR cookies. Přechod na SSR/PKCE je vědomá architektonická změna, ne přidání náhodného callbacku z jiného tutoriálu.

## Lokální práce a testy

Node >=22; dosud ověřeno na Node 26. Z `event-app/`:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm ci` je potřeba při přípravě závislostí, nikoli před každým testem. Pro náhled `npm run dev`; výchozí adresa `http://127.0.0.1:3000`. `event-app/.env.example` obsahuje pouze názvy veřejných proměnných. `.env.local` existuje lokálně a není v Gitu; pro nový stroj použij bezpečné předání konfigurace. Nikdy nenastavuj service-role klíč jako `NEXT_PUBLIC_*`.

Playwright používá nainstalovaný Chrome. Vytvořený testovací server zapíná `NEXT_PUBLIC_WHATSAPP_ENABLED=true` pouze pro mock scénáře; skutečný Phone provider je vypnutý. Má-li Playwright použít již běžící server, musí být stejný flag nastavený při jeho spuštění, jinak WhatsApp testy neuvidí tlačítko. Běžný náhled/provoz ponechává flag vypnutý. Browser Auth testy vyžadují URL a publishable key v konfiguraci, požadavky OAuth/OTP v testech jsou mockované.

Dosavadní výsledek: 7 databázových/doménových testů, 12 browser testů, TypeScript a produkční build prošly. Poslední běh po změně WhatsApp: typecheck + 12 browser + build; DB/domain testy prošly předtím a DB se následně neměnila. Jde o lokální ověření, nikoli plné live přihlášení OAuth/Twilio.

Kvůli extrémně pomalému čtení závislostí v Documents byla použitá ověřovací kopie `/private/tmp/svdt-verification/event-app` se sourozencem `design-system/tokens`. Na této kopii může stále běžet náhled. Zdroj je ale tento repozitář: pokud použiješ kopii, explicitně synchronizuj změny před testem a zkontroluj shodu. Netestuj starý kód a nekopíruj zpět cizí `.env` nebo generované soubory. Dočasná složka nemusí příště existovat. Jeden server/build používej v daném checkoutu koordinovaně.

## Databáze, podklady a provozní přístupy

Supabase projekt `svdt-organizace`, URL `https://eiutxbuzbrpetgfirkma.supabase.co`. Veřejný klientský klíč není administrátorský přístup. Kód nevlastní oprávnění pro export celé DB nebo změnu konfigurace Auth. Migrace/členství byly spuštěné ručně uživatelem; neopakuj bootstrap naslepo.

Tabulky Partnerů: events, editions, edition_members, people, organizations, partner_prospects, edition_partnerships, partner_deliverables, audit_log. Role admin/manager/viewer platí ročníkově. Organizace/osoby jsou sdílené, čtení je omezené členstvím. Zápisy přes kontrolované RPC, ne přímý insert z prohlížeče. Nový sociální účet bez členství uvidí pouze zprávu o chybějícím přístupu.

Privátní podklady na tomto Macu: `.local/partners-intake.json`, `.local/finance-source.json`; zdrojové Excel soubory jsou mimo repo. Filtr partnerů našel 116 kandidátů a 32 řádků k ruční revizi. Nejde o schválené partnery 2027. Finanční podklad zahrnuje více akcí a překryvy; klasifikaci řídí `11-FINANCE-PODKLAD.md`. Nenačítej všechny osobní údaje do reportu a nepřenášej je do veřejných fixture.

Dočasně schválený cíl záloh:

```text
/Users/vojtechhrach/Library/Mobile Documents/com~apple~CloudDocs/Vojta/Cowarna/2027/AKCE/SVDT-2027/APLIKACE-ORGANIZACE-ZALOHY
```

Zápis na disk neprokazuje dokončený iCloud upload. První archiv neobsahuje databázi, Auth, Storage objekty, lokální podklady, secrets ani Git historii. Denní záloha musí mít vlastní implementaci, přístupy a test obnovy. Přesný model Synology není známý.

## Doporučený postup další implementace

1. **Výchozí stav a review Partnerů:** zachovat případnou necommitnutou práci, ověřit testy a skutečné chování dostupného prostředí. Nezakládat znovu Supabase. Rozpory v MD opravit.
2. **Finanční model pro DB:** doplnit explicitní finanční oprávnění, osobu platící vlastními penězi, opravné/stornovací operace a schvalování. Neodvozovat finanční právo automaticky z partnerského managera bez rozhodnutí. Výstupem má být konkrétní model/migrační návrh a testovací scénáře, potom první omezený funkční celek.
3. **Finance backend:** nová migrace, RLS, transakční operace a audit; napojit existující UI, zachovat demo samostatně. Teprve poté ověřený import vybraných skutečných dat.
4. **Provozní zálohy:** denní databáze + čitelné CSV/XLSX a přílohy, cíl iCloud dočasně. Před skutečnými produkčními daty musí existovat ověřená obnova; přístupy řešit bezpečně mimo MD.
5. **Google/Apple/Facebook a hosting:** podle dostupných účtů doplnit konfiguraci a akceptaci; neblokovat na tom nezávislou práci. WhatsApp přeskočit. Produkční doménu a způsob hostingu nejprve uzavřít.

První finance celek je hotový, až se skutečně uloží a po obnovení načte položka a částečná úhrada; nečlen a neoprávněná role nic nečtou/nepíšou; dva souběžné zápisy nemohou porušit zůstatek; archiv odmítá změny; audit má správného autora; a MD vysvětlují dodaný rozsah i zbývající omezení. Produkční přístup do Financí nezapínej jen proto, že funguje demo.

## Skills a další nástroje

Projektové skills jsou připravené v repozitáři bez externích instalací. Příkazy: `/svdt-start`, `/svdt-implement`, `/svdt-review`, `/svdt-design`. Metadata a odkazy se kontrolují lokálně; skutečné načtení si při zahájení ověř v Claude Code přes `/memory` a seznam skills. Po změně projektu může být potřeba nová relace.

Git, npm, Playwright a SQL testy pro začátek stačí. Google Drive/MCP a další účty nepřipojuj plošně. Současné lokální podklady umožňují pokračovat bez přístupu k původním Drive odkazům. Pro Supabase lze později použít CLI/MCP s omezeným rozsahem; klíče nedávej do verzovaných konfigurací. Skills instalované pro Codex nepovažuj automaticky za nainstalované pro Claude.

Oficiální formát ověřen při přípravě: [Claude Code memory](https://code.claude.com/docs/en/memory), [Claude Code skills](https://code.claude.com/docs/en/skills). Nebyly nastaveny automatické hooks, výjimky z oprávnění ani globální konfigurace.
