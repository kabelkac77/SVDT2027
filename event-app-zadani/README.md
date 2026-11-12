# SVDT 2027 — aplikace a organizace

Tato složka je source of truth pro organizační strukturu SVDT 2027 a připravovanou eventovou aplikaci.

## Dokumenty
- HANDOFF-CLAUDE.md — vstup pro Claude Code, aktuální stav, mapa kódu, testy a priority; instrukce jsou pouze v `../event-app/CLAUDE.md` a `../event-app/AGENTS.md`.
- CONTEXT.md — organizační kontext, role, procesy a rozhodnutí.
- APP_ARCHITECTURE.md — hrubá architektura aplikace.
- BACKLOG.md — otevřené body, podklady a další práce.
- 10-PARTNERI-MODEL-A-FLOW.md — detailní model, oprávnění a UI/flow interní V1 Partnerů.
- 10-PARTNERI-IMPORT.md — filtrace partnerského Excelu a pravidla přenosu historie.
- 11-FINANCE-IMPLEMENTACNI-PLAN.md — konkrétní návrh finančního Supabase backendu, rolí/RPC, schvalování, importu a etap s akceptací; zatím bez implementace.
- IMPLEMENTATION-STATUS.md — skutečně implementované, ověřené a dosud nehotové části.
- PRIHLASOVANI.md — Google/Apple/Facebook, nastavení a cenový podklad WhatsApp.
- SPOLUPRACE-A-ZALOHY.md — návrh spolupráce Claude/Codex a požadavek na denní zálohy/CSV/Excel; provoz zatím není aktivovaný.

## Pořadí vývoje
1. Uzavřít architekturu.
2. Modul Partneři.
3. Modul Finance.
4. Následně personál, závodníci, mapy/zóny, Race Control a další části.

Dokumentace je živá. Nová rozhodnutí se mají průběžně zapisovat sem, aby nezůstávala pouze v chatu.

## Veřejné a neveřejné podklady

Tato složka obsahuje veřejnou specifikaci. Zdrojová data, podrobné rozbory a konkrétní provozní údaje jsou v soukromém [SVDT2027-soukrome](https://github.com/vojtechhrach/SVDT2027-soukrome/tree/main/event-app-podklady-soukrome). Přístup k němu se přiděluje samostatně. Hesla a klíče nejsou součástí žádného repozitáře.

- [37 — transakční počáteční import](37-CREW-TRANSAKCNI-IMPORT.md) a [38 — čistý builder plánu](38-CREW-IMPORT-PLAN-BUILDER.md): implementovaný kód a syntetické ověření, bez skutečného importu. [Evidence](crew-import-verification.json).

- [40 — čtecí původ a historie crew](40-CREW-CTENI-HISTORIE.md): backend synteticky ověřený, UI/aktivace otevřené. [39 — kontrolní protokol](39-CREW-KONTROLA-PREVODU.md) je rozpracovaný, nikoli implementovaný.
