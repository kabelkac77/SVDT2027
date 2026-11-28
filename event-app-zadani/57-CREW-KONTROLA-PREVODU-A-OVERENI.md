# Crew — kontrola převodu a ověření

2026-11-28, implementace přímo Codexem dle22/AGENTS a výslovného pokynu uživatele. Rozsah39 s opětovným využitím parseru43/56. Base6a528443d5f421c6ce13b40ff8a28154211424d2, větev codex/crew-import-verification. [Strojová evidence](crew-verify-import-verification.json).

## Implementovaný helper

`verify_import(tables_bytes, plan_text, before=None, after=None, receipt=None, stored_source_text=None)` je čistá funkce bez I/O, SQL, CLI, logů, nových ID nebo mutací. Validuje všechny dodané podklady i při chybějícím jiném vstupu. Rozlišuje chybějící vstup, neplatný vstup a platnou odlišnost. Neplatné vstupy mají pouze `ValueError('CREW_IMPORT_VERIFY_FAILED') from None`, bez hodnot zdroje. Používá stávající parser43, builder38 a reconcile35; cílový fingerprint pochází ze serveru, nikdy se nepřepočítává v Pythonu.

Z přesných původních bytes počítá source/plan SHA, ověřuje receipt counts/edition/hashes, rekonstrukci schváleného plánu proti before, zdrojový readback a after hodnoty kategorií/rosteru/odměn včetně explicitní identity, verzí a NULL/0. Nové/nezměněné sady řádků i stará metadata se porovnávají jako strict JSON typy, nikoli Python bool==int. Kontroluje právě jeden nový zdrojový balíček, přesný packageId z receipt, všechny historické vazby a zachování starých balíčků/linků. Neznámá původní metadata se neignorují. Výstup deterministicky slučuje scope/ID a řadí názvy polí; nevydává jména/kontakty/částky/rawsource/plán nebo celé řádky.

`comparisonMatches:true` je pouze úplná shoda dodaných artefaktů. Vždy authorityVerified/applyReady/cutoverReady:false a trvalé brány LIVE_AUTHORITY_REVIEW_REQUIRED, MANUAL_CUTOVER_APPROVAL_REQUIRED, VERIFIED_BACKUP_AND_RESTORE_REQUIRED. Report kvůli ID stále patří mezi soukromé0600 artefakty, za jejich bezpečný zápis odpovídá budoucí operátorský obal.

## Skutečně provedené kontroly

- 26 původních nezávislých scénářů přesunuto byte-for-byte z pending do tests/ a prošlo; SHA256f6617a2a7983f12d395626b1ebdf81ec7a161f982dc1db48c2399d0b6e2c8685.
- 9 nových hraničních scénářů: chybějící všechny vstupy, malformed/cyklický/deep JSON/Unicode/goals, exact typy neznámých keep metadat, nesouvisející data, staré linky/navíc balíček, pořadí klíčů/exportních řádků, before fingerprint/version drift, explicitní NULL historie.
- Celkem294 hostitelských kontrol prošlo.35 checkerových+25 parserových kontrol, všech60 prošlo také pod Python -O.
- Rozšířený PGlite test: skutečný SQL import vytvořil serverový receipt, snapshot s úplnými link metadata a byte-for-byte readback uloženého balíčku. Kontrola potvrdila shodu, zachytila NULL→0, změnu historie i přidaný newline a odmítla neúplný standardní snapshot. Po kontrolách počty dat beze změny; žádné osoby/účty nevytvořeny.
- Celá aplikační/DB sada281, typecheck a build prošly. Žádný UI/browser zásah, samostatný PostgreSQL/RX01 z55 je baseline, nikoli nový běh v tomto bloku.
- Všech8 SQL migrací SHA beze změny. CI path filtry rozšířené o nový helper a obě aktivní testovací sady. Claude auth/model/usage nepoužité.

```sh
python3 -B -m unittest discover -s event-app/tests -p '*_test.py' -v
python3 -B -O -m unittest discover -s event-app/tests -p 'crew_import_verify*_test.py' -v
cd event-app
npm run typecheck
npm test
npm run build
```

## Nově doložená mez a další práce

Běžný `crew_import_target_preview` předává sourceLinks bez source_history_id. Tím nesplňuje úplný vstup39 po importu; helper správně vyžaduje explicitní pole i v případě NULL. Test ho nejprve nechá odmítnout. Potom jedním SQL statementem přečte skutečná metadata linků ze stejného snapshotu, nikoli ze zdroje/plánu. Cílový fingerprint zůstává přesně serverový. Jde o zkušební privátní read export v syntetické DB, nikoli nový veřejný RPC, grant, změnu schématu nebo hotový provozní kolektor.

1. Samostatně připravit úplný soukromý operátorský exportér/readback se snapshot konzistencí a0600 výstupy, bez odvozování source_history_id nebo přepočtu serverového otisku. Před jeho použitím na živém cíli všechny31/45 brány.
2.44 inline historie,12 browser scénářů a následná společná uživatelská kontrola.
3. Později review Draft změn, skutečné účty/scopes/OAuth/Storage/provider, potvrzený projekt/aplikovaná8. migrace, úplná vzdálená záloha/klíč/obnova/browser a výslovný souhlas s importem. Čtyři soukromé syntetické temporaries54 zachované bez automatického mazání/čtení obsahu.

Žádný skutečný personál/SQLite, provozní import/DDL/grant/deploy/merge nebo aktivace. Syntetický JWT/DB výsledek neprokazuje skutečnou identitu, oprávnění nebo serverovou autoritu dodaných souborů. Přístupy a potvrzení evidované na později bez dotazů uživateli.


## Navazující implementace58 — 2026-11-28

Úplný operátorský exportér je nyní implementovaný a synteticky ověřený v58. Čte source_history_id a uložený plán/receipt/source přímo ze stejného databázového snapshotu a ponechává serverový fingerprint. Původní poznámka o chybějícím exportéru výše popisuje stav57. Standardní RPC zůstává beze změny a sám není úplným vstupem. Skutečné provozní přístupy, autorita a aktivace se tím nepovažují za vyřešené;31/45 nadále otevřené.
