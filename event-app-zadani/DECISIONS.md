# DECISIONS — potvrzená rozhodnutí

## 2026-09-28 — příprava předání Claude Code

- Uživatel požádal o kompletní podklady, MD a skills pro předání další práce Claudovi. Připraven `event-app/CLAUDE.md`, místní `event-app/AGENTS.md`, `HANDOFF-CLAUDE.md` a čtyři projektové skills (start, implementace, review, design).
- Instrukce odkazují na stávající source of truth, nevytvářejí druhou architekturu. Role: Claude Code implementace, Codex nezávislé review a návaznosti, uživatel priority/akceptace; implementátor také průběžně aktualizuje MD.
- Předání lokálního pracovního stavu není automatické předání přes GitHub: dosavadní necommitnuté soubory musí být zachované. WhatsApp/Twilio zůstávají odložené, iCloud je dočasný cíl záloh. Příprava nepovoluje automatické produkční nasazení ani komunikaci mezi chaty.
## 2026-09-28 — WhatsApp/Twilio odloženy a přesný cíl záloh

- Nejnovější pokyn uživatele: WhatsApp a Twilio přesunout do backlogu a zatím neřešit. Předchozí schválení implementace tím není pokynem k další práci nebo aktivaci. Existující klientský kód zůstává vypnutý; konfigurace, placený provoz a ověření doručení jsou odložené.
- Uživatel určil přesný cíl záloh: `[cesta v neveřejném PROVOZ.md]`. Nahrazuje původně navržené `iCloud Drive/SVDT-zalohy`.

## 2026-09-28 — dočasný cíl záloh iCloud Drive

- Uživatel zvolil prozatím vlastní iCloud Drive; Synology musí nejprve identifikovat. Cíl `iCloud Drive/SVDT-zalohy`, datované kopie. Nahrazuje otevřenou volbu úložiště pro přechodné období; Synology + Drive zůstává doporučením do budoucna.
- První archiv zdrojů nesmí být vydáván za kompletní zálohu dat. Automatické denní dumpy/CSV/XLSX ještě nejsou nakonfigurované; lokální kopie v iCloud složce neprokazuje dokončený upload.

## 2026-09-28 — WhatsApp schválen

- Uživatel následně schválil také přihlášení přes WhatsApp a akceptoval orientační cenu jednoho ověření. Nahrazuje původní omezení „pouze nacenit“. Cesta: Supabase Phone OTP přes Twilio Verify, bez automatického SMS fallbacku v aplikaci.
- Implementovaný klientský průchod čeká na konfiguraci Twilio/WhatsApp Business a Supabase. Produkční zapnutí až po ověření doručení a nastavení omezení spotřeby. Žádná placená zpráva ani nákup čísla tímto krokem neproběhly.
- Synology + šifrovaná kopie Google Drive je doporučení pro zálohy, ne potvrzení nastaveného provozu. Model NAS a dostupnost zatím nejsou známé.

## 2026-09-28 — denní zálohy a čitelné exporty

- Uživatel požaduje jednou denně zálohovat aplikaci i její data a mít je dostupná v CSV nebo Excelu. Konkrétní úložiště, plánovač, čas a retence jsou otevřené; zálohy zatím neběží.
- Návrh procesu v `SPOLUPRACE-A-ZALOHY.md` rozlišuje Git, obnovitelný databázový dump, přílohy a čitelné exporty. CSV/XLSX samo neobnovuje celou aplikaci.
- Rozdělení Claude Code → implementace a Codex → zadání/review/MD je zatím návrh k diskusi, nikoli automatické předání vývoje.

## 2026-09-28 — jednoduché přihlášení

- Uživatel požaduje jednoduché přihlášení brigádníků a dalších uživatelů přes běžné účty, bez dalšího vlastního opt-in/double-opt-in kolečka. Povinný marketingový souhlas není součást přihlášení. Ověření identity a případné potvrzení u poskytovatele zůstávají.
- Původní návrh Google/Apple + e-mailový kód nahrazen následným výslovným pokynem uživatele: implementovat **Google, Apple a Facebook**. Existující e-mail/heslo zůstává záloha. WhatsApp zatím pouze nacenit, neobjednávat ani neaktivovat.
- Kód sociálního přihlášení připraven; skutečná aktivace závisí na nastavení poskytovatelů v Supabase. UI zobrazuje jen povolené poskytovatele podle veřejného Auth settings endpointu; návrat vždy na kořen aktuálního originu. Přihlášení samo neuděluje interní role ani přístup k financím. Podrobnosti a checklist v `PRIHLASOVANI.md`.

