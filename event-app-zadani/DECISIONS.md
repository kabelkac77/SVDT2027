# DECISIONS — potvrzená rozhodnutí

## 2026-11-05 — přílohy a bezpečný náhled převodu crew

Implementovaný Storage celek29g/h nahrazuje předchozí stav nedodaného kolektoru. Přijetí autority neznamená živé privilegium; síťový inventář sám nikdy netvrdí úplnost. Verzované/archivní zdroje V1 odmítá a klíče uchovává přesně pomocí číslovaných fyzických exportů. Review i testy včetně původních11 scénářů skutečně proběhly; syntetické SDK/remote nejsou cloudová akceptace.

Technická příprava převodu33 zachovává původní tabulky/sloupce/historii/audit a soukromé odměny, nikdy automaticky neslučuje lidi/účty a vrací preview_only, applyReady:false. Před importem je třeba samostatný neveřejný provenance/historický model s RLS; současný crew_roster jej plně nenahrazuje. Všechna uživatelská rozhodnutí, přístupy, mapování a aktivace zůstávají otevřené v31. Žádný skutečný cílový zápis/grant/deploy se neprovedl.


## 2026-11-05 — zálohy a sdílená aktivace

Technické provedení: úplný výsledek vyžaduje všech šest zdrojů, skutečné konzistentní okno, oddělený klíč a nezávislé zpětné čtení nové šifrované vzdálené kopie. Nedostupná služba nebo chybějící vstup není prázdná úspěšná záloha. Katalogový preflight pouze čte systémové informace; nesmí automaticky aplikovat migrace nebo granty. Detaily [29b](29b-ZALOHY-KOLEKTORY.md), [32](32-PREDPROVOZNI-KONTROLA.md).

Uživatelský pokyn pokračovat samostatně trvá. Přístupy, skutečná aktivace, retenční volby, rozsahy účtů a importní mapování zůstávají k pozdějšímu projití v31; nejsou schválené mlčením. Vývojová chyba nativního Claude neopravňuje přepnout účet/model nebo obejít kapacitní guard. Storage modul nebyl při neúspěšném běhu aplikovaný a jeho připravené testy se nepočítají jako prošlé.


## 2026-11-02 — první provozní moduly v aplikaci

IMPLEMENTED / synteticky ověřeno: úkoly a denní harmonogram v místním čase akce, zóny s explicitním pracovním kontaktem a orientačním plánem, ruční registrace závodníků se samostatným oprávněním a mobilní Moje služba. Editory otevíráme přímo pod řádkem. Auth a ročník sdílejí stávající crew; člen vidí vlastní přiřazení/úkoly, správce řídí přístup Registrace. Rozepsané údaje chrání navigace a ukládání používá plný fingerprint se stabilní identitou požadavku při opakování po chybě. Historický ročník je provozně readonly, přístup lze odebrat i v archivu.

Ověření:147/147 testů aplikace, úplný TypeScript, čistá instalace z lockfilu a produkční build prošly. [Evidence](operations-ui-verification.json). Nový browser/E2E průchod neproběhl, místní browser je vypnutý.

Toto je první funkční rozsah, nikoli dokončený Race Control nebo celé financování závodu. Registrace nemají automatickou banku, kapacity, přidělování čísel nebo neodsouhlasený import. Plán nemá skutečný uliční podklad/polohy. Samoobslužné potvrzení příchodu a dokončení členem crew zůstává otevřené; průběžná/offline synchronizace není implementovaná. Rozsah [30](30-PROVOZNI-MODULY.md), aktivace a ruční kontroly [31](31-AKTIVACE-A-RUCNI-KONTROLY.md).

Sdílený provoz ani úplné automatické zálohy nejsou aktivované. Migrace, konkrétní účty/granty, převod skutečné místní evidence, reálné OAuth, hosting a vzdálené zálohovací přístupy musí projít pozdější aktivací; uživatel požádal nyní práci nepřerušovat otázkami. Pracovní SQLite/historie zůstávají zachované.


## 2026-11-02 — šifrovaný zálohovací balíček a bezpečná obnova

IMPLEMENTED / synteticky ověřeno: knihovna `backup-bundle.js`, šest povinných inventářů, AES-256-GCM, kontrola SHA-256 a obnova pouze do nové soukromé složky. Patnáct testů ověřuje skutečné šifrování, poškození, úplnost, cesty, zákaz přepsání a úklid při I/O chybě bez odstranění cizích souborů. Testy jsou součástí běžného `npm test` a CI.

**Úplné automatické zálohy mimo tento počítač nejsou aktivované.** Chybí kolektory, přístup k úplnému databázovému dumpu a Storage, úschova klíče, vzdálený vykonavatel, důkaz vzdálené kopie, plán a ověření obnovy databáze. Rozsah [29](29-ZALOHY-IMPLEMENTACE.md), odložené aktivace [31](31-AKTIVACE-A-RUCNI-KONTROLY.md). Další nezávislá práce: provozní moduly; zálohovací integrace pokračuje podle dostupných přístupů.


## 2026-11-02 — technická pravidla sdílené crew

