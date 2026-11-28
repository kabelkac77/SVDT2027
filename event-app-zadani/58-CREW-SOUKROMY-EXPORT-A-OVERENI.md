# Crew — úplný soukromý export a ověření

2026-11-28, přímá implementace Codexem podle uživatele a22/AGENTS. Navazuje na39/57. Base aa702da5efb50da385281b080f539d1dbb3798bb, větev codex/crew-private-export. [Strojová evidence](crew-private-export-verification.json).

## Připravený nástroj

`event-app/tools/crew_import_export.py`:

- `build_export_sql(edition_id, database, database_user, request_id=None, request_actor_id=None)` vrací pouze pevný čtecí SQL s úzce validovanými ID/názvy.
- `validate_export(raw_bytes, ...)` kontroluje přesný envelope/scope/transakci, úplnost targetu včetně goals/source_history_id, a po převodu uložený plán/receipt/source proti stávajícímu parseru/checkeru. Obecnou validaci bez vymyšleného zdroje poskytuje nová čistá funkce validate_target_export v reconcile helperu.
- `collect_export(...)` spustí pouze tento SQL přes explicitně vybraný psql a soukromou službu, validuje výstup a uloží jeden atomicky publikovaný export.json. CLI navíc vyžaduje výslovný --collect. Import modulu nic nepřipojuje.

Před převodem obsahuje envelope úplný target, metadata ročníku/DB/DB uživatele/serverové auth.uid, transactionReadOnly:true a isolationLevel:'repeatable read'; receipt/planText/storedSourceText jsou explicitněNULL. Po převodu je nutné zadat requestId i requestActorId, protože request ID je unikátní v jejich společném scope. Export pak ve stejném statement snapshotu přečte skutečný uložený plán, receipt a přesný source_text příslušného balíčku. Není to identita nastavovaná exportérem. Žádné SET ROLE/JWT/set_config, žádné DDL/grant/importní volání.

Transakce je READ ONLY / REPEATABLE READ, má statement timeout30s a lock timeout5s; klient má connect timeout15s a celkový procesní limit60s. Soubor omezený na512MiB (+psql newline), serverový SELECT výslovně hlídá byte limit. Proces píše do privátního dočasného souboru, nikoli do modelu/logu nebo veřejné odpovědi. Úplné link/package metadata pocházejí přímo z DB; source_text se vynechává z hromadných metadat a vrací jen pro zvolený request. Cílový fingerprint z původního serverového přehledu se nepřepočítává ani nenahrazuje.

Archivovaný2027 lze číst; příznak archivu zůstane ve výstupu a následný checker ho dál blokuje pro aktivaci. Každý envelope a úspěšný výsledek mají authorityVerified/applyReady/cutoverReady:false. Export a porovnání artefaktů neprokazují serverovou autoritu, reálný OAuth/JWT, souhlas s importem nebo úspěch vzdálené obnovy.

## Ochrana soukromých podkladů

Výstup musí být pod ignorovanou .local tohoto checkoutu. Adresářový průchod používá nofollow a otevřená FD, cílový parent/job je vlastněný současným uživatelem a0700. Soubor0600, žádné symlinky/nahrazování nebo hardlinkované vstupní konfigurace. Config/pass soubory jsou explicitní soukromé pravidelné soubory0600; do dítěte se předají připnutými /dev/fd, jejich obsah se nevypisuje nebo nekopíruje do exportu. Prostředí nezdědí PGPASSWORD/PGHOST/PGOPTIONS/HOME/PSQLRC ani jiné připojovací fallbacky. -X/--no-password/ON_ERROR_STOP a shell:false, všechny raw serverové chyby potlačené.

Po kontrole obsahu a inode/velikosti/mtime/ctime se soubor fsyncne a publikuje exkluzivním hardlinkem bez přepsání export.json. Potom se synchronizují adresáře a odstraní jen vlastní .partial alias. Při chybě či přerušení může zůstat soukromý .partial/job; chyba po publikaci zachová celý finální soubor, ale nehlásí úspěch. Nic se automaticky nemaže nebo nerecykluje. Úspěšná CLI odpověď obsahuje pouze stav/cestu/SHA a false brány, ne osobní data. Chyby jsou konstantní CREW_PRIVATE_EXPORT_FAILED bez raw hodnot; i neplatné CLI argumenty se neechojí.

