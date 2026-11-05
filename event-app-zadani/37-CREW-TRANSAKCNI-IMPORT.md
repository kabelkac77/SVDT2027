# Crew — transakční počáteční import V1

Autorizovaná implementace2026-11-05: uživatel chce pokračovat na importeru, skutečný import výslovně nespouštět. Tento dokument popisuje kód a syntetické testy. Žádná živá migrace, schválení plánu, import nebo grant se tím neprovádí. Přístupy/mapování/aktivace jsou na později v31. Navazuje35/36 a novou additive migrací nemění starší schéma.

## Rozsah první verze

Převádí celý pracovní ročník2027, všechny kategorie a samostatné odměny, zachová přesný původní source_text/hash v privátním balíčku35 a source vazby. Žádné slučování podle jména/kontaktu nebo automatické hledání účtů. Kategorie a roster mají jen akce create/keep; odměny create/keep. keep musí přesně odpovídat zdroji a schváleným identitám/verzím; existující provozní/finanční údaje se nepřepisují. Nesoulad znamená odmítnutí a nový náhled. Aktualizační synchronizace/overwrite není rozsahV1 a zůstává další vývoj podle skutečné potřeby.

U nového rosteru je kind výslovně group nebo unresolved, person_id/linked_user_id zůstávajíNULL. Nový Person/Auth ani členství/role se netvoří. keep zachová přesně existující kind/person_id/linked_user_id z odsouhlaseného snapshotu; tyto vazby se nemění. Počty/termíny potřebné obsazenosti se u existujících kategorií ponechají, u nových jsouNULL/''. Původní pořadí/sloupce/statusNote/contactOriginal/extra/historie/audit/requests zůstávají v balíčku35, ne v běžných notes.

## Plán, otisky a schválení

Plán je přesný UTF8 JSONtext, SHA256 nad těmito bajty, bez vymýšlení cílových UUID. Obsahuje version1,editionId,sourceSha256,targetFingerprint,categories a entries. Konkrétní tvar38. source_text se předává zvlášť a musí přesně odpovídat sourceSha256. Backend z něj odvodí hodnoty s vlastní validací; nepřebírá kontakty/částky z nedůvěryhodného plánu. Plan musí pokrýt každou zdrojovou kategorii a pracovní řádek právě jednou; žádné částečné vynechání. Limit source128MiB, plan16MiB, max10000kategorií/řádků. Neznámé sloupce/tabulky se uchovají v source_text, nic se tiše nezkracuje.

Serverový targetFingerprint je SHA256 z textové JSONB reprezentace existujícího kompletního snapshotu35 bez capturedAt. Neodvozuje se Python serializací a čas každého čtení jej nezmění. Nové chráněné čtecí RPC vrátí snapshot s tímto otiskem. Před zápisem se otisk znovu počítá na serveru; jakákoli změna kategorie/rosteru/odměn/provenance v ročníku plán zneplatní.

Schválení je privátní neměnný záznam vázaný na ročník, skutečného správce, plan/source/target hash, čas a externí SHA reference protokolu zálohy/obnovy. Výchozí platnost1h, max24h. Je to evidence operátorem zkontrolovaného podkladu, nikoli automatické ověření úspěšné obnovy. Funkce pro vytvoření a odvolání schválení není povolená public/anon/authenticated klientům; připravuje se pro pozdější výslovně řízený operátorský krok. Žádné UI/CLI ji nyní nevolá. Infrastrukturní správce může serverová pravidla měnit, nelze jej považovat za neověřitelného útočníka. Konkrétní provozní identita operátora a postup schválení se před aktivací ověří podle31.

Samostatný neměnný záznam může schválení odvolat. Import pak odmítne nový zápis i replay pod odvolaným schválením. Samotné uplynutí platnosti brání novému zápisu; již úspěšný identický request může při stále platném oprávnění vrátit uložený výsledek bez dalších změn. Totéž schválení nelze úspěšně použít pod druhým requestID.

## Transakce a souběh

