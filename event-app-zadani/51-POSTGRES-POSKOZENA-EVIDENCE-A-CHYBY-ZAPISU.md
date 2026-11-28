# Poškozené checkpointy a selhání zápisu evidence

Rozsah 2026-11-28 navazuje na [50](50-POSTGRES-STARTUP-A-NEUPLNE-CHECKPOINTY.md). Výhradně hostitelská infrastruktura izolovaných syntetických testů. Runtime aplikace, kolektor, původních sedm migrací a18+26 pending scénářů se nemění. [48/issue61](48-CREW-EXPIRACE-PO-ZAMKU.md) dál blokuje aktivaci. Výsledky viz [evidence](postgres-evidence-io-verification.json).

## Checkpoint se před přepsáním musí znovu ověřit

Běžný cleanup dříve mohl přepsat poškozený checkpoint fází cleaning. Nyní každá aktualizace vyžaduje existující soukromý validní checkpoint, správný token/název/image a souhlas již zaznamenaných ID/volumes s vlastním serverem. Pouze první prepared smí vytvořit nový soubor. Chybějící checkpoint při pozdějším kroku se automaticky nerekonstruuje z paměti.

Prázdný, zkrácený, neplatný UTF-8/JSON, neplatná struktura, nečíselné konstanty, nadměrné vnoření nebo platná cizí identita zastaví změnu. Původní bytes se nezapisují přes sebe a známé přístupy zůstávají pro pozdější posouzení. Cleanup nevydá Docker příkaz. Explicitní recovery navíc znovu kontroluje stejné bytes po živé inspekci; změna checkpointu během ověřování zabrání zásahu.

To doplňuje dosavadní kontroly symlinků, soukromých práv, velikosti a duplicitních klíčů. Checkpoint není autorizace mazat podle JSON. Nejasné creating+absence, cizí metadata či existující orphan stále znamenají zastavení podle49/50. Poškozený soubor se nezkouší automaticky opravovat nebo nahradit odhadem ID.

## Atomické soubory a oddělený výsledek úklidu/reportu

Jednorázové soubory včetně reportu se zapisují do nového soukromého dočasného souboru v témže adresáři. Až po dokončení zápisu, flush a fsync se celý soubor zveřejní hardlinkem na konečný název; existující soubor ani symlink se nenahrazuje. Dočasný název se uklízí ve finally. Checkpoint nadále používá fsync a atomický replace, nově se vstupní kontrolou původního stavu.

| Chyba | Bezpečné chování |
| --- | --- |
| Vytvoření dočasného checkpointu, zápis/flush/fsync nebo publikace před replace | Předchozí úplný checkpoint zůstává. Selhání přechodu do creating zabrání create; selhání cleaning zabrání Docker cleanup. |
| Částečný zápis reportu/credentials, fsync nebo zveřejnění před dokončením | Konečný název nedostane neúplný soubor. Existující evidence se zachová. |
| Report nelze potvrzeně uložit | `successful:false`, `reportPersisted:false`, `reportFailure:REPORT_WRITE_FAILED`, bezpečná kategorie typu chyby a `manualReviewRequired:true`; stdout metadata a exit1. Žádná náhradní cesta s přístupovými údaji. |
| Úklid už byl ověřen, ale report selhal | Fakta containerRemoved/anonymousVolumesRemoved zůstávají samostatná; celý příkaz přesto neuspěje. Nový recovery proces může potvrdit už nepřítomné prostředky. |
| Chyba přípravy před dokončením constructoru | Bezpečný stdout PREPARATION_FAILED, exit1, nula DB případů, reportPersisted:false a containerCreationAttempted:false. Žádný Docker create před dokončením přípravy není dostupný. |
| Explicitní recovery selže při čtení/zápisu/kontrole | Bezpečný stdout RECOVERY_FAILED a exit1, nepotvrzený úklid se neprohlašuje za hotový. Chyba uložení recovery reportu rovněž nesmí vrátit exit0. |

Reportování nepřebírá raw výjimku/stderr ani její zprávu. Úspěch samotného úklidu neznamená úspěch původní testovací sady. Při úspěšné publikaci je reportPersisted:true uloženo i v souboru. Směrodatná je dokončená odpověď spolu s návratovým kódem: při pozdní chybě po zveřejnění může úplný soubor již existovat, přesto příkaz vrátí neúspěch. Samotná existence reportu není důkaz dokončeného procesu.

