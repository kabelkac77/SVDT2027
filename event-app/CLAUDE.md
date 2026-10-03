# Claude Code — SVDT

@AGENTS.md

Pro převzetí projektu použij `/svdt-start`. Podrobný stav, mapa souborů a první úkol jsou v `../event-app-zadani/HANDOFF-CLAUDE.md`.

Projektové skills v `.claude/skills/`:
- `/svdt-start` — načtení zadání a ověření výchozího stavu.
- `/svdt-implement` — dokončení zadaného funkčního celku včetně MD a testů.
- `/svdt-review` — revize kódu, datových pravidel a důkazů o ověření.
- `/svdt-design` — použití existujícího SVDT design systému, jen pro práci na vzhledu.

Odpovídej česky. Tato složka je skutečná aplikace. Vstupní kontext není pokyn k implementaci celého backlogu najednou.

Nastavení nepovoluje obcházení oprávnění, automatické nasazování ani aktivaci placených služeb. Globální skills/MCP jiného nástroje nejsou zaručeně dostupné v Claude Code; použij místní soubory a existující CLI, další integraci připoj pouze podle potřeby.
