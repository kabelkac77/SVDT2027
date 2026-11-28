# Souběžná recovery a chyby po provedeném kroku

Rozsah 2026-11-28 navazuje na [51](51-POSTGRES-POSKOZENA-EVIDENCE-A-CHYBY-ZAPISU.md). Jen hostitelské testy nových vlastních syntetických serverů. Runtime aplikace/kolektor, sedm původních migrací a18+26 pending scénářů beze změny. [48/issue61](48-CREW-EXPIRACE-PO-ZAMKU.md) stále blokuje aktivaci. Výsledky viz [evidence](postgres-recovery-lock-verification.json).

## Jediný držitel operace

Běžící test drží od přípravy po závěrečné reportování výhradní neblokující POSIX flock nad soukromým operation.lock v dané vlastní testovací složce. Explicitní recovery musí získat tentýž zámek před živou inspekcí, checkpoint změnou nebo úklidem. Poté znovu načte checkpoint; stav přečtený před získáním zámku nestačí.

Druhý proces při obsazení vrací exit1 a bezpečný stdout RECOVERY_BUSY, successful:false, reportPersisted:false a nepotvrzuje odstranění prostředků. Není to žádost o další oprávnění ani důvod mazat zámek. Checkpoint/přístupy ani Docker prostředky nemění. Žádný automatický backoff/retry, PID ze souboru nebo odhad zastaralosti.

Soubor zámku musí být obyčejný, vlastněný, soukromý, bez symlinku či dalšího hardlinku; po získání musí souhlasit jeho inode s otevřeným FD. Descriptor má CLOEXEC a nepředává se potomkům. Zámkový soubor se nikdy nemaže, aby nevznikly dvě nezávislé sady držitelů. Zavření FD i ukončení procesu uvolní kernelový zámek; přetrvávající prázdný soubor sám neznamená běžící operaci.

Constructor při chybě lease uvolní. Normální běh ji uvolní ve finally i při neodchycené chybě výstupu. Při startovací chybě předá práci recovery po uvolnění vlastní lease; recovery znovu provede všechny vstupní a živé kontroly, případný jiný držitel má přednost. Neexistuje CLI volba obejít zámek nebo převzít lease podle PID.

## Skutečný souběh dvou recovery procesů

Opt-in `--verify-concurrent-recovery` vytvořil vlastní child test a ověřil:

1. Po ready checkpointu běží vlastník. Nový recovery proces dostal RECOVERY_BUSY/exit1, bytes checkpointu zůstaly stejné a vlastník dál běžel.
2. Rodič poslal SIGKILL pouze vlastnímu Popen child procesu. Žádný PID ze souboru. Kernel uvolnil jeho lease.
3. Nový první recovery proces získal zámek a držel jej na řízené soukromé bráně s limitem15 sekund. Druhý skutečný recovery proces byl odmítnut jako busy bez změny checkpointu a bez cleanup.
4. Po uvolnění brány první recovery nezávisle ověřila živou identitu/image/label/mounts a uklidila vlastní kontejner/data/přístupy.
5. Dva další nové procesy potvrdily idempotentní již nepřítomný stav. Rodič nezávisle ověřil cleaned checkpoint, absenci přesných kontejnerů/volumes a známých přístupů.

Řízená brána je pouze opt-in `--probe-recovery-contention CHECKPOINT`, ne čekání provozního UI. Otevírá se jen známým soukromým markerem rodiče, nic z něj se neprovádí jako příkaz. Při nedokončené zkoušce se ukončují pouze vlastní známé Popen procesy a checkpoint zůstává pro bezpečné posouzení; žádný globální prune.

## Tři doplněné pozdní chyby

`--verify-evidence-failures` nyní ověřil šest bodů: původní tři z51 plus následující tři. Všechny selhané child běhy vracejí exit1 a casesRun0; kontrolní rodič je počítá jako řízené chyby, nikoli DB importy.

