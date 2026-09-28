---
name: svdt-implement
description: Implementovat konkrétní funkční změnu organizační aplikace SVDT v event-app včetně navazující dokumentace a ověření.
---

Zadání: $ARGUMENTS

Načti `AGENTS.md`, aktuální stav a model dotčeného modulu v `aplikace-organizace/`. Rozhodnutí zapisuj průběžně do příslušného dokumentu a `DECISIONS.md`, neopisuj celou architekturu do skillu.

Podle dotčené oblasti:
- Partneři: `10-PARTNERI-MODEL-A-FLOW.md`, případně `10-PARTNERI-IMPORT.md`, migrace a `tests/database.test.ts`.
- Finance: `11-FINANCE-MODEL-A-FLOW.md`, `11-FINANCE-PODKLAD.md`, `src/lib/finance.ts`. Převod dema do DB musí doplnit serverové souběžné kontroly, finanční oprávnění a audit; pouhé přepnutí localStorage nestačí.
- Auth: `PRIHLASOVANI.md`; RLS zůstává autoritou. WhatsApp je odložený.
- Provoz: `HOSTING.md`, `SPOLUPRACE-A-ZALOHY.md`; připravený kód není nasazená služba.

Cesty zdrojů/testů jsou relativní k `event-app/`. Navrhni nejmenší dokončitelný celek, zachovej nesouvisející rozpracovanou práci a implementuj ho. Při změně DB přidej migrační soubor a negativní testy oprávnění i souběhu; nepřepisuj aplikovanou migraci. Testuj relevantní chování, nikoli jen shodu s implementací.

Spusť odpovídající příkazy z handoffu, aktualizuj `IMPLEMENTATION-STATUS.md` a backlog a připrav popis změny pro nezávislé review. Neoznačuj integrační nastavení za hotové bez skutečného ověření. Pokud chybí přístup ke službě, dokonči lokální část a přesně popiš chybějící krok.
