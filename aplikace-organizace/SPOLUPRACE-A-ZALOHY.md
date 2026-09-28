# Spolupráce při vývoji a denní zálohy

## Stav — 2026-09-28

Repozitář `kabelkac77/SVDT2027` je veřejný. Uživatel 2026-09-28 zadal aktualizaci tohoto repozitáře kódem, dokumentací a předáním pro Claude. Soukromé podklady, konfigurace a zálohy zůstávají mimo Git. Viditelnost repozitáře se nemění. iCloud kopie není náhradou verzování přes Git.

**Finální umístění pro přechodné období určené uživatelem:** `[cesta v neveřejném PROVOZ.md]`. Nahrazuje dřívější návrh `iCloud Drive/SVDT-zalohy`. Do této složky byl úspěšně zkopírován první archiv `SVDT-zdroje_2026-09-28_21-32-05.zip` a soubor `.sha256`. Archiv zachycuje zdroje v okamžiku vytvoření, nikoli pozdější změny dokumentace. Jde pouze o zdroje a dokumentaci bez databázových dat. Zápis do místní iCloud složky neprokazuje dokončenou synchronizaci do cloudu. Automatické denní zálohy dosud neběží.

Potvrzený požadavek uživatele: jednou denně zálohovat aplikaci a její data, včetně čitelného výstupu CSV nebo Excel. Uživatel následně zvolil **dočasně vlastní iCloud Drive**, protože model Synology zatím nezná. Čas, retence a provozní služba dosud nejsou zvolené. Žádná automatická záloha není tímto dokumentem spuštěna.

Uživatel zvažuje Claude Code (Opus 5.5) jako hlavního implementátora a Codex jako autora zadání, revizora a správce dokumentace. Níže je doporučené rozdělení, nikoli již provedené předání nebo oprávnění automaticky posílat zprávy jiným agentům.

## Doporučené rozdělení

- Vojta: produktové priority, skutečná pravidla akce a uživatelská akceptace.
- Claude Design: vzhled a návrh obrazovek dle existujícího zadání.
- Claude Code: implementace po menších funkčních celcích, migrace, testy a aktualizace příslušné dokumentace v témže PR.
- Codex: datový model a akceptační zadání, nezávislé review změn, ověření testů, role/RLS a finanční výpočty, konzistence Markdown dokumentace a příprava dalšího kroku. Může opravit nalezený problém, ale je potřeba jednoznačně určit, kdo v danou chvíli mění dané soubory.

Není doloženo, který model bude na tomto repozitáři univerzálně silnější nebo levnější. Vyhodnotit první 2–3 skutečné úkoly podle funkčnosti, chyb po revizi, počtu oprav, celkové ceny a času. Tokeny různých modelů a účtování předplatného nelze porovnávat samotným počtem tokenů. Skills vybírat podle úkolu a dostupných nástrojů; jejich počet není měřítko kvality.

## Pracovní postup

1. Zadání v příslušném `.md`: účel, hranice, datový model, oprávnění a ověřitelné podmínky dokončení.
2. Jeden implementátor konkrétní změny, samostatná větev/check-out. Nikdy dva nástroje současně zapisující do stejných souborů. Před předáním zaznamenat větev a commit, otevřené změny a stav testů.
3. Implementátor dodá malý PR s kódem, testy a aktualizovaným `.md`; důležitá rozhodnutí zároveň zapíše do `DECISIONS.md`. Dokumentace není až následný úkol revizora.
4. Revize diffu i chování: únik dat mezi rolemi/ročníky, transakce a finanční součty, migrace a možnost obnovy, regresní testy a mobilní průchod. Kritické auth/finance části prověřit ještě před nasazením.
5. Opravy, uživatelské vyzkoušení a nasazení schváleného stavu. U releasu uchovat commit/tag, použité migrace a postup návratu. Vracející se starý frontend nemusí fungovat s nekompatibilně změněnou databází; migrace navrhovat kompatibilně.

Společný zdroj pravdy je `aplikace-organizace/`. Při zavedení spolupráce připravit krátké vstupní instrukce pro oba nástroje odkazující sem, ne dvě kopie architektury. Návrhy, potvrzená rozhodnutí, implementovaný kód a ověřený provoz musí být v dokumentaci rozlišeny.

Aplikace, dokumentace a předání pro Claude se verzují společně. Před každou integrací prověřit rozdíly vůči vzdálené větvi; neprovádět force-push přes práci z jiného chatu. Soukromé Excel podklady, `.env.local` a klíče nikdy necommitovat.

## Návrh zálohování

