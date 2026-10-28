# Pracovní přehled — verzování a spolehlivost snímků

2026-10-28. Navazující malý celek po ověření spolupráce Codex → místní Claude Code. Zachovává aktuální prioritu Lidi a crew a existující ovládání; sdílený Supabase personální modul, oprávnění dalších lidí a import jsou samostatné otevřené kroky.

## Obecné zdroje a soukromá data

Do samostatné větve `codex/crew-workspace-reliability` jsou převzaté jednotlivě zkontrolované obecné zdroje pracovního přehledu, server, testy, spouštěč, fonty shodné s již veřejnou značkou a výhradně syntetické ukázky. Navazuje na PR #17; bez jeho sloučení je základem nového PR tato větev, nikoli přímá změna main.

Databáze, historické podklady, skutečné kontakty/částky, exporty, soukromé screenshoty a lokální strojové vazby nejsou součástí zdrojů, modelového kontextu ani CI. Nová čistá kopie nezakládá skutečnou evidenci sama; inicializace vyžaduje účelově předaný soukromý zdroj nebo výslovně zvolená syntetická data v oddělené složce. Existující DB se při restartu nepřestavuje ze zdroje.

Ovládání a obnova: [21 — pracovní evidence](21-LIDE-A-CREW-PRACOVNI-VERZE.md). Předávací pravidla: [22 — spolupráce](22-CODEX-CLAUDE-SPOLUPRACE.md).

## Ověřovaný technický kontrakt

Obecné [issue #18](https://github.com/kabelkac77/SVDT2027/issues/18) používá jen SQLite a fiktivní testovací data. Vyžaduje atomické vytvoření cílového snímku až po ověření jeho úplnosti, zachování existujícího platného výsledku, soukromá oprávnění, bezpečné chyby a odolnost vůči souběhu. Prázdná SQLite není platný aplikační snímek. Poškozený cíl ani symlink se automaticky nemaže nebo nepřepisuje. Neúspěch před zápisem položky nesmí změnit data, verzi, audit nebo idempotentní požadavek.

Claude smí v tomto běhu navrhovat pouze `event-app/tools/crew_workspace.py` a `event-app/tests/crew_workspace_test.py`. Codex provádí nezávislé poruchové testy a review. Skutečné uložené záznamy se při testech nepoužívají.

**Stav: IMPLEMENTED / lokálně ověřeno.** [Draft PR #19](https://github.com/kabelkac77/SVDT2027/pull/19) navazuje na PR #17. Claude připravil návrh; nezávislé review a poruchové testy odkryly přijetí vadného existujícího cíle, neúplné schema a nechráněné I/O chybové větve. Původní větší opravný běh překročil limit bez změny souborů; po ověření této skutečnosti se práce rozdělila na hostitelské testy a jediný backendový výstup. Menší běh dokončený s původním Pro/default modelem a nezměněným společným guardem. Nebyl opakovaný totožný požadavek ani použitý API/modelový fallback.

Codex při závěrečném review doplnil výslovné otevření pouze pro čtení a odmítnutí prázdných inicializačních metadat; původní parser částek zachovaný. Hotový snímek se zveřejňuje atomickým odkazem až po kontrole integrity, tabulek, potřebných sloupců a metadat. Existující platný výsledek se nepřepisuje. Vadný soubor, adresář nebo symlink má bezpečné selhání a zůstává zachovaný k vědomému řešení.

Prošlo **73 syntetických Python testů**, včetně osmi nezávislých kontraktů a čtyř dalších I/O/validačních testů hostitele. Ověřené přerušení, další pokus, souběh, chyby vytvoření/úklidu, privátní oprávnění od vzniku, zachování zdroje/verzí/auditu/požadavků a skutečná obnova do nové složky. Čtyři veřejné JS zdroje prošly syntaktickou kontrolou, HTML odkazy jsou úplné. Rozhraní se funkčně nemění; historické browser kontroly nejsou vydávané za nový běh.

Strojově čitelná evidence je v [crew-snapshot-verification.json](crew-snapshot-verification.json). Konkrétní poslední revizi a CI ukazuje PR. Soukromý seznam k ručnímu průchodu je uložený jen místně a zůstává návrhem bez automatické změny záznamů.

## Co zůstává k ručnímu průchodu

- Správnost převzatých řádků, rozlišení osob/skupin, nejasné kategorie a význam původních značek.
- Aktuální účast, termíny, domluvené částky a barter/merch pro nový ročník.
- Budoucí sdílení, datové rozsahy rolí a řízený přenos do skutečného sdíleného modelu.
- Posouzení hustoty, mobilního ovládání a provozních průchodů; technická kontrola nenahrazuje uživatelskou akceptaci.

Tento celek neaktivuje plánované kompletní denní zálohy aplikace, služby nebo nasazení. Denní bod obnovy při použití místního nástroje je užší funkce; neupravuje plánovač, retenci ani cloudovou kopii.