## 2026-09-28 — propojené zkoušení

- Dle pokynu uživatele nyní propojujeme funkční flow; finální UI/design připraví Claude.
- `/demo` propojuje Partnery a Finance přes organizace a ročníky. Používá fiktivní lokální data; nejde o sdílený finanční backend.
- Zkušební finance ukládají CZK v haléřích a rozlišují plán, potvrzenou částku, úhradu, barter a osobní proplacení. Proplacení osobního výdaje nezdvojuje náklad. Model, flow a zbývající rozsah: `11-FINANCE-MODEL-A-FLOW.md`.

Potvrzené rozhodnutí nemažeme; změněné označíme jako nahrazené.

- Jedno datové jádro, více portálů/pohledů.
- Event → Edition; osoby/organizace centrální, provoz ročníkově.
- První implementace: Partneři → Finance.
- Mapa je kritická část architektury.
- Jedna hlavní LIVE mapa, ne dvě matoucí mapy plán/live.
- AI 2027 = experimentální copilot; core funguje bez AI.
- Race Control = pevný bod; kandidát Točírna.
- Vojta = mobilní Race Director.
- Kandidát Race Coordinator = Mirek (?).
- Vlasta +1 kandidát = Jindra (?).
- Světlana = Marshals Manager + Crowd Lead.
- Rádio: RACE / PRODUCTION / IZS / BROADCAST INTERNAL.
- Radio Manager pod Vlastou.
- Partner fulfillment: nesplněno / v řešení / splněno.
- Interní partner V1: owner + osloven/potvrzen/zamítnut + poznámka + datum dalšího kroku.
- Finance V1 se přizpůsobí existujícímu Excelu.
- Zóna je univerzální objekt.
- Zone Manager vlastní i deinstalaci a může uzavřít zónu s výhradou.
- Post-event = deinstalace, finance, partner/media closeout, feedback, report, lessons learned, archivace.
- Synology Drive je kandidát na hlavní file/media storage; ověřit integraci.
- Vojta a Vlasta mají admin práva potvrdit/změnit stav za jiné role; audit log uloží autora změny.
- Povolení/smlouvy/dokumenty budou evidovatelné a uploadovatelné.
- READY může potvrdit vlastník oblasti nebo admin Vojta/Vlasta.

## 2026-09-28 — navázání implementace v Codexu

- Každé nové důležité rozhodnutí se zapisuje současně do příslušného `.md` a podle rozsahu sem. Source of truth nesmí zůstávat pouze v chatu (výslovný pokyn Vojty).
- Implementační detail Partnerů: centrální Organization + ročníkový PartnerProspect pro ownera/stav/poznámku/další kontakt. EditionPartnership vzniká až při potvrzení, atomicky a bez duplicit. Historie se při opravě stavu nemaže.
- Detail modelu, flow, oprávnění, souběhu a hranic interní V1 je v `10-PARTNERI-MODEL-A-FLOW.md`.
- Pro první implementaci z pracovních kandidátů volíme Next.js + TypeScript a Supabase Auth/PostgreSQL. Interní mutace přes transakční RPC; čtení přes RLS, audit a kontrola verzí. Produkční provisioning/hosting zůstává otevřený.
- Interní V1 je první dodávka Partnerů; externí portal/questionnaire/VIP QR/report zůstávají navazujícím rozsahem. Finance se modelují podle dodaného Excelu, ne podle odhadnuté tabulky.
- Dodaný `PARTNERS_2026.xlsx` se filtruje podle listu/akce/ročníku podle `10-PARTNERI-IMPORT.md`. Historie 2026 ani checkbox loga nepotvrzuje spolupráci 2027. Importní kandidáti mají samostatnou frontu; nepřidáváme automaticky stav „osloven“. Kontakty a obchodní podklady nepatří do Git ani veřejného dema.

## 2026-09-28 — přijetí rozpočtu Financí

