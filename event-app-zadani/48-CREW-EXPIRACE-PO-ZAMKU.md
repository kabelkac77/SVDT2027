# Crew — expirace schválení po čekání na zápisový zámek

## 2026-11-28 — oprava61 implementovaná a synteticky ověřená55

Přímo Codexem implementovaná a synteticky ověřená oprava v [55](55-CREW-OPRAVA-EXPIRACE-A-OVERENI.md). Nová8. migrace, původních7 beze změny. Stejný RX01 prošel1/1, rollback všech30 relací; replay/ACL a dump/restore ověřené. Připraveno k review, nikoli merge/deploy/živá aktivace. Aktuální implementační postup22/AGENTS je přímý Codex; níže uvedený native postup je původní historické zadání.

### Původní záznam chyby před opravou

Stav2026-11-28: **reprodukovaná chyba, runtime oprava není implementovaná; blokuje aktivaci**. Zjištěno nezávislou skutečnou PostgreSQL zkouškou RX01 podle [47](47-POSTGRES-PRERUSENI-A-SCHVALENI.md). Žádný provozní import nebo změna dat neproběhly. Původních7 migrací se nesmí zpětně přepisovat.

## Přesný spouštěč a výsledek

1. V nové syntetické DB vytvořit explicitní create plán builderem38 a operátorské schválení na2 sekundy.
2. Jiný klient drží `LOCK TABLE public.crew_roster IN SHARE MODE` čtyři sekundy. SHARE dovolí předchozí SELECTy a zablokuje skutečný importní SHARE ROW EXCLUSIVE.
3. Spustit nový request/import a serverově pozorovat `pg_locks`: neudělený `ShareRowExclusiveLock` přímo na crew_roster, nikoli libovolný Lock nebo čekání na edition.
4. Po uvolnění je schválení prokazatelně expirované. RPC aktuálně vrátí SQL exit0 a vytvoří1 roster/odměnu/balíček/request. Test vyžadující odmítnutí skončí exit1. Počet Person0 a Auth users2 zůstává syntetický původní stav.

V `crew_import_apply` je kontrola expires_at před globálním LOCK TABLE. Po čekání se kontroluje cílový otisk/původ, ale časová platnost se před prvním INSERT znovu neověří. To je v rozporu s požadavkem37, že uplynutí platnosti brání novému zápisu. Dosavadní zelená expirace při čekání na edition lock tento pozdější interval netestovala.

## Malé zadání pro pozdější nativní opravu

Po obnovení stávajícího native přihlášení připravit nový schema-only migrační soubor, například `202611280001_crew_import_expiry_guard.sql`, který zachová signaturu/SECURITY DEFINER/search_path/oprávnění a ostatní chování funkce. Žádné spuštění na provozním projektu, grant, nové účty, UI nebo přístup k reálným podkladům. Minimální kontext:37, tato48 a výslovně zkontrolovaná schema-only definice stávajícího importu. Žádný dump nebo skutečný plán/zdroj.

Po všech potenciálních čekáních a před prvním novým zápisem znovu ověřit časovou platnost (`clock_timestamp()`, ne transaction_timestamp). Recheck umístit také za nákladnou validaci zdroje, bezprostředně před vytvoření balíčku; pouhá kontrola před/hned za LOCK nestačí, pokud ještě následuje dlouhé parsování. Vrátit stávající konstantní CREW_IMPORT_APPROVAL_EXPIRED/42501, bez osobních údajů, a nechat transakci kompletně vrátit zpět.

Zachovat pravidlo úspěšného identického replay: může po expiraci vrátit již uložený výsledek bez nových zápisů, pokud stále platí ostatní oprávnění a schválení nebylo odvolané. Nový recheck nesmí tuto cache větev zablokovat. Neměnit operátorské pořadí edition zámků nebo udělat revoke obcházející transakční serializaci. Jde o technické zpřesnění existujícího37, ne nový uživatelský finanční/kompetenční rozsah.

## Nezávislá akceptace opravy

- RX01 se stejným SHARE holderem a serverově doloženým ShareRowExclusiveLock musí po expiraci vrátit42501 a nulové nové balíčky/roster/odměny/requests; celý předchozí snapshot beze změny.
- Před expirací a po krátkém čekání nový legitimní import dál uspěje.
- Úspěšný identický request po expiraci dál vrací cache bez změny dat; jiné tělo/approval/request zachová původní konflikty a jednorázovost.
- Po odvolání schválení nebo ztrátě role se nadále odmítne i replay. RP01–RP06, ostatní importer/guard/readonly kontroly musí zůstat úspěšné.
- Aktualizovat přesný migrační inventář s8. additive souborem, předchozích7 SHA beze změny, autoApply:false. Preflight zde nepřidává tabulky nebo signaturu; jeho přítomnost neprokazuje opravené tělo na skutečném serveru.
- Znovu provést skutečnou syntetickou obnova/dump a role kontroly s celým opraveným schématem; až potom samostatně podle31/45 posuzovat provozní aktivaci.

Reproducer zůstává uložený se striktním očekáváním odmítnutí. Žádný expectedFailure, převrácení očekávání na „povolit“ nebo ignorování chyby jako cesty k zelenému výsledku. Opravu provést až v autorizovaném nativním toku; aktuální blok zaznamenává chybu a připravuje test/zadání, runtime ji neopravuje ani neobchází přihlášení.