### Doporučené umístění podle nabízených možností

**Aktuální rozhodnutí:** dočasný cíl je uživatelem určená složka iCloud Drive, jejíž přesná cesta je v neveřejném `PROVOZ.md`. Lokální kořen iCloud Drive byl ověřen na `[lokální iCloud Drive]`. Jednotlivé zálohy ukládat s časem vytvoření, nepřepisovat jediný soubor. Lokální zapsání neprokazuje dokončenou synchronizaci na iCloud. Provoz přes tento Mac bude závislý na jeho dostupnosti a připojení; požadavek nezávislého provozu zůstává cílem po vyřešení NAS/plánovače.

První krok je kopie zdrojů aplikace a dokumentace bez `.env.local`, klíčů, soukromých podkladů a databázových dat. Nesmí být označena za kompletní denní zálohu. Pro databázový dump a CSV/XLSX stále chybí bezpečně nastavený servisní přístup a exportní úloha; veřejný publishable key jej nenahradí.

První archiv byl vytvořen lokálně v ignorovaném `.local/backups/SVDT-zdroje_2026-09-28_21-32-05.zip`: 68 zdrojových souborů, manifest s SHA-256 jednotlivých souborů, kontrola ZIP prošla. Přiložen kontrolní součet archivu. Po následném povolení byl archiv zkopírován do místní složky iCloud Drive; dokončená cloudová synchronizace nebyla ověřena. Denní automatizace stále neběží.

Uživatel má možnost Google Drive, osobního iCloud Drive a Synology. Doporučení: vytvářet denní zálohy na Synology a po dokončení přenést šifrovanou verzovanou kopii přes Hyper Backup na Google Drive. Model NAS/DSM, dostupnost balíčků, volná kapacita a nepřetržitý provoz se musí nejprve ověřit. Samotný Hyper Backup nevytvoří dump vzdálené Supabase databáze: první krok musí obsloužit samostatná úloha s databázovým klientem. Pokud NAS není vhodný pro běh úlohy, vybrat jiný plánovač; neprohlašovat zálohy za nasazené.

Čitelný CSV/XLSX export do oddělené soukromé složky Drive, aby jej uživatel mohl otevřít bez obnovy archivu. Šifrované Hyper Backup archivy vyžadují obnovovací nástroj a klíč; nejsou přímo otevřitelný Excel. Klíč k obnově držet ve správci hesel mimo NAS. Důvod druhé kopie: výpadek, ztráta nebo poškození NAS nesmí zničit jedinou zálohu.

Původní doporučení iCloud pouze jako doplňkovou kopii bylo pro přechodné období nahrazeno uživatelovou volbou výše. Je synchronizační: smazání se propaguje mezi zařízeními a obnova smazaných souborů je omezená. Ani obyčejná obousměrná synchronizace NAS↔Drive není náhrada verzovaných záloh. Synology + Drive zůstávají budoucí možností.