Export je nešifrovaný soukromý operátorský artefakt, nikoli úplná nebo vzdálená záloha. Nepatří do Gitu/public/browseru/localStorage/modelu/logů. Případné zbytky a retenční postup ručně později31/45; samostatné staré4 syntetické temporaries54 beze změny.

## Spuštění až po potvrzení přístupů

Předem je třeba potvrdit projekt/službu/DB/DB uživatele, TLS a vhodnou již ověřenou admin session s potřebnými čtecími právy. Běžný authenticated účet nemá SELECT na crew_import_requests; exportér mu nedává grant ani neobchází toto omezení. Tento blok žádnou takovou provozní službu nevytvořil a nepoužil. Připravená šablona bez skutečných hodnot:

```sh
python3 event-app/tools/crew_import_export.py --collect \
  --edition-id EDITION_UUID --database POTVRZENA_DB --database-user POTVRZENY_DB_UZIVATEL \
  --service POTVRZENA_SLUZBA --service-file /ABS/SOUKROMY_SERVICE_SOUBOR \
  --pass-file /ABS/SOUKROMY_PASS_SOUBOR --psql /ABS/psql
```

Pro stav po převodu navíc explicitně --request-id REQUEST_UUID --request-actor-id REQUEST_ACTOR_UUID. Jde o čtení již existujícího requestu, nikoli spuštění převodu. Vybraný output-parent musí být v .local; výchozí .local/crew-import-exports. Bez --collect není připojení dosažitelné. Report checkeru může následně použít before.target a after.target/receipt/planText/storedSourceText, stále s trvalými branami39. Bezpečný zápis dalších reportů/retenci řešit samostatně, žádné implicitní zveřejnění.

## Skutečně provedené ověření

- 19 nových syntetických unittest scénářů: before/after, přesné UTF8/whitespace/source/plan, scope/transakce/identity, malformed JSON/Unicode/typy/velikost, archiv, no-inference/read-only SQL, explicitní CLI, omezené prostředí a config FD,0700/0600, nepřepisování, chyby procesu/timeout/uzavření stdin, záměna adresáře a stejného inode, I/O před/po publikaci.19 prošlo i při Python -O.
- Celá hostitelská sada313 prošla včetně kontroly ResourceWarning; chyby/úniky prostředků se nevydávají za hotový výsledek.
- PGlite propojení používá skutečný generovaný SQL exporteru pro before/after a následný checker. Standardní neúplný RPC sám stále správně selhává validací.281 app/DB, typecheck a build prošly; žádná změna klientského UI.
- Skutečný izolovaný PostgreSQL18.6/psql: opt-in --probe-private-export vytvořil jen vlastní syntetický server a službu s umělou auth.uid session. Export před/po, skutečný receipt/plan/readback a checker prošly1/1. Při obou čteních přesný snapshot všech30 relací beze změny, soubory0600 a adresáře0700, SHA souhlasí. Vlastní kontejner/volumes/jednorázové přístupy uklizené a report uložen. Umělá session neprokazuje živý OAuth/JWT.
- Všech8 migračních souborů/SHA beze změny. Samostatné12 PG/RX01/dump-restore z55 jsou baseline, v tomto bloku nebyly novým exportním scénářem nahrazené ani znovu celé spuštěné. Normální CI nespouští Docker, model nebo skutečný projekt.

```sh
python3 -B -m unittest discover -s event-app/tests -p '*_test.py' -v
python3 -B -O -m unittest discover -s event-app/tests -p 'crew_import_export_test.py' -v
cd event-app
npm run typecheck
npm test
npm run build
```

## Backlog a odložené potvrzení

Další neblokovaná implementace44: inline historie crew a12 browser scénářů. Později společná kontrola Draft změn55–58, skutečného cíle/DB služby/TLS/session/čtecích práv a nakládání s exporty. Dále31/45 živé účty/scopes/OAuth/Storage/provider, aplikovaná8. migrace, úplná vzdálená záloha/klíč/obnova/browser a výslovný aktivační krok. Žádné dotazy nyní, žádný skutečný personál/SQLite/import/DDL/grant/deploy/merge nebo Claude auth/model/usage.