## Tři skutečné řízené I/O zkoušky

Opt-in `--verify-evidence-failures` zakládá vlastní child procesy a nové testovací kontejnery, nikdy nepřijímá existující DB URL ani provozní přístupy. Výjimky se vyvolávají na přesných bodech; nejde o skutečné vyčerpání disku nebo změnu práv systému.

| Bod | Výsledek child procesu a následné ověření |
| --- | --- |
| checkpoint-created | Po vytvoření kontejneru selže publikace created. Původní creating zůstává; startup recovery nezávisle ověří živou identitu/mounts a uklidí vlastní prostředky. Child exit1, STARTUP_FAILED a nula DB případů. |
| checkpoint-cleaning | Server dosáhne ready, ale přechod cleaning selže před replace. Child exit1, manualReviewRequired, zachovaný ready checkpoint i password, kontejner není prohlášen za odstraněný. Nový proces bez fault režimu provede plně ověřenou recovery. |
| report | Vlastní server i volumes/přístupy se uklidí, publikace výsledného reportu selže. Child exit1, reportPersisted:false a report.json chybí; stdout zachová potvrzená fakta úklidu. Nová recovery potvrdí absenci. |

Ve všech třech případech další nový proces zopakoval recovery, bezpečně rozpoznal absenci a uložil nový vlastní receipt. Rodič nezávisle potvrdil absenci přesných kontejnerů/volumes a známých přístupů. Testy se kvůli injekci vědomě nespouštějí (casesRun0); rodič hlásí3 ověřené řízené chyby, nikoli3 úspěšné DB importy.

Stejné explicitní lokální argumenty/soukromý root jako46/50, režimy jsou vzájemně výlučné:

```text
--verify-evidence-failures
--probe-evidence-failure checkpoint-created|checkpoint-cleaning|report
```

## Unit důkazy a regrese

Třináct nových testů bez Dockeru pokrývá poškozené/cizí/chybějící checkpointy bez přepsání a bez Docker příkazů, změnu během inspekce, chyby vytvoření/zápisu/fsync checkpointu, částečný zápis/fsync/link soukromých souborů, zachování existujícího reportu/symlink cíle, selhání reportu po jinak úspěšné sadě i recovery, bezpečný constructor a recovery CLI. Tyto případy používají lokální syntetické soubory a řízené mocks; neprokazují pád fyzického disku.

Celkem203 hostitelských a39 bezpečnostních pod Python -O prošlo. Znovu prošlo10 standardních skutečných PG případů, čtyři startup chyby s opakováním recovery a řízený SIGTERM/SIGKILL s recovery. Samostatný striktní RX01 znovu selhal (0 prošlých z1); nové syntetické řádky vznikly po expiraci při čekání na ShareRowExclusiveLock. Je evidovaný jako chyba, bez expectedFailure nebo změny očekávání.

## Otevřené věci

- Skutečný disk full, ztráta napájení, fsync adresáře/odolnost link či replace proti power loss, selhání odstranění dočasného jména po publikaci, nedostupný stdout a současné procesy recovery nejsou touto sadou univerzálně vyřešené. Žádné tvrzení o úplné odolnosti filesystemu. Nejasné prostředky a neuložené zprávy patří k pozdějšímu bezpečnému posouzení, ne k globálnímu prune.
- Dále bez přístupů: koordinace dvou recovery procesů nad stejným checkpointem a cílené chyby po zveřejnění souboru/odstranění kontejneru; ověřit rozlišení již provedeného zásahu od neuložené závěrečné evidence. Rozšíření skutečných výpadků hostitele až v dohodnutém prostředí.
- Native implementace:48/61 → parser43 → checker39 → UI44. Přihlášení, model ani usage se zde nezkoušely;18+26 pending scénářů se nespouštělo.
- Přístupy a schválení31/45 zůstávají na později: živé účty/OAuth/scopes, Storage/provider secrets, úplné vzdálené zálohy/klíč/obnova/plánovač, browser a samostatná aktivace. Žádný skutečný import, provozní DDL/grant/deploy/merge ani aktivace záloh.
