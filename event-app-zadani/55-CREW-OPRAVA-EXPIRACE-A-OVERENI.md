# Oprava expirace schválení po čekání — issue61

2026-11-28. Implementuje přímo Codex podle aktuálních22/AGENTS. Technická oprava48 je implementovaná a ověřená synteticky, připravená k review. Není sloučená/nasazená ani aplikovaná na skutečný projekt; targetAppliedState zůstává unknown, autoApply:false a ostatní živé brány31/45 jsou otevřené. [Evidence](crew-expiry-fix-verification.json).

## Výsledné chování

Nová additive migrace `202611280001_crew_import_expiry_guard.sql` nahrazuje pouze tělo stávající crew_import_apply při zachování signatury. Bezprostředně před první nový INSERT balíčku znovu kontroluje expires_at proti clock_timestamp(), tedy až po čekání na tabulkové zámky, kontrole cíle a validaci/parsování zdroje. Při expiraci vrátí stávající CREW_IMPORT_APPROVAL_EXPIRED/42501 a transakce nezanechá nový package, roster, compensation, request ani audit.

Cache větev úspěšného identického requestu zůstává dříve: po expiraci může vrátit uloženou odpověď bez nových zápisů. Kontroly identity/role/ročníku a revokace jsou stále před replay, konfliktní fingerprint a jednorázovost approval se nemění. Žádný nový uživatelský kompetenční nebo finanční rozsah.

Prvních7 migračních souborů má stejné SHA jako před opravou. Soubor8 je CREATE OR REPLACE stejné funkce bez nových tabulek, signatur, datových operací při migraci nebo GRANT/REVOKE. Kromě CREATE OR REPLACE se původní definice liší jen jednou pozdní časovou podmínkou a komentářem. Skutečný PostgreSQL i PGlite ověřily stejné OID/vlastníka/SECURITY DEFINER/volatilitu/search_path/ACL před a po upgradu. Migrační inventář pinne všech8 souborů a přidává požadavek crew_import_expiry_after_lock_acceptance před živým provozem.

## Důkaz před a po opravě

| Zkouška | Výsledek |
| --- | --- |
| Původní RX01 před změnou | Skutečně selhal0/1: approval expirovalo během pozorovaného neuděleného ShareRowExclusiveLock, SQL exit0 a1 nový balíček/roster/odměna/request. |
| Stejný striktní RX01 s8. migrací | Prošel1/1. Stejný SHARE holder4s a approval2s, doložený ShareRowExclusiveLock a serverová expirace; odmítnutí42501/CREW_IMPORT_APPROVAL_EXPIRED, SQL exit3, nula nových řádků. Celý snapshot30 relací proti stavu po schválení nezměněný. |
| Platné approval a krátké skutečné čekání | Pozorovaný ShareRowExclusiveLock, import před expirací uspěje. Po serverově doložené expiraci přesný replay vrátí původní odpověď a30tabulkový snapshot zůstane stejný. |
| Expirace při pomalé validaci zdroje | Pouze v syntetické DB je parser obalený řízeným pg_sleep. Approval vyprší až při této validaci; před prvním INSERT se odmítne42501 a všech30 relací zůstane beze změny. Wrapper není součást migrace ani aplikace. |
| Skutečný dump/restore opraveného schématu | Zachová všech30 relací, historii/provenance/NULL0/RLS/politiky i přesnou definici, vlastníka, konfiguraci a ACL opravené importní funkce. Auth/Storage jsou syntetické metadata, nejde o vzdálenou provozní obnovu. |

RX01 se neoslaboval, nebyl expectedFailure a nepřevracela se očekávání. Přibyly požadavek konstantní chybové zprávy a úplný rollback snapshot. Běžná skutečná PG sada má12 úspěšných případů (10 předchozích + platné čekání/replay + pomalá validace). Samostatný RX01 se počítá zvlášť jako úspěšný až po opravě.

## Další ověření

Dva nové PGlite případy dokazují neinvazivní upgrade metadat/ACL/dat a expiraci během validace. Dosavadní test expirace/replay nově kontroluje nezměněný stav po replay. Importer, historie a katalogový preflight používají celé aktuální schéma včetně8. migrace; celkový katalog zůstává26 aplikačních +4 platformní relace a27 funkcí.

Celá aplikační/DB sada281 prošla bez skipped/todo, cílená importer/history/preflight/manifest sada35 prošla,234 hostitelských a70 optimalizovaných bezpečnostních také. TypeScript i lokální produkční build prošly. Browser/live OAuth/doručení/transportní scopes ani skutečný projekt se tímto neověřují.18+26 parser/checker scénářů zůstává pending a nespouštělo se.

Čisté závislosti byly připravené z přesného lockfile přes npm ci offline/ignore-scripts. Buildem vytvořené next-env změny byly odstraněné jen v izolované pracovní větvi; původní uživatelská kopie se nepřepisuje hromadně. Žádné skutečné crew/SQLite/podklady ani provider přístupy nebyly otevřené. Claude auth/model/usage se nevolaly.

## Co je ještě potřeba před aktivací

Oprava v Draft PR není důkaz, že skutečný host používá opravené tělo. Přítomnost funkce/stejné signatury/RLS v preflight nestačí. Operátor později musí v potvrzeném projektu a stavu migrací doložit aplikaci8. migrace a metadata/tělo, potom stejnou bezpečnou akceptaci podle31/45. Tato práce žádný provozní SQL příkaz nespouštěla.

Referenční SHA256 samotného veřejného PL/pgSQL prosrc nové funkce (UTF-8, včetně úvodního/závěrečného newline) je `8a8541e0d756b7c9e01be74b625cf43fa53d38cd71340f398a150043fd4dd4c6`. Příklad budoucího read-only ověření metadat bez vrácení těla nebo business řádků:

```sql
BEGIN READ ONLY;
SELECT encode(sha256(convert_to(p.prosrc,'UTF8')),'hex') AS body_sha256,
       p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) AS owner,
       has_function_privilege('authenticated',p.oid,'execute') AS authenticated_execute,
       has_function_privilege('anon',p.oid,'execute') AS anon_execute
FROM pg_proc p
WHERE p.oid=to_regprocedure('public.crew_import_apply(uuid,uuid,uuid,text,text)');
ROLLBACK;
```

Nulový výsledek, nesouhlas hash/flags/ACL nebo neověřený projekt není souhlas k aktivaci. Porovnat s potvrzeným vlastníkem a search_path; nevytvářet automaticky účty či granty. Globální role/provider secrets, skutečné Storage bajty, úplná vzdálená záloha/klíč/obnova, více účtů/browser a výslovný souhlas s importem stále podle31/45. Čtyři dřívější soukromé syntetické temporaries z54 zůstávají evidované bez čtení obsahu/mazání.

Další přímá implementace Codexem:43 parser přesného plánu →39 checker převodu →44 inline historie. Nečeká na Claude přihlášení. Skutečný import, provozní DDL/grant/deploy/merge a aktivace záloh zůstávají neprovedené a bez nového souhlasu.
