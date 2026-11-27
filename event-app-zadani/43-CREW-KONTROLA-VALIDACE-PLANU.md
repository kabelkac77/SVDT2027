# Crew — samostatná validace přesného plánu

## Rozsah 2026-11-27

První malá část kontrolního protokolu39, nikoli jeho celé dokončení. Starý běh issue54 skončil timeoutem; tento úkol implementuje pouze čisté načtení a strukturální validaci plánu. Neobsahuje porovnání cíle před/po, receipt, zdrojových balíčků ani aktivaci.26 pending testů celého checkeru zůstává pending.

## Zadání pro nativní návrh

Vytvoř jen `event-app/tools/crew_import_verify_plan.py` se stdlib a importem `from crew_import_preview import build_preview`. Host nastaví tools na sys.path. Jediná veřejná funkce `parse_import_plan(tables_bytes, plan_text)` vrací dvojici `(plan, preview)`. Preview získá přes existující build_preview nad přesnými zdrojovými bytes. Helper nic neserializuje zpět, nepřepočítává cílový otisk, negeneruje ID, nečte soubory, nepoužívá síť/DB/CLI/logging a argumenty nemění. Žádné importy nového kódu na cíli ani nové závislosti. Všechny neplatné vstupy odmítni jako `ValueError('CREW_IMPORT_VERIFY_FAILED') from None`; nezveřejňuj původní výjimku, hodnoty ani osobní údaje. Neočekávané provozní chyby OS nejsou součástí veřejného rozhraní čistého parseru.

`plan_text` musí být str, validně zakódovatelný do UTF8, maximálně16MiB. JSON bez duplicitních klíčů na kterékoli úrovni, NaN nebo Infinity; booleany nejsou celá čísla, float/exponent zápis verzí se odmítá. Odmítni osamocené Unicode surrogate i vzniklé JSON escapem. Validní párové surrogate/Unicode lze přijmout. Bez normalizace, strip, domýšlení chybějících polí nebo řazení vstupních polí.

Přesná horní pole:

```
version, editionId, sourceSha256, targetFingerprint, categories, entries
```

version je strict int1. editionId je canonical lowercase nonnil UUID (8-4-4-4-12 hex; nepředepisuj konkrétní UUID version). Oba hashe jsou přesně64 lowercase hex; sourceSha256 odpovídá preview.sourceSha256. targetFingerprint se pouze validuje, neověřuje vůči serveru.

categories/entries jsou list, každý do10000 položek. Kategorie má přesně pole `sourceCategoryId,targetCategoryId,action,expectedVersion`. Zdrojové ID je neprázdný string do100 znaků, cílové canonical nonnil UUID. action je create/keep; expectedVersion strict int0..2147483647, create právě0, keep>0.

Řádek má přesně pole `sourceRowId,targetRosterId,action,expectedVersion,compensationAction,expectedCompensationVersion,kind,personId,linkedUserId`. Zdrojové ID neprázdný string do200 znaků, cílové UUID. compensationAction/expectedCompensationVersion mají stejná pravidla create/keep a verzí. kind jen person/group/unresolved. Create roster: kind pouze group/unresolved, obě identity NULL, compensationAction:create. Keep roster: personId UUID právě pro kind person, jinak NULL; linkedUserId NULL nebo UUID. Žádné implicitní nové osoby/účty nebo odvozování identity.

Kategorie a řádky musí pokrývat přesně všechny sourceCategoryId/sourceRowId z preview, každý právě jednou. Cílové ID nesmí být opakované uvnitř kategorií, resp. rosterů (napříč oběma typy UUID kolize nevadí). Pořadí operací není pro tento parser významové, vrať je zachované. Povolen je prázdný list pouze pokud je prázdná odpovídající zdrojová sada; nejsou povolené vynechané řádky, neznámé ID nebo přebytečná pole.

Drž návrh malý, přehledný a ohraničený jen tímto parserem. Návrh completed, questions=[], případné budoucí kroky pouze v summary.

## Nezávislá akceptace hostem

Syntetické testy: kompatibilita s builderem38 pro create/keep, zachování identity a NULL/0 preview, bez mutací; duplicate keys nahoře/vnořené, shape/type/UTF8/size, strict verze včetně exponentů, UUID/hash/newline, pokrytí/duplicity, pravidla identity a odměn, neunikající chyby. Žádný reálný zdroj, DB, import nebo změna oprávnění. Úspěšné načtení neprokazuje autoritu plánu, schválení operátorem nebo správnost výsledku importu.

Další samostatná část: ověřit receipt a before/after podle39, propojit s existujícími26 pending scénáři a syntetickým DB importerem. Vždy zůstanou ruční brány31 a zákaz skutečného importu.

## Skutečný stav tohoto kroku

Native issue57: dry-run úspěšný,6273 bytes kontextu; běh zastavený před modelem kvůli chybějícímu přihlášení. `crew_import_verify_plan.py` není implementovaný.18 nezávislých scénářů v `event-app/tests/pending/crew_import_verify_plan_test.py.pending` má ověřenou pouze syntaxi. Přesun do `event-app/tests/crew_import_verify_plan_test.py` a spuštění až s modulem; importy předpokládají tuto budoucí cestu v tests/. Nezapočítávat mezi164 skutečně prošlých hostitelských kontrol.
