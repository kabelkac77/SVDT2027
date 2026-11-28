# Přerušení recovery a metadatový inventář zbytků

Rozsah 2026-11-28 navazuje na [52](52-POSTGRES-SOUBEZNA-RECOVERY-A-POZDNI-CHYBY.md). Jen hostitelská infrastruktura nových vlastních syntetických testů. Runtime aplikace/kolektor, sedm původních migrací a18+26 pending scénářů beze změny. [48/issue61](48-CREW-EXPIRACE-PO-ZAMKU.md) nadále blokuje aktivaci. Výsledky viz [evidence](postgres-recovery-interruption-verification.json).

## Pět skutečných přerušení držitele recovery

Opt-in `--verify-recovery-interruption` zakládá pro každý bod nový vlastní testovací kontejner a privátní složku. Po ready checkpointu rodič ukončí pouze vlastní známý Popen test; nový recovery proces získá lease a zastaví se na jednom z konkrétních bodů. Pauza má pevný limit15 sekund a není součástí normálního běhu.

| Bod | Checkpoint při přerušení | Zaznamenané metadata a další postup |
| --- | --- | --- |
| verified | ready | Kontejner ještě existuje a3 známé přístupové soubory zůstávají. Nový proces znovu ověří živou identitu/storage a provede úklid. |
| removed | cleaning | Docker rm proběhl, přístupy zatím zůstávají. Nová recovery potvrdí absenci kontejneru/volumes a dokončí pouze místní kroky. |
| credentials | cleaning | Kontejner/data i známé přístupy odstraněné, cleaned dosud nezveřejněný. Nová recovery ověří absenci a dokončí checkpoint. |
| checkpoint | cleaned | Úplný cleaned checkpoint je uložený, report dosud ne. Nový proces ověří nepřítomnost a vytvoří vlastní nový receipt. |
| report | cleaned | Dřívější report už existuje, ale první proces ještě nevrátil stdout/exit. SIGKILL z něj nedělá úspěšně dokončenou recovery; nový proces ověří skutečný stav nezávisle. |

V každém bodě druhý recovery proces před přerušením dostal RECOVERY_BUSY a nezměnil checkpoint. Rodič potom poslal SIGKILL pouze svému známému Popen recovery procesu. Ověřil exit-9 a absenci finální stdout odpovědi; PID ze souboru se nikdy nepoužívá. Bytes checkpointu na bodu přerušení zůstaly zachované.

Nový proces převzal kernelový zámek, znovu ověřil skutečný stav a úspěšně dokončil recovery. Další nový proces potvrdil idempotentní již nepřítomný stav. Rodič nezávisle ověřil odstranění přesných kontejnerů/volumes a absenci známých přístupů i publikačních dočasných souborů. Všech pět bodů prošlo. Zámky, checkpointy, receipts a diagnostické značky zůstávají jako evidence; nepředstírají neúspěšný původní proces jako úspěšnou testovací sadu.

## Inventář pouze podle metadat

Samostatný `--inventory-residues` potřebuje explicitní `--run-synthetic` a `--output-root` na vlastní soukromý adresář. Nepotřebuje Docker/PG/Node argumenty, nekontaktuje daemon/databázi a nevytváří server. Nevstupuje do operation.lock ani se nepokouší zjistit jeho držitele. Vrací JSON pouze do stdout; žádný report sám neukládá.

Inventář otevírá jen adresáře přes O_RDONLY/O_DIRECTORY/O_NOFOLLOW/CLOEXEC, používá scandir a stat bez následování symlinků. Před vstupem do podadresáře kontroluje vlastnictví, soukromá práva a shodu otevřeného inode/device s předchozím stat. Soubory/FIFO/sockety/symlinky neotevírá, nečte obsah ani cíl symlinku a nic nemaže, nepřejmenovává, nezamyká nebo nevytváří.

Rozsah je omezený na známé testovací skupiny, jejich známé fáze a postgres-synthetic složky pod explicitním rootem. Uvnitř běhu se nerekurzuje do Docker konfigurací/dumpů nebo libovolných dalších adresářů. Neznámé adresáře se započítají jako přeskočené, známé ale neověřené adresáře označí výsledek neúplný. Nejde o inventář celého počítače ani všech podsložek rootu.