- Dodaný rozpočet je historický zdroj 2026. Pravidla a přesné zdrojové oblasti jsou v `11-FINANCE-PODKLAD.md`; převzetí do 2027 neznamená potvrzení závazků či úhrad.
- Finance budou oddělovat plán, potvrzenou částku, jednotlivé úhrady a proplacení osobních výdajů. Potvrzení partnerství samo nevytváří příjem. Barter není peněžní tok.
- Souhrny a jejich detaily se neimportují současně jako samostatné transakce. Překryvy hlavní akce/afterparty a položky jiné akce vyžadují kontrolované rozdělení; nejasnosti zůstávají ve frontě.
- Skutečné finanční a osobní údaje zůstávají mimo Git a demo. Finanční oprávnění se navrhnou samostatně; přístup k Partnerům automaticky neuděluje přístup k Financím.

## 2026-09-28 — aktualizace GitHubu a předání Claude

- Na výslovný pokyn uživatele integrujeme aplikaci, testy, SQL migrace, MD a projektové Claude skills do stávajícího veřejného repozitáře `kabelkac77/SVDT2027`, cílová větev `main`, bez změny viditelnosti a bez force-push.
- Soukromé zdrojové Excel/JSON podklady, `.env.local`, servisní klíče a lokální zálohy se nepublikují. GitHub není záloha databáze.
- WhatsApp/Twilio zůstávají v backlogu a vypnuté. Denní export databáze do CSV/XLSX a automatické zálohování jsou nadále nedokončené.

## 2026-09-29 — oddělení neveřejných podkladů

Na pokyn uživatele: veřejná část v `kabelkac77/SVDT2027/event-app-zadani`, neveřejná část v novém soukromém `vojtechhrach/SVDT2027-soukrome/event-app-podklady-soukrome`. Podrobné rozbory zdrojů, data a konkrétní provozní údaje jsou neveřejné. Kód, obecné modely a pravidla vývoje zůstávají veřejné. Klíče a hesla nepatří ani do soukromého Gitu. Úprava aktuálních MD nemaže dřívější historii veřejného repozitáře.

### Upřesnění názvů 2026-09-29

Uživatel upřesnil soukromý repozitář na `vojtechhrach/SVDT2027-soukrome` a složku na `event-app-podklady-soukrome`. Soukromá viditelnost i obsah zůstávají zachované.

### Rozsah instrukcí pro agenty

Uživatel rozhodl, že instrukce a skills nejsou výchozí pro celý repozitář. `CLAUDE.md`, `AGENTS.md` a `.claude/skills/` jsou proto v `event-app/` a platí pouze při otevření této složky aplikace. Kořenový `.gitignore` zůstává, protože chrání kořenovou soukromou pracovní složku `.local/`.

## 2026-09-29 — naplnění Partnerů pro SVDT 2027

- Claude Code zatím projekt nepřevzal; podklady a projektové instrukce jsou pouze připravené k předání.
- Na výslovný pokyn uživatele se do ročníku 2027 importují vyfiltrovaní partneři ze zdrojového Excelu a nové návrhy z pracovního partner CRM. Historické údaje 2026 se ukládají odděleně jako historie organizace: částka, plnění a pozice. Nejsou potvrzením spolupráce 2027.
- Stav `neosloven` rozlišuje nový pracovní seznam od skutečně oslovených, potvrzených a zamítnutých partnerů. Existující IČO ani již zadané kontakty se při opakovaném importu nepřepisují; zdroje bez IČO jej nedoplňují odhadem.

## 2026-09-29 — pracovní tabulka Partnerů

- Seznam Partnerů je primárně pracovní evidence, proto má kompaktní tabulkový režim: malou výšku řádků, pevné sloupce a stručné souhrnné filtry. Detail partnera zůstává samostatnou stránkou.
- Uživatel s rolí admin nebo manager upravuje přímo v tabulce stav, ownera, datum dalšího kontaktu, hlavní kontakt a interní poznámku. Každá změna se ukládá samostatně přes existující kontrolovaný zápis a audit; detail slouží pro širší profil organizace a plnění.
- Pracovní tabulka má sloupce pro úkol, stav, fakturaci, potvrzenou/odhadovanou/skutečnou částku, historickou částku 2025, poznámku, logo a podklady, druh partnerství, ownera, kontakt a plnění. Historická částka čte pouze importovanou historii organizace. Fakturace, současné částky, úkoly, typ partnerství a soubory zatím nemají produkční partnerský model, proto se zobrazují prázdné a nevydávají se za finanční údaje; jejich zdrojem bude navazující Finance a evidence souborů.

## 2026-10-03 — názvy aplikačních složek

