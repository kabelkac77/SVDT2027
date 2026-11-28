# Izolované testy — přerušení a schválení

Rozsah2026-11-28 navazuje na46. Pouze vlastní jednorázové servery a syntetické podklady. Aplikační runtime ani původních7 migrací se nemění; native Claude/auth/usage a provozní přístupy se nevolají. Výsledky mají oddělenou [evidenci](postgres-interruption-verification.json).

## Soukromý checkpoint a SIGTERM

Testovací skript zapisuje atomický checkpoint0600 v nové soukromé složce0700: fázi prepared/created/ready/cleaning/cleaned, token/název/ID vlastního kontejneru, jeho anonymní volumes a připnutý image. Žádné heslo, zdrojové řádky nebo přístupové tokeny. Zápis používá dočasný soubor/fsync/replace; při selhání replace zůstává předchozí úplný checkpoint. Symlink se odmítá. Checkpoint je pouze evidence pro kontrolu, ne vstup opravňující k mazání prostředků z JSON.

Vytvoření kontejneru je oddělené od spuštění. Během create → zachycení identity a volumes → checkpoint je SIGINT/SIGTERM blokovaný; po zaznamenání se obnoví původní signal mask a čekající signál se zpracuje. Běžné ukončení/SIGTERM projde kontrolou vlastnického labelu, úklidem pouze vlastních dat a smazáním jednorázových přístupů. Přerušení má vlastní výsledek a exit143, nikdy se nevydává za úspěšně dokončenou sadu testů.

Reprodukovatelná opt-in volba `--verify-sigterm` vytvoří vlastní child proces stejného skriptu s `--probe-interruption`. Po jeho ready checkpointu ukončí pouze tento PID přes SIGTERM. Ověří exit143, casesRun0/successful:false, cleaned checkpoint, odstranění přístupových souborů a nezávisle přes Docker potvrdí absenci daného kontejneru/volumes. Chyba socketu/daemonu není potvrzený úklid. Všechny cesty a samotné checkpointy zůstávají soukromé; veřejný výsledek obsahuje pouze stavové údaje.

Použijí se stejné povinné argumenty jako46, navíc jedna volba režimu. `--verify-sigterm`, `--probe-interruption` a `--probe-expiry-after-lock` jsou vzájemně výlučné; bez `--run-synthetic` se žádný režim nespustí. Žádný nový automatický Docker běh v CI, cron nebo provozní CLI.

## Kontroly schválení — odlišné fáze čekání

| Případ | Skutečná synchronizace | Výsledek |
| --- | --- | --- |
| RP05 Odvolání schválení při čekání na ročník | Držitel edition row lock zavolá operátorské revoke ve své transakci a commitne; import čeká, potom načte odvolání. | Odmítnutí42501, žádný importní zápis; prošlo. |
| RP06 Expirace při čekání na ročník | Dvou-sekundové schválení, edition row lock držený čtyři sekundy. | Odmítnutí42501 po uvolnění; prošlo. |
| RX01 Expirace při čekání na zápisové tabulkové zámky | Držitel používá SHARE (povolí dřívější čtení). Požadavek musí být pozorovaný přímo jako neudělený ShareRowExclusiveLock na crew_roster. | Po expiraci RPC přesto úspěšně zapíše. Striktní test selhal; chyba není opravená. |

ACCESS EXCLUSIVE může zablokovat dřívější čtení/kompilaci dotazu. Pouhé „čekal na Lock“ proto nedokládá, že schválení už bylo zkontrolované. RX01 výslovně ověřuje konkrétní mód a relaci, serverově uplynulou platnost a skutečné výsledné počty.

RX01 je samostatný striktní reproducer `--probe-expiry-after-lock`, není expectedFailure, není přeskočený úspěch a nepočítá se do prošlých testů. V aktuálním kódu má exit1/successful:false; očekávané chování je odmítnutí nového zápisu. Šest standardních případů46/RP05/RP06 může současně projít, což tuto chybu nezneplatňuje. Návrh opravy a akceptace jsou v [48](48-CREW-EXPIRACE-PO-ZAMKU.md).

## Rozsah hotovosti a otevřené kroky

- Šest standardních skutečných PostgreSQL případů a samostatná řízená zkouška SIGTERM prošly.
- Čtyři nové unit případy doplňují původních6: atomický checkpoint bez hesla, symlink, řízený signál a obnova signal mask. Celkem10 bezpečnostních a174 hostitelských testů prošlo; bezpečnostní sada také pod Python -O.
- RX01 je doložená neopravená chyba, nikoli úspěšná akceptace. Aktivace je blokovaná podle48 i nadále obecně31/45.
- SIGKILL, ztráta napájení, dvojí přerušení během úklidu, timeout samotného Docker create a automatická obnova z checkpointu nejsou touto zkouškou prokázané. Checkpoint nedovoluje spustit libovolné mazání; případná další recovery implementace musí zachovat nezávislou kontrolu vlastnictví.
- Živý OAuth/user JWT, skutečný projekt/role, globální role/provider secrets/Storage bajty, vzdálený cíl/klíč/obnova/plánovač, browser a samostatný souhlas s aktivací zůstávají otevřené.18+26 pending scénářů parseru/checkeru nejsou spuštěné. Skutečná crew SQLite/historie zůstala netknutá.
