---
name: svdt-claude-handoff
description: Předávej vývoj SVDT 2027 místnímu Claude Code; Codex připravuje zadání, nezávislé review, testy a Git. Použij pro tento projektový tok implementací a oprav, nikoli pro iNice nebo nasazení.
---

# SVDT → místní Claude Code

Vojta komunikuje s Codexem. Claude připravuje návrhy souborů, Codex kontroluje celý diff, skutečně testuje a spravuje Git. Zdroj pravdy: `event-app-zadani/`, před prací aktuální `HANDOFF-CLAUDE.md`, `IMPLEMENTATION-STATUS.md`, `DECISIONS.md`, `BACKLOG.md`, `SPOLUPRACE-A-ZALOHY.md` a `event-app/AGENTS.md`. Nejnovější priorita jsou Lidi a crew, nikoli staré pořadí Partneři → Finance.

Tento postup platí pouze pro `kabelkac77/SVDT2027`, ověřeného zadavatele/revizora `vojtechhrach` a pracovní kořen ověřený v neveřejné místní konfiguraci. Origin a veřejnost se nemění. Provozní podklady patří do samostatného ověřeného neveřejného úložiště až na konkrétní pokyn; jeho identitu a cesty čti z místního provozního záznamu, nevkládej je do veřejného předání. `.local/`, skutečné osobní/finanční podklady, SQLite/WAL/SHM, zálohy, soukromé screenshoty a secrets nepředávat Claudovi ani do Git/issue/PR/CI. `public/` a klientský bundle jsou veřejné. WhatsApp/Twilio zůstávají vypnuté.

## Běžný běh

1. Zachovej aktuální práci; žádný reset/clean ani staging celého stromu. Pro malý úkol použij vlastní čistou worktree stejného Git repozitáře, větev `codex/` nebo `claude/` a plný očekávaný HEAD. Nová worktree neobsahuje necommitnutou personální pracovní verzi. Potřebné obecné zdroje přenes vědomě a ověř, nikdy celý pracovní adresář.
2. Vytvoř malé issue od ověřeného účtu s markerem `<!-- svdt-local-claude -->`, účelem, hranicemi a akceptací. Vyber minimální kontext ze zkontrolovaných sledovaných souborů a přesný allowlist zápisu. Pro DDL pouze konkrétní schema-only migrace přes `--context-ddl`, nikdy dump nebo reálné řádky.
3. Spusť runner `event-app/tools/claude_handoff.py` s `--dry-run`. Zkontroluj repo, head, rozsah a velikost kontextu; tento krok nekontaktuje model. Poté tentýž příkaz bez `--dry-run`.
4. Runner používá existující nativní Claude Pro, výchozí model CLI, bez nástrojů/MCP, bez API klíčů a fallbacku. Žádná produkční oprávnění. Před/po konkrétním modelovém běhu čte nativní `/usage`, přesně stejným guardem, stavem a zámkem účtu jako ostatní povolené projekty na tomtéž účtu. Konkrétní modul a cestu účtového stavu načítá host z neveřejné místní konfigurace. Nikdy nezaváděj druhou kvótu nebo vlastní override cesty. iNice konfiguraci ani runner neměň.
5. Neznámá/stará kapacita blokuje. Při 100 % čekej na doložený reset a nový nativní odečet. Týdenní 50/75/90 % oznam jednou a potvrď jejich ID pomocí existujícího guardu `ack`; historie spotřeby není nový odečet. Bez pollingu. Timeout/nejasná chyba: žádný slepý retry; zjisti bezpečnou kategorii a příčinu. Nepřepínej účet/model a neobcházej automatickou kontrolu oprávnění.
6. Výstup je strukturovaný návrh kompletních povolených souborů. Runner ověří JSON, cesty, verzi a čistotu znovu před zápisem; sám netestuje ani nepublikuje. Codex udělá nezávislé review a relevantní testy dle `event-app/README.md`. Pro Python nástroje izolované syntetické unittesty, pro aplikaci typecheck/build, doménové/PGlite a browser testy. Nezaměňuj mock OAuth/OTP za živé doručení nebo RLS.
7. Před publikací zkontroluj jednotlivé cesty, obsah indexu, ignorování citlivých dat a deploy vazby. Commit jen cílených souborů, push vlastní větve, Draft PR, připojit PR k chatu. Žádný push main, merge nebo automatické nasazení. Review připni na aktuální PR head; opravu spusť ve stejné čisté větvi s `--review PR:review_id` a novým plným HEAD, potom nové nezávislé review/testy.

Příklad (dosadit skutečně ověřené hodnoty; nepouštět z hlavní rozpracované kopie):

```sh
python3 event-app/tools/claude_handoff.py --worktree /cesta/k/worktree \
  --expected-head PLNY_40ZNAKOVY_HEAD --issue CISLO \
  --context event-app/README.md --allow event-app/tools/povoleny_soubor.py --dry-run
```

Nativní guard je znovupoužitá společná závislost nastavená v místním `~/Library/Application Support/SVDT/ClaudeHandoff/project.json`; chybí-li nebo změnil-li účtový stav, běh se zastaví. Konfigurace obsahuje repository, actor, workspace, shared_usage_module a shared_account_state. Poslední dvě položky musí odkazovat na skutečně existující společný mechanismus účtu, nikoli novou projektovou kvótu. Absolutní cesty a provozní vazby zůstávají mimo veřejný kód a modelový kontext. Denní zálohy SVDT nejsou aktivací tohoto postupu vyřešené. Neslibuj běh bez dostupného Macu/Codexu.