Ověřené podklady: [Synology Hyper Backup](https://kb.synology.com/index.php/en-us/DSM/help/HyperBackup/data_backup?version=7), [Google Drive jako cíl a šifrování](https://kb.synology.com/en-us/DSM/help/HyperBackup/data_backup_destination?version=7), [Apple — mazání v iCloud Drive](https://support.apple.com/en-ca/guide/icloud/mm3b7fcd0c10/icloud).

### Příprava Claude Code — další krok

Uživatel požaduje pomoc s nastavením Claude Code, skills a Markdown instrukcí pro tento projekt. Připravit stručný vstup `CLAUDE.md` a kompatibilní pokyny pro Codex s odkazy na stejný zdroj pravdy, konkrétními příkazy testů a pravidly migrací/RLS, citlivých podkladů a aktualizací dokumentace. Instrukce odvodit ze skutečného repozitáře. Skills a konektory zvolit cíleně podle aktuálního úkolu; přístupy k produkci a klíče nepřenášet automaticky. Projektová příprava je nyní hotová: `CLAUDE.md`, společné `AGENTS.md`, čtyři lokální skills a `HANDOFF-CLAUDE.md`. Globální nastavení, externí pluginy a přihlášení Claude se neměnily; načtení v Claude relaci zatím nebylo ověřeno. Nezaměňovat přípravu s automatickým předáváním zpráv mezi agenty.

| Co | Způsob | Účel |
| --- | --- | --- |
| Zdroj aplikace, MD, migrace, lockfile | Git po každém uceleném kroku, push do projektového repozitáře bez soukromých dat; denní kopie repozitáře mimo primární účet | Obnova konkrétní verze aplikace a historie |
| Databáze | Denní konzistentní dump schématu, dat a potřebných rolí/oprávnění, šifrovaný mimo Supabase | Skutečná obnova vazeb, funkcí a RLS |
| Provozní tabulky | Denní CSV po tabulkách a přehledný XLSX po modulech | Čitelnost bez aplikace a další zpracování |
| Nahrané přílohy | Denní kopie objektů a inventáře souborů | Obnova faktur, smluv, obrázků; DB obsahuje pouze metadata |
| Konfigurace a přístupy | Verzionovaný nesekretní postup nasazení; tajné údaje zvlášť ve správci tajemství | Obnova hostingu, OAuth a externích integrací |

Navržený režim: každou noc 03:00 Europe/Prague, nezávisle na zapnutém notebooku. Plánovač a úložiště vybrat po určení cíle; v chatu zatím není vytvořena ani aktivována žádná automatizace. Záloha má mít omezenou servisní identitu mimo prohlížeč. Publishable key pro kompletní dump nestačí. Pro citlivé dumpy použít šifrování a oddělené přístupy, žádné veřejné odkazy ani Git artefakty s osobními údaji.

Retence k potvrzení: 30 denních a 12 měsíčních kopií; chránit před hromadným smazáním a poškozenou synchronizací. Denní záloha znamená při havárii možnou ztrátu až přibližně 24 hodin práce; před závodem zvážit častější obnovitelné body. Každý běh ověří upload, velikost, kontrolní součet a manifest s časem, verzí schématu a počty řádků. Hlásit chybu i chybějící běh; pouhá existence naplánované úlohy není důkaz úspěšné zálohy.

CSV zachová stabilní ID, ročníky, všechny řádky, jednoznačné datumy a částky; rozliší NULL a prázdný text a přiloží popis formátu. Excel má přehledné listy pro Partnery, kontakty, plnění, Finance, úhrady a další implementované moduly. Textové buňky exportovat bezpečně proti spuštění vložených vzorců a zachovat IČO/telefon jako text. Přihlášení, hashe hesel, tokeny a secrets nepatří do čitelných exportů. Obnovovací záloha Auth dat vyžaduje zvláštní ochranu a otestovaný postup; export obchodních tabulek ji nenahrazuje.

Rozsah exportu musí odpovídat skutečně nasazeným modulům. Dnešní Finance jsou jen lokální demo, nikoli produkční data v Supabase. Data jen v localStorage nebo soukromých lokálních podkladech serverová záloha neuvidí; před ostrým provozem je potřeba jejich vědomá migrace nebo samostatná záloha.

## Podmínky dokončení záloh

- Zvolený cíl a servisní přístupy; plán běží i při vypnutém počítači.
- Ručně i plánovaně ověřený úspěšný běh, opakování po chybě a upozornění na výpadek.
- Zkušební obnova do izolovaného prostředí: tabulky, vazby, role/RLS, Auth a přílohy podle rozsahu; následné funkční ověření aplikace.
- CSV/XLSX otevřené a zkontrolované oproti manifestu a počtům řádků; úplnost ročníků a auditních dat podle exportního modelu.
- Ověřená retence a plán pravidelného testu obnovy. Zálohování lze označit za hotové až po ověření obnovy.

## Zdroje ověřené 2026-09-28

- [Anthropic Opus 5.5](https://www.anthropic.com/claude-opus-5-5): oznámení modelu a deklarovaná úspora vůči Opus 5; nejde o nezávislý benchmark SVDT.
- [OpenAI — code generation](https://developers.openai.com/api/docs/guides/code-generation): Codex podporuje implementaci, review i ladění; rozdělení rolí výše je naše doporučení.
- [Supabase — Database Backups](https://supabase.com/docs/guides/platform/backups): Free vyžaduje vlastní pravidelné exporty; vestavěné databázové zálohy nezahrnují Storage objekty. Denní zálohy placených tarifů nenahrazují nezávislou kopii mimo projekt.

## Rozdělení veřejné a neveřejné části — 2026-09-29

Veřejný kód a obecná specifikace zůstávají v `kabelkac77/SVDT2027`, dokumentace v `aplikace-organizace/`. Neveřejné podklady a provozní údaje patří do soukromého `vojtechhrach/SVDT2027-neverejne/aplikace-organizace-neverejne/`. Toto rozhodnutí nahrazuje dřívější plošný zákaz verzovat podklady: do soukromého repozitáře jsou výslovně schválené, do veřejného nadále nesmějí. Hesla a klíče se neverzují nikde. Přístupy k oběma repozitářům se ověřují odděleně.
