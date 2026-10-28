# SVDT — Codex a místní Claude Code

2026-10-28. Výslovně zadaný postup z uživatelem určeného zahajovacího promptu. Nezadává novou funkci aplikace, produkční import/migraci, platbu, nasazení, odesílání zpráv ani pravidelnou automatizaci.

## Úložiště a zdroje pravdy

| Účel | Umístění a ověřený stav |
| --- | --- |
| Obecný kód aplikace a syntetické testy | Veřejný `kabelkac77/SVDT2027`, hlavně `event-app/`; uživatel `vojtechhrach` má ověřený admin/push přístup. |
| Zadání, backlog, rozhodnutí, stav a předání | `event-app-zadani/` ve stejném veřejném repozitáři. Aktuální `HANDOFF-CLAUDE.md`, `IMPLEMENTATION-STATUS.md`, `DECISIONS.md`, `BACKLOG.md` mají přednost před historickým popisem etap. |
| Provozní podklady | Samostatný ověřený neveřejný repozitář; konkrétní identita a cesty jsou jen v místním provozním záznamu. Místní GitHub CLI přístup ověřený jako admin/push; konektor v této relaci vrací 404, což neznamená neexistenci repa. Žádné podklady se při nastavování nepřenášejí. |
| Skutečný personál 2027 a historie 2026/2025 | Místní `.local/`, mimo Git, modelový kontext i CI. Pracovní SQLite, WAL/SHM, zálohy, exporty a soukromé screenshoty patří sem. Tento nástroj není sdílený Supabase personální modul. |
| Tajemství | Lokální konfigurace / správce secrets příslušného prostředí, nikdy ani soukromý Git nebo issue/PR. `public/` a klientský bundle jsou veřejné. |

Repozitář ani jeho veřejnost/origin se nemění. Nový soukromý repozitář kódu nebyl založený. Dosavadní rozdělení odpovídá projektovým pravidlům a zahajovacímu promptu. Změna vlastnictví/veřejnosti nebo větší přesun kódu vyžaduje samostatně vymezený krok.

Při inventuře byla hlavní kopie rozpracovaná na `main` s prázdným indexem; konkrétní otisky jsou v soukromém místním záznamu. Soukromý manifest otisků zachycuje původní rozpracované soubory; ty se nestageují hromadně. Nová izolovaná worktree z tohoto HEAD neobsahuje necommitnutý personál a nesmí se vydávat za jeho úplnou kopii.

## Odpovědnost a provádění

Vojta mluví s Codexem. Claude Pro připravuje implementace a opravy vybraných souborů; Codex píše zadání, samostatně přezkoumává celý diff, skutečně testuje, spravuje Git a předává výsledek. V konkrétním souboru má v danou chvíli jednoho autora. Větve `codex/` nebo `claude/`, malé Draft PR, žádný přímý push main, merge ani deploy.

Udržovaný skill: `event-app/skills/svdt-claude-handoff/SKILL.md`; osobní `~/.codex/skills/svdt-claude-handoff` je odkaz na tento projektový zdroj. Runner `event-app/tools/claude_handoff.py` má vlastní pevný projekt, identitu autora/revizora a marker `<!-- svdt-local-claude -->`; runner a konfigurace iNice se nemění.

Runner ověřuje čistou vlastní worktree stejného Git projektu, origin, větev, úplný očekávaný HEAD, autora/otevřenost issue a u opravy aktuální vzdálený PR head, repozitář, větev, odeslané review a jeho autora/commit. Kontext tvoří jen výslovně vybrané sledované veřejné zdroje ze stejného commitu. Zkontrolované schema-only SQL lze úzce předat jako `--context-ddl`; dumpy a skutečné řádky ne. Přesný allowlist výstupu, syntetické příklady, žádné nástroje/MCP/filesystem/shell/produkce pro model. Host kontroluje strukturovaný výstup a stav před aplikací souborů. Výsledek sám není test nebo schválený commit.

