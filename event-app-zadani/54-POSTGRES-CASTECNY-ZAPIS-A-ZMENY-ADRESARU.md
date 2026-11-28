# Přerušení zápisu a změny adresářů během inventáře

2026-11-28. Codex tuto změnu programuje přímo podle výslovného pokynu „Programuj teď ty a ne Claude.“ Aktuální postup je v22 a AGENTS; Claude/auth/model/usage se nepoužívá a jeho přihlášení už neblokuje implementaci. Rozsah tohoto bloku zůstává hostitelská syntetická infrastruktura. Runtime aplikace/kolektor a7 původních migrací beze změny. [48/issue61](48-CREW-EXPIRACE-PO-ZAMKU.md) je stále neopravená; její přímá oprava Codexem je nejbližší další implementace před43/39/44.

## Čtyři skutečné SIGKILL zapisujícího procesu

Opt-in `--verify-partial-writes` nepotřebuje Docker/PG/Node ani nevytváří kontejner/databázi. Každý child má novou soukromou syntetickou složku, platný prepared checkpoint bez container ID/volumes a vlastní lease. Zapisuje pouze syntetický checkpoint/report, žádné skutečné přístupy. Rodič ukončuje jen známý vlastní Popen proces, nikdy PID ze souboru.

| Bod | Co je při SIGKILL rozpracované | Zachovaný výsledek |
| --- | --- | --- |
| checkpoint-partial | Jen počátečních11 bytes v .checkpoint dočasném souboru, po flush před dokončením zápisu | Původní checkpoint má stejné bytes/hash, nepublikovaný soubor zůstává soukromý. |
| checkpoint-before-publish | Celý dočasný checkpoint po fsync před replace | Původní prepared zůstává, creating není zveřejněné. |
| report-partial | První polovina syntetického reportu po flush | report.json neexistuje; zůstává jen soukromý .private soubor. |
| report-before-publish | Celý syntetický report po fsync před linkem | report.json stále neexistuje; úplná ale nepublikovaná příprava není konečný report. |

Ve všech čtyřech případech rodič před pádem ověřil obsazenou lease, po pádu exit-9 bez finální stdout a nové získání zámku. Původní checkpoint se porovnal s hashem před zahájením zápisu. Dočasné soubory se kontrolovaly pouze podle metadat (typ/velikost/práva), jejich obsah se nečetl ani nehashoval. Po pádu se automaticky nesmazaly: zůstávají2 .checkpoint a2 .private soubory v soukromém rootu jako syntetické důkazy k pozdějšímu posouzení. Není to provozní credential leak ani oprávnění k úklidu podle názvu.

Pauza je výhradně explicitní testovací režim s limitem15 sekund. Normální zápis se nezastavuje, stále používá soukromý dočasný soubor/flush/fsync a atomickou publikaci. SIGKILL nepovoluje vykonání finally; právě proto jsou zbytky očekávané. Child není úspěšná testovací sada jen proto, že existuje soubor nebo uvolněný zámek.

## Inventář při změně adresáře

Inventář53 nově porovnává mode/owner/inode/device a mtime/ctime otevřeného adresáře před a po průchodu. Změna znamená DIRECTORY_CHANGED a complete:false/successful:false. Po zpracování podadresáře znovu ověří, že jméno pod původním rodičovským FD stále označuje tentýž soukromý inode. Pokud zmizelo nebo bylo nahrazeno, vyřadí z výsledku nálezy daného podstromu a označí ENTRY_UNVERIFIED. Jde jen o změnu výstupních dat v paměti, nikdy mazání souborů.

Po průchodu se kontroluje i původní root jméno bez následování symlinku. Pokud už neoznačuje otevřený soukromý root inode, vrátí ROOT_CHANGED a odstraní zavádějící relativní nálezy ze zprávy. Otevřený FD může bezpečně označovat původní přejmenovaný adresář; výsledek ho přesto nesmí prezentovat jako obsah náhradní složky.

Šest nových regresních případů používá skutečné rename/mkdir/symlink změny výhradně v dočasných syntetických fixture, načasované testovacím wrapperem před open nebo během scandir. Pokrývají zmizení, náhradu symlinkem, nový jiný inode před open, přejmenování již otevřeného child adresáře, výměnu rootu a vytvoření nové položky při průchodu. Všechny vrací explicitní neúplnost a neprocházejí náhradní podstrom. Výsledky nejsou atomický snapshot ani obrana proti libovolným zásahům stejného uživatele mezi jednotlivými kontrolami. Inventář dál nečte obsah souborů, nezískává lease, nekontaktuje Docker a nic na základě nálezů nemaže.

## Ověření a další pořadí

Osm nových unit případů (šest závodů adresářů, explicitní/bounded write pause a CLI bez Docker nástrojů) prošlo. Celkem234 hostitelských a70 bezpečnostních pod Python -O. Skutečné čtyři zápisové SIGKILL,10 standardních PG scénářů a5 přerušení recovery s fresh/repeated převzetím prošly. Starší4 startup/6 I/O/souběh/SIGTERM/SIGKILL mají baseline z53; tento blok je znovu nepočítá jako nově spuštěné.

Striktní RX01 se znovu spustil a selhal0/1; nový syntetický zápis po expiraci při ShareRowExclusiveLock. Není expectedFailure ani započítaný jako úspěch. [Evidence](postgres-partial-write-verification.json) odděluje tuto chybu, aktuální zkoušky, starší baseline a soukromé zachované zbytky.18+26 parser/checker scénářů je dál pending a nespouštělo se.

```text
python3 -B event-app/tests/postgres-acceptance.manual.py --run-synthetic \
  --verify-partial-writes --output-root PRIVATE_TEST_ROOT

--probe-partial-write checkpoint-partial|checkpoint-before-publish|report-partial|report-before-publish
```

Tyto filesystem režimy nepotřebují přístupy ani spuštěný Docker. Žádný skutečný import/DDL/grant/deploy/merge nebo aktivace záloh. Fyzický power loss/disk full, skutečný výpadek filesystemu, síťové úložiště a úplná vzdálená obnova nejsou dokázané SIGKILL testem. Nejasné/orphan zbytky a živé účty/Storage/provider/backup klíč/browser/aktivace zůstávají na pozdější31/45 bez dotazů nyní. Přihlášení Claude je volitelné a není podmínkou přímé opravy48/61 Codexem.
