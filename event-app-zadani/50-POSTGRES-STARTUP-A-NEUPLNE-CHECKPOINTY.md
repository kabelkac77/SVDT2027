# Chyby spuštění a neúplné checkpointy testovacího serveru

Rozsah 2026-11-28 navazuje na [49](49-POSTGRES-SOUBEH-A-RECOVERY.md). Jde pouze o hostitelskou infrastrukturu izolovaných syntetických testů. Aplikace, importní RPC, kolektor a sedm původních migrací zůstávají beze změny. [Expirace48 / issue61](48-CREW-EXPIRACE-PO-ZAMKU.md) je stále neopravena a blokuje aktivaci. Výsledky viz [samostatná evidence](postgres-startup-verification.json).

## Rozlišení stavu před a po pokusu o vytvoření

Dosavadní checkpoint nemusel obsahovat ID a volumes, pokud proces skončil mezi Docker create a uložením jeho výsledku. Nová verze2 zapisuje fázi `creating` atomicky **před odesláním** create. Pokud zápis checkpointu selže, create se vůbec nevolá. Validované úplné checkpointy verze1 zůstávají čitelné; neúplný stav staré verze se neinterpretuje jako bezpečně nepoužitý.

| Checkpoint | Živý kontejner | Postup |
| --- | --- | --- |
| v2 prepared, ID null, volumes prázdné | Potvrzeně chybí | Create ještě nebyl zahájen. Odstraní se jen známé místní jednorázové přístupy a uloží cleaned. |
| v2 creating, ID null, volumes prázdné | Přítomen a úplně ověřen | ID i anonymní volume se převezmou pouze z nezávisle ověřených živých metadat; potom standardní úklid vlastního kontejneru. |
| v2 creating, ID null, volumes prázdné | Chybí nebo výsledek nejde ověřit | Nejasný výsledek create. Zastavit, zachovat checkpoint i přístupy, označit ruční posouzení. Žádný automatický retry ani globální hledání/mazání volumes. |
| v1/v2 created, ready, cleaning nebo cleaned s úplnými ID | Přítomen | Musí souhlasit všechna živá metadata včetně zaznamenaných ID/volumes; pak standardní úklid podle49. |
| Úplný checkpoint, kontejner chybí | Všechny zaznamenané volumes také potvrzeně chybí | Dokončit pouze místní úklid. Existující či neověřitelný orphan znamená odmítnutí. |
| v2 cleaned bez ID/volumes | Potvrzeně chybí | Idempotentní dokončení bez Docker mazání; původní selhaná sada se nestává úspěšnou. |
| Neplatný/napůl vyplněný checkpoint, cizí identita či mount | Libovolný | Odmítnout zásah; důkazy zachovat. |

Při ztrátě ID se inspektuje výhradně přesný vlastní název z validovaného checkpointu, nikoli seznam Docker prostředků. Živý výsledek musí doložit kanonické ID, přesný název, připnutý image, vlastní náhodný label, jediný správný readonly password bind a jediný anonymní volume na očekávaném místě. JSON ani samotný label mazání neopravňují. Před změnou se znovu kontroluje nezměněný checkpoint. Chyba daemonu/socketu není potvrzená absence. Nezavádí se `volume rm`, prune ani provozní DB vstup.

## Čtyři řízené skutečné chyby spuštění

Opt-in režim `--verify-startup-failures` spustí čtyři vlastní child procesy, každý s vlastní soukromou složkou a novým tokenem. Jde o úmyslné výjimky na konkrétních bodech, nikoli tvrzení o simulaci všech síťových poruch daemonu nebo výpadku napájení.

| Fáze | Vyvolaná situace | Skutečný výsledek |
| --- | --- | --- |
| prepared | Výjimka před pokusem o create | Žádný kontejner nevytvořen, pouze místní úklid. |
| receipt | Docker create uspěl, ale ID není převzato ani uložené | Recovery nalezla přesný vlastní kontejner, ověřila živou identitu/storage a uklidila ho i anonymní data. |
| start | Kontejner vytvořený, před příkazem start nastane chyba | Uklizen vytvořený nespouštěný kontejner i data. |
| readiness | Kontejner běží, místní service/pgpass existují, chyba před readiness kontrolou | Uklizen běžící kontejner, data i jednorázové přístupy. |