Nálezy obsahují pouze relativní cestu, kategorii, typ, velikost, práva, příznak vlastnictví a počet hardlinků. Kategorie rozlišují .private temporaries, .checkpoint temporaries, známé credentials, operation.lock, checkpointy, reports, probe značky a přeskočené odkazy. Netvrdí platnost JSON, obsah souboru, vztah hardlinků, běžící/stale stav, vlastnictví Docker objektu ani bezpečnost smazání. Zámek sám není odpad a existující report není finální úspěch procesu.

Výchozí limity jsou10000 zkoumaných položek,2000 nálezů a hloubka6. Limit či chyba položky vrací explicitní complete:false/successful:false s bezpečnou kategorií bez raw zprávy; nesmí tiše předstírat úplný čistý výsledek. Snapshot nemá společný zámek s probíhajícími operacemi, může zachytit živé změny a nemůže autorizovat následné mazání.

## Skutečný inventář vyhrazených testů

Po dokončení řízených běhů proběhl samostatný CLI inventář dedikovaného testovacího rootu bez Docker/PG argumentů. Prošel v deklarovaném rozsahu:642 položek,193 přeskočených adresářů,186 reports,74 checkpointů,35 zámků a9 diagnostických značek. Žádné nálezy známých credentials nebo .private/.checkpoint temporaries; žádné chyby/limity. Počty jsou okamžitý snapshot testovacích artefaktů, ne provozních dat, a neprokazují nic o přeskočených adresářích.

Podrobný JSON s relativními cestami je pouze soukromý místní výstup mimo Git; veřejná evidence obsahuje jen souhrn. Uložení tohoto výsledku prováděl samostatný hostitelský záznam mimo skenovaný root, nikoli inventarizační funkce. Nic nebylo na základě inventáře smazáno. contentRead/filesDeleted/locksAcquired/dockerContacted jsou false.

## Ověření a opakování

Jedenáct nových unit případů bez Dockeru ověřuje zákaz otevření obsahu/mutací, zachování inode/velikostí/mtime souborů, symlinky/FIFO, neveřejný root, neověřené adresáře, limity a chybové kategorie, inventář při aktivním zámku bez flock, explicitní konečnou pauzu a CLI bez nástrojů/bez raw chyb. Celkem226 hostitelských a62 bezpečnostních pod Python -O prošlo.

Regrese:10 standardních skutečných PG případů,4 startup chyby,6 I/O bodů, souběžná recovery a řízený SIGTERM/SIGKILL prošly. Samostatný striktní RX01 opět selhal0/1: nový syntetický zápis po expiraci při čekání na ShareRowExclusiveLock. Bez expectedFailure a bez započítání jako úspěch; runtime48/61 není opravený.

Pro skutečné zkoušky použít stejné explicitní lokální nástroje/root jako46–52. Režimy jsou vzájemně výlučné:

```text
--verify-recovery-interruption
--probe-recovery-interruption verified|removed|credentials|checkpoint|report CHECKPOINT
```

Samostatný inventář bez připojení:

```text
python3 -B event-app/tests/postgres-acceptance.manual.py --run-synthetic \
  --inventory-residues --output-root PRIVATE_TEST_ROOT
```

## Otevřené věci a další pořadí

- SIGKILL je řízený na dokončených jednotlivých bodech, nikoli uvnitř částečného zápisu/replace/linku. Fyzický disk full/power loss, fsync adresáře, výpadek daemonu uprostřed rm a síťový filesystem zůstávají neověřené. Nejde o univerzální crash recovery provozu.
- Dále bez přístupů: řízené přerušení uprostřed atomického zápisu před zveřejněním a inventář při souběžné změně/zmizení adresáře. Případné soukromé zbytky pouze evidovat bez čtení obsahu a bez automatického mazání.
- Nejasné/orphan prostředky a ztracené finální odpovědi posoudit později podle31/45. Inventář sám neuděluje oprávnění k úklidu; žádné globální prune nebo rekonstrukce identity podle názvu.
- Native48/61 →43 →39 →44,18+26 pending nespouštěno, auth/model/usage nezkoušeno. Živé účty/OAuth/Storage/provider/backup klíč/obnova/browser a samostatná aktivace na později bez dotazů. Žádný skutečný import/DDL/grant/deploy/merge ani aktivace záloh.