- Role a soukromé odměny vynucuje nová DB vrstva; žádné skutečné individuální členství nebylo přidělené. Konkrétní finanční rozsahy z dřívějšího UX zůstávají OPEN.
- Archiv zamyká personální/finanční data, ale správce může nadále odebrat přístup. E-mail pro nové členství musí odpovídat právě jednomu Auth účtu.
- Jedna rozepsaná část najednou, explicitní zahození, stejný request pro stejné tělo při nejisté odpovědi; finanční uložení je oddělené od rosteru. Změna identity remountuje workspace, token refresh stejného účtu jej nezahazuje.
- Sdílený modul nepřebírá místní SQLite automaticky. Aktivace/import/živé účty a úplné zálohy čekají podle31; syntetické testy a build nejsou důkaz živého provozu.


## Potvrzené pokračování — 2026-11-02

CONFIRMED: uživatel zadal dokončit souhrny kategorií a navazující personální přehled, potom sdílení crew s účty a oprávněními, automatické úplné zálohy mimo počítač a následně úkoly/harmonogram, registrace závodníků, zóny/mapu a provozní mobilní pohled. Jde o skutečnou implementaci po ověřitelných celcích, ne pouhý návrh. Konkrétní totožnost účtů, rozsahy přístupů, cílové obsazení, pravidla registrací a provozní volby bez podkladů zůstávají k pozdějšímu potvrzení; nevyžadovat je jako podmínku nezávislé práce. Stávající skutečná evidence a historie se zachovávají. Podrobný sled a podmínky dokončení v [27](27-NAVAZUJICI-IMPLEMENTACE.md).

## 2026-10-29 — PÁ a SO přímo v hlavním personálním řádku

**CONFIRMED:** uživatel výslovně zadal sloupce PÁ (od–do) a SO (od–do). Přehled a editace zůstávají v jedné tabulce s detailem pod řádkem, časy se ukládají samostatně pro 2027. Historie ani účast se z nich automaticky neodvozují. Jednoduchý textový rozsah a kompatibilita starších otevřených oken jsou technické provedení podle [26](26-CREW-PATEK-SOBOTA.md). Dříve připravený přehled stavů kategorií [25](25-CREW-STAVY-KATEGORII.md) zůstává v backlogu; uživatelská kontrola je dál odložená.

## 2026-10-29 — dokončení samostatného CSV celku

**IMPLEMENTED / technické ověření:** místní přehled má čitelný CSV export filtrovaných uložených řádků jediného ročníku, bez automatického přenosu nebo změny evidence. Historie, všechny zdrojové sloupce, pořadí opakovaných popisků a ochrana rozepsaných změn ověřené synteticky. Podrobnosti a omezení v [24](24-CSV-PREHLED-A-ODLOZENE-KONTROLY.md). Neuzavírá ruční produktovou akceptaci, identity ani skutečné nové domluvy, které uživatel výslovně odložil.

## 2026-10-28 — ruční průchod později, samostatná práce pokračuje

**CONFIRMED:** uživatel odkládá vlastní kontrolu a další společná potvrzení na později a žádá pokračovat bez jejich průběžného vyžadování. Backlog uchovává identity/zařazení, skutečné domluvy, UX a konkrétní sdílená oprávnění jako otevřené. Mlčení není schválení těchto voleb. Další nezávislý technický celek: přehledový CSV export uložených filtrovaných řádků po jednotlivých ročnících, návaznost dřívějšího požadavku na čitelné exporty; neaktivuje plánovač ani změny sdílené DB.

## 2026-10-28 — navazující samostatný pracovní celek

**IMPLEMENTED / ověřeno místně:** podle pokynu pokračovat a priority Lidi a crew jsou jednotlivě zkontrolované obecné zdroje pracovního přehledu verzované v navazující větvi/Draft PR #19. Oprava SQLite snímků má návrh Claude, nezávislé review, menší dokončený opravný krok, hostitelské zpřesnění a 73 syntetických testů. Soukromé záznamy, původní sešit, historie a strojové vazby nejsou publikační nebo modelový kontext. Seznam k ručnímu průchodu je návrh pouze místně; neurčuje totožnost osob ani oprávnění. [23](23-PRACOVNI-EVIDENCE-A-SNIMKY.md) a [evidence](crew-snapshot-verification.json). Žádná nová produktová volba, produkční import, grant nebo nasazení se nepovažuje za schválené mlčením.

## 2026-10-28 — přímá spolupráce Codex → místní Claude Code

**CONFIRMED:** uživatel výslovně určil zahajovací prompt pro nastavení tohoto toku a bezpečné end-to-end ověření. Codex je jediný komunikační bod, připravuje zadání, nezávislé review/testy a Git; Claude Pro s výchozím modelem CLI připravuje implementace a opravy. Veřejný kód zůstává v `kabelkac77/SVDT2027` (`event-app/`, `event-app-zadani/`), účelové neveřejné podklady v samostatném soukromém repozitáři dle místního provozního záznamu. Oba přístupy ověřené přes místní GitHub CLI. SQLite, exporty, soukromé screenshoty a secrets mimo oba repozitáře. Nový projektový skill/runner, společný účtový kapacitní guard a zámek s iNice; iNice se nemění. Malé větve/Draft PR, žádný push main, deploy, ostrá migrace, zprávy nebo aktivace záloh. Skutečný stav ověření se průběžně eviduje v [22](22-CODEX-CLAUDE-SPOLUPRACE.md); příprava není důkaz úspěšného modelového/opravného běhu.

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