Každý child vrací exit1, `failureCategory: STARTUP_FAILED`, `successful: false` a nula spuštěných DB případů. Úspěšný úklid nesmí chybu startu přebarvit na úspěšnou sadu. Rodič nezávisle ověří absenci kontejneru, volumes i známých přístupových souborů. Pak **nový proces** zopakuje recovery; ve všech čtyřech fázích bezpečně rozpozná cleaned stav. Pouze rodičovský ověřovací scénář hlásí úspěch těchto čtyř očekávaných selhání.

Pokud cleanup nelze doložit, hlavní běh vrátí exit1, `successful: false`, `manualReviewRequired: true` a bezpečnou kategorii chyby bez raw stderr/hesel. Zachovává checkpoint a jednorázové podklady pro pozdější ověření; běžný cleanup s neznámou identitou ho nepřepíše. Přerušení signálem si zachovává vlastní návratový kód.

## Opakování a výsledky

Použít stejné explicitní lokální argumenty a soukromý output root jako46/49. Žádný daemon/context z ambientního prostředí a žádný provozní connection string. Režimy jsou vzájemně výlučné:

```text
--verify-startup-failures
--probe-startup-failure prepared|receipt|start|readiness
--recover-owned-test /absolute/private/run/checkpoint.json
```

Osm nových unit scénářů bez Dockeru kontroluje legitimní rané v2 versus nejasné v1, převzetí chybějící identity pouze po živém ověření, zachování důkazů při creating+absence, bezpečný prepared úklid, odmítnutí napůl vyplněných ID, zákaz create po selhání zápisu checkpointu a dvě větve reportování chyby startu/úklidu. Celkem prošlo190 hostitelských testů a26 bezpečnostních i při Python -O.

Znovu prošlo10 standardních skutečných PostgreSQL případů, řízený SIGTERM i SIGKILL s novou a opakovanou recovery. Samostatný striktní RX01 znovu **selhal**: po skutečném čekání na ShareRowExclusiveLock vytvořil RPC nový syntetický zápis po expiraci. Nula prošlých z jednoho, bez expectedFailure a bez započítání do úspěchů. Změna testovacího startu neopravuje runtime61.

## Otevřené věci a další pořadí

- Reálný výpadek napájení, ztráta celého checkpointu, poškození filesystemu/disk full a asynchronní nejistý výsledek daemonu nejsou tímto čtyřbodovým řízeným testem dokázané. Constructor/report I/O ještě před či po chráněném běhu není univerzálně zotavované. Nejasné creating a osiřelé volumes potřebují pozdější bezpečné posouzení, žádný slepý retry nebo mazání.
- Dále bez přihlášení: doplnit cílené neinvazivní zkoušky poškozených/truncated checkpointů a selhání jejich zápisu; odlišit nemožnost zapsat report od úspěchu úklidu. Výpadek hostitele provádět až v dohodnutém prostředí.
- V nativním implementačním toku má přednost oprava48/61, potom parser43 → checker39 → UI44.18+26 pending scénářů zůstává nespouštěných. Native auth/model/usage se v tomto bloku nezkoušelo.
- Projekt/účty/OAuth/scopes, skutečné Storage bajty a provider secrets, úplný vzdálený cíl/klíč/obnova/plánovač, browser a samostatný aktivační pokyn zůstávají odložené v31/45. Žádný skutečný import, provozní DDL/grant, deploy nebo aktivace záloh.

## 2026-11-28 — doplnění51 pro poškození a I/O

[51](51-POSTGRES-POSKOZENA-EVIDENCE-A-CHYBY-ZAPISU.md) uzavírá dílčí otevřenou kontrolu poškozených checkpointů a řízených chyb zápisu. Před aktualizací se znovu validuje předchozí soukromá evidence a vlastní identita; chybějící/poškozený soubor se při cleanup nepřepíše. Report má atomickou publikaci a oddělené reportPersisted/fakta úklidu. Chyba constructoru nebo explicitní recovery má bezpečnou odpověď.3 skutečné řízené I/O chyby s novou/opakovanou recovery a13 nových unit případů prošly. Neřeší univerzálně power loss/disk full, pozdní chyby a souběžnou recovery.48/61 dál blokuje aktivaci.