| Bod | Zachovaný stav a následující recovery |
| --- | --- |
| after-remove | Docker rm vlastního kontejneru/volumes proběhl, ale před ověřením výsledku nastala chyba. Zůstal cleaning checkpoint a přístupy; child úklid nepotvrzuje. Nová recovery potvrdila absenci přesného kontejneru i všech zaznamenaných volumes a dokončila pouze místní kroky. Žádné druhé rm podle JSON. |
| after-checkpoint | Úklid/přístupy dokončené a cleaned checkpoint atomicky zveřejněný; následná chyba nezpůsobí návrat starého checkpointu. Child vrátí neúspěch. Nová recovery přečte nový úplný stav a znovu nezávisle potvrdí absenci. |
| after-report | Úplný report existuje, ale po jeho zveřejnění nastane chyba. Stdout má successful:false, reportPersisted:true, REPORT_FINALIZATION_FAILED a manualReviewRequired:true; původní bytes se nepřepisují. Nová recovery může samostatně potvrdit už provedený úklid. |

Po všech šesti bodech prošla nová i opakovaná recovery a nezávislá závěrečná kontrola. Žádné skutečné disk full nebo přerušení napájení se tím nesimuluje.

Chyba odstranění dočasného jména po úspěšném linku souboru se klasifikuje PublicationError. Úplný soubor se zachová a u reportu je potvrzená publikace oddělená od neúspěšné finalizace. Může zůstat soukromý dočasný hardlink, který se automaticky nehledá ani nemaže podle odhadu. Unit zkouška tento stav prokázala pouze v izolované dočasné fixture; v kontrolovaných Docker bězích známé přístupy ani takové dočasné soubory nezůstaly.

**Uložený report je dřívější snapshot.** Při pozdní chybě může obsahovat successful:true z okamžiku publikace, zatímco závěrečný stdout/exit správně hlásí neúspěch. Dřívější evidence se nepřepisuje, aby se tento rozdíl neztratil. Dokončení procesu se proto nikdy neodvozuje jen z existence nebo obsahu souboru; potřebuje finální odpověď a návratový kód. Při ztrátě odpovědi se provede nové nezávislé ověření, nikoli opakování destructive kroku.

## Ověření a příkazy

Dvanáct nových unit případů bez Dockeru ověřuje vzájemné vyloučení/stejný inode, uvolnění po výjimce, nebezpečné lock soubory, busy bez Dockeru/mutace, nové čtení po získání lease, zachování souboru po neúspěšném unlinku, pozdní report se samostatnými fakty, uvolnění lease při constructor/output chybě, cleaning po odstranění a již zveřejněný cleaned checkpoint, bezpečný busy CLI výsledek. Celkem215 hostitelských a51 bezpečnostních pod Python -O prošlo.

Prošlo také10 standardních skutečných PG případů,4 startup chyby,6 řízených I/O chyb, souběžná recovery a řízený SIGTERM/SIGKILL. Samostatný striktní RX01 znovu selhal (0 prošlých z1); nový syntetický zápis po expiraci při ShareRowExclusiveLock. Není expectedFailure a nepočítá se do úspěchů.

Stejné explicitní lokální argumenty/soukromý root jako46–51. Nové režimy jsou vzájemně výlučné s ostatními:

```text
--verify-concurrent-recovery
--probe-recovery-contention CHECKPOINT
--probe-evidence-failure after-remove|after-checkpoint|after-report
```

## Otevřené věci a další pořadí

- Jde o spolupracující procesy na témže podporovaném POSIX hostu, ne distribuovaný zámek nebo ochranu proti libovolným zásahům stejného uživatele do soukromého adresáře. Síťový filesystem, změny inode/adresáře za běhu a nepodporovaný flock nejsou živě ověřené.
- Dále bez přístupů: SIGKILL přímo držitele recovery během jednotlivých kroků a navazující nový proces; metadata-only inventář zbylých soukromých dočasných souborů bez čtení obsahu, bez automatického mazání. Nezaměňovat persistentní operation.lock za stale PID zámek.
- Fyzický disk full/power loss, fsync adresáře a úplná vzdálená obnova zůstávají na dohodnuté prostředí a ruční brány31/45. Ztracené závěrečné odpovědi a nejasné/orphan prostředky bezpečně posoudit, žádný slepý retry/prune.
- Native48/61 →43 →39 →44;18+26 pending neprovedeno. Přihlášení/model/usage nezkoušeno. Živé účty/OAuth/Storage/provider/backup klíč/browser/aktivace zůstávají na později bez dotazů. Žádný skutečný import/DDL/grant/deploy/merge ani aktivace záloh.