- Veřejný zdroj zadání je `event-app-zadani/`; název odlišuje dokumentaci a rozhodnutí od zdrojového kódu v `event-app/`.
- Neveřejné zdrojové podklady jsou v `event-app-podklady-soukrome/` v repozitáři `vojtechhrach/SVDT2027-soukrome/`. Název výslovně říká, že nejde o druhou aplikaci ani o bezpečné místo pro klíče.
- `AGENTS.md`, `CLAUDE.md` a projektové skills patří výhradně do `event-app/`. Všechny interní odkazy byly změněny spolu s přejmenováním; GitHub workflow ani běhový kód cestu zadání nepoužívají.

## 2026-10-03 — dokončení lokálních změn Partnerů

Implementační rozhodnutí (kód a lokální testy; žádná produkční změna):

- Pracovní tabulka používá existující transakční `save_partner`, obě verze a audit. Zápisy řádků se serializují; během ukládání se blokují ostatní editory a změna ročníku. Chyba zachová draft; konflikt vyžaduje vědomé načtení nové verze, nikoli automatické přepsání. Detail: `10-PARTNERI-MODEL-A-FLOW.md`.
- Historie organizace je pouze čitelná pro oprávněného interního člena. Stav `neosloven` se nepřevádí na potvrzené partnerství. Historické `cash_amount_czk` je legacy pole celých Kč, oddělené od budoucího finančního ledgeru v haléřích. Neznámá částka není nula; více zdrojových řádků se nesčítá bez kontroly překryvů.
- Browser testy používají vlastní lokální server s fiktivní URL a klíčem Supabase a mock API. Existující běžící server se nepřebírá. Mock test ani PGlite nejsou důkazem live Auth/PostgREST; migrace se v produkci v tomto úkolu neaplikuje.
- Uživatel výslovně zadal samostatný otestovaný commit a push Partnerů na `main`; Finance mají následně pouze detailní implementační plán. Nasazení, produkční změny a aktivace placených služeb vyžadují další výslovný pokyn.

## 2026-10-03 — plán skutečných Financí v Supabase

**Implementační návrh, nikoli schválení produkční aktivace či konkrétních rolí.** Detail: `11-FINANCE-IMPLEMENTACNI-PLAN.md`, návaznost dema: `11-FINANCE-MODEL-A-FLOW.md`.

- Finance oddělí plán (včetně NULL), schválenou potvrzenou částku, vypořádání protistrany a peněžní tok pořadatele. CZK/haléře zůstávají; bigint agregace se přes API přenesou jako řetězce bez ztráty přesnosti. Neznámé částky nejsou nulami.
- Navržen samostatný ročníkový finance grant reader/editor/approver/admin a schvalování konkrétní verze. Partnerský admin/manager automaticky nedostane finance. Konkrétní příjemci práv a self-approval jsou OPEN před implementací/aktivací.
- Finanční audit bude v samostatné chráněné tabulce: dnešní partnerský `audit_log` čtou všichni interní členové a nesmí obsahovat finanční payloady. Globální profily dostanou úzké finanční čtecí politiky; partnerské helpery se nerozšíří tak, aby se změnila práva k historii.
- Protistrany: globální Organization/Person + ročníkový finanční registr; dodavatel se nebude vydávat za PartnerProspect. Osobní plátce je Person, autor změny Auth UUID; proplacení odkazuje na konkrétní osobní platbu. Náklad ani dodavatelský zůstatek se proplacením nesmí započíst podruhé, barter není peněžní tok.
- Zápisy: transakční RPC, kontrola verzí, zámek položky/archivu/grantu, request_id s kontrolou payloadu a bezpečným replay. Ledger bez přímých editací/mazání. Evidenční storno a skutečná vratka jsou odlišné procesy.
- Návrh dokladů používá soukromý Storage a metadata; faktura sama není úhradou a více dokladů nesmí podruhé započítat částku položky. Správa grantů se serializuje po ročníku, aby souběh neobešel ochranu posledního admina. Import zachová provenance, vyřadí souhrny/duplicity, explicitně rozdělí akce a nepřenese úhrady 2026 do 2027. Ostrý import ani placená služba se nyní neaktivují.
- Doporučený první celek B1: grant, návrh/schválení položky, bankovní/hotovostní částečná úhrada, idempotence a oddělený audit v izolovaném prostředí. Další B2–B6 doplní osoby/barter, opravy, doklady, import/export/obnovu a skutečnou akceptaci. Produkční práce až na samostatný výslovný pokyn uživatele.