Import RPC vyžaduje aktuálního správce nearchivovaného ročníku2027. Nejdřív zamkne edition FOR UPDATE a znovu ověří roli; stejný pořádek jako běžné zápisy zabrání souběhu v ročníku. Potom během krátkého počátečního převodu získá SHARE ROW EXCLUSIVE zámek pěti crew/provenance tabulek. Tím stabilizuje celý cílový otisk i proti přímému privilegovanému zápisu. Tento globální tabulkový zámek dočasně pozdrží editace crew i jiných ročníků; skutečný převod musí mít domluvené okno. Nejde o běžný každodenní synchronizátor.

Aktér+ročník+requestID má samostatnou idempotentní evidenci. Fingerprint zahrnuje approvalID a přesné plan/sourceSHA. Před vrácením cache se znovu ověřuje aktuální role, archiv a odvolání. Jiný obsah téhož requestu je konflikt. Před novým zápisem se ověří platnost schválení, targetFingerprint a verze všech keep řádků; create musí mít dosud volné UUID a verzi0. Tentýž sourcehash se nesmí importovat podruhé; identický úspěšný request se řeší pouze cache. Již přítomný jiný zdrojový balíček vyžaduje samostatné posouzení, nikoli automatické doplnění/přepis.

V jediné transakci vzniknou kategorie, roster/odměny, původní balíček, všechny source vazby, audit skutečného autora a výsledek requestu. Jakákoli chyba včetně pozdního selhání triggeru vrátí vše zpět. Po úspěchu není potřeba opravit vazby zvlášť. Výsledek obsahuje pouze UUID/hashe a souhrnné počty, žádné raw osobní údaje. Chyby jsou konstantní kódy CREW_IMPORT_*, bez payloadů nebo SQL detailů.

## Akceptace

Synteticky ověřit celý nový import, keep a smíšený create/keep, samostatné odměnyNULL/0/barter/merch, přesný původní zdroj a úplné vazby, historii a pořadí/sloupce beze změny, idempotentní opakování, reuse requestu s jiným obsahem, znovupoužití schválení, expiraci/revokaci, ztrátu role/archiv/cizí ročník, podvržený actor a přímé mutace schválení/requestů, změněný otisk/verze/UUID kolizi, neplatné/duplicitní JSON klíče a zdrojové vazby, vynechaný zdrojový řádek, žádné účty/Person/granty, pozdní selhání druhého řádku s rollbackem všeho a následný read snapshot+reconciliation. Skutečný víceklientový PostgreSQL souběh a limity hostingu/RPC zůstávají živá akceptace; PGlite je nenahrazuje.

## Implementovaný stav a meze ověření

Nová migrace202611050002 přidává4 privátní tabulky: approvals/revocations/requests a immutable cache source row/history IDs. Cache se plní až po jednorázové validaci úplného source_text ve stejné transakci. Existující capture trigger se v nové migraci rozšiřuje o tuto privátní cestu; původní parser/ověření zůstává fallback pro jiné záchyty. Tím se zdroj neparsuje znovu u každé importní vazby. Přímé klientské čtení/zápis cache ani volání validátorů není povolené. Původních5 souborů migrací je beze změny.

Stage/revoke/apply vyžadují read committed; starý opakovatelný transakční snapshot se odmítne. JSON validace odmítá duplicitní klíče, nesprávné tabulky/šířky/typy, neplatné roky/reference, scalar/blob značky a nekonečná čísla, hloubku nad64. Chybové kódy neobsahují raw payloady. Zdrojové extra buňky zůstávají ve zdrojovém balíčku, nevytvářejí nové aplikační sloupce.

16 DB scénářů skutečně prošlo v PGlite včetně rollbacku druhého řádku, změn otisků/obsahu, revokace/expirace/replay, přímých zákazů, exact keep se zachováním existujícího Person/účtu/verzí/požadavků kategorie a zkoušky460 smyšlených lidí/9 kategorií. Integrační test použil čistý Python builder se skutečným serverovým fingerprintem ze syntetického DB snapshotu.14 samostatných Python scénářů ověřuje generování i blokování plánu. Úplné počty a hashe [evidence](crew-import-verification.json).

Nové RPC není nyní zapojené do UI ani do spouštěcího CLI. Skutečný PostgreSQL ve více připojeních, hostované limity a nejistý síťový výsledek zůstávají akceptace na později; nic v této sadě neslibuje aktivní vzdálené zálohy nebo živé sdílení.