Nativní přihlášení `claude.ai`, předplatné Pro, výchozí model CLI, bez API klíče nebo fallbacku. Společný účet používá existující nezměněný guard a přesně jeho účtový stav a zámek. Konkrétní vazby jsou v neveřejné místní konfiguraci hostitele a nejsou předávané modelu. Nevzniká druhá projektová kvóta. Nativní `/usage` pouze před/po konkrétním běhu; neznámý/stará kapacita blokuje, 100 % do doloženého resetu, týdenní 50/75/90 % jednou oznámit/potvrdit. Timeout/nejasná chyba bez slepého opakování. Žádný generativní dotaz na spotřebu nebo pravidelný polling.

## Testy a veřejné předání

Pro změny nástroje: `python3 -B -m unittest discover -s event-app/tests -p '*_test.py' -v`, syntetická data. Pro změny aplikace navíc skutečné `npm run typecheck`, `npm run build`, doménové/DB testy a browser podle `event-app/README.md`; testovací server oddělený od uživatelské evidence. PGlite a mock OAuth/OTP nejsou živá akceptace Supabase, účtů nebo doručení.

Před push zkontrolovat konkrétní index, diff, cesty, soukromé údaje a deploy vazby. Existující GitHub Pages nasazuje televizní `DT-grafika-TV/docs/` z main; ostatní dva workflow se týkají grafiky. Aktuální inventura ukázala žádné repo webhooky a žádné externí check/status integrace na výchozím HEAD. Na cestách této změny není v těchto workflow deploy trigger; nejde o univerzální důkaz všech budoucích služeb.

## Skutečný ověřovací běh

- Issue [#16](https://github.com/kabelkac77/SVDT2027/issues/16), [Draft PR #17](https://github.com/kabelkac77/SVDT2027/pull/17), větev `codex/svdt-local-claude`.
- Dry-run bez modelu na `86453b50df007d50be002753ee2493845d1f7586`; 3 990 bajtů vybraného veřejného kontextu a dva přesně povolené soubory. Následný skutečný nativní návrh dokončen, commit `b22159e6e946a3f9f8df56b4ba397cd7b399ffa6`.
- Nezávislé [review 5683683976](https://github.com/kabelkac77/SVDT2027/pull/17#pullrequestreview-5683683976) připnuté na tento commit: reprodukováno chybné přijetí SHA s koncovým odřádkováním, TypeError pro nehashovatelný state a whitespace místo vyplněných hodnot.
- Skutečný opravný běh na stejném headu/větvi podle tohoto review, 14 577 bajtů veřejného kontextu. Claude opravil oba původní soubory a přidal regresní případy. Žádné modelové tvrzení nebylo vydávané za test hostitele.
- Codex znovu přečetl diff a skutečně spustil **40 testů** (18 hostitelských + 22 validátoru) a dalších **41 nezávislých kontrol poškozených vstupů**: vše prošlo. Skill prošel oficiálním validátorem skill-creator; CI je na syntetických datech, přesný stav závěrečné revize v PR. Frontend/SQL se nemění, historické aplikační testy se tímto neopakují.
- Strojově čitelná veřejná evidence: [claude-handoff-verification.json](claude-handoff-verification.json), pouze syntetická ověření a veřejné identifikátory. Konkrétní vazby/config, surové odpovědi ani provozní data se nezveřejňují.
- Skutečně ověřeno i zastavení při nedostupném odečtu kapacity a obsazeném společném účtu; po cílené diagnóze/ověřeném uvolnění proběhl návrh i oprava přes nezměněný sdílený guard s nativními odečty před/po běhu. Žádná samostatná projektová kvóta.
- Původní hlavní HEAD a index zůstaly beze změny, původní zdroje zachované; upravené jen zamýšlené MD. Místní Finder `.DS_Store` se nezávisle změnil a nebyl publikován ani vracen. Excel a historická personální data znovu porovnané se zdrojem, beze změny.

Denní kompletní zálohy SVDT a jejich obnova nejsou aktivací tohoto postupu vyřešené. Lokální snímek personální DB při použití aplikace je samostatná, užší funkce. WhatsApp/Twilio zůstávají odložené a vypnuté. Žádné zprávy lidem ani tajné údaje jiným nástrojům se tímto neodesílají.
