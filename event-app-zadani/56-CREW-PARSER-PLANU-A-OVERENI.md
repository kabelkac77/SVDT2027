# Crew — parser přesného plánu a ověření

2026-11-28, implementace přímo Codexem podle aktuálního pokynu uživatele a22/AGENTS. Rozsah43, oddělená první část39. Base39c1da4527901466f40e95de328e11e312b191fe, větev codex/crew-plan-parser. [Strojová evidence](crew-verify-plan-verification.json).

## Výsledek

Čistá funkce `parse_import_plan(tables_bytes, plan_text)` v `event-app/tools/crew_import_verify_plan.py` vrací původní dekódovaný plán a soukromý preview existujícího build_preview. Žádné soubory, síť, SQL, CLI, logging, nové ID nebo změna vstupů. Nestripuje/neřadí/neserializuje znovu. Kontroluje přesná pole, úplné jednoznačné pokrytí zdroje, canonical UUID/hash, rozsahy verzí a explicitní create/keep identitu včetně odměn. Zdrojový hash je nad původními bytes; cílový fingerprint je pouze syntakticky validovaný.

JSON odmítá duplicitní klíče v libovolné hloubce, float/exponent verze, nefinite čísla, bool místo int, lone surrogates i po escape a přesah16MiB UTF8. Max10000 kategorií i řádků, Unicode délky ID v znacích. Chyby vstupů včetně nadměrné rekurze mají `ValueError('CREW_IMPORT_VERIFY_FAILED') from None`, bez hodnot zdroje. Neočekávané OS chyby se neskrývají jako chyby vstupu. Vestavěné typy vstupů odmítají podtřídy s přepsaným encode/decode.

## Skutečně provedené kontroly

- 18 původních nezávislých scénářů přesunuto beze změny z pending do tests/ (SHA256066a2d9e86864e6097c10b4a6ca2c31a8b1e01c2a9a99b3e14fc68fd4da862ac) a prošlo.
- 7 dalších hranic:100znakové categoryID, platný escaped surrogate pár, lone klíče/hodnoty, duplicate escaped key, přesně16MiB UTF8, prázdný zdroj, přesně10000 operací každého typu, odmítnutí subclass hooků a propagace neočekávané OS chyby.
- Celkem25 parserových kontrol prošlo běžně i při Python -O; žádné runtime assertions jako ochranné podmínky.
- Celá hostitelská regrese:259 prošlých,0 selhání. Pouze syntetické fixtures, lokální testovací HTTP server, žádné skutečné podklady.
- Všech8 SQL migrací porovnáno s evidencí55 a nezměněno. Aplikační klient, DB runtime a kolektory beze změny.281 app/12 skutečných PG/RX01 z55 se v tomto parserovém bloku znovu nespouštěly.
- CI path filtry pro nový helper a obě aktivní testovací sady; běžný CI nepouští model Claude ani Docker.

Příkazy:

```sh
python3 -B -m unittest discover -s event-app/tests -p 'crew_import_verify_plan*_test.py' -v
python3 -B -O -m unittest discover -s event-app/tests -p 'crew_import_verify_plan*_test.py' -v
python3 -B -m unittest discover -s event-app/tests -p '*_test.py' -v
```

## Další backlog a odložené potvrzení

1.39: úplný checker receipt/before/after/provenance s využitím tohoto parseru, aktivovat26 pending scénářů až s implementací a propojit se syntetickým importerem.
2.44: inline historie a následná společná uživatelská kontrola.
3.31/45: později review Draft změn, skutečné účty/scopes/OAuth/Storage/provider, aplikované tělo8. migrace, úplná vzdálená záloha/klíč/obnova, browser a výslovná aktivační volba.

Žádný skutečný import/DDL/grant/deploy/merge, skutečný personál/SQLite nebo přístupy nebyly otevřeny. Autorita cíle, živé oprávnění ani výsledek převodu nejsou parserem prokázané. Preview.applyReady zůstává false, celý checker nadále pending. Claude auth/model/usage nepoužité; žádné dotazy uživateli nebo odvozování souhlasu z mlčení. Čtyři zachované soukromé syntetické temporaries z54 zůstávají bez automatického mazání nebo čtení obsahu.
