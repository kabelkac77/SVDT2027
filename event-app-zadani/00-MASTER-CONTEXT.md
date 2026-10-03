# SVDT 2027 — MASTER CONTEXT

Tento soubor je vstupní bod pro nový Codex/AI chat. Před implementací načti celý adresář `event-app-zadani/`.

## Cíl
Profesionalizovat organizaci SVDT 2027, delegovat operativu a postavit centrální event-management aplikaci.

## Vedení
- **Vojta:** závod, trať, safety, race operations, broadcast, vizuál, finance, povolení. V race day mobilní Race Director.
- **Vlasta:** partneři, personál, nezávodní produkce, VIP, bary, afterparty, kids race, branding, média a logistika.
- Každý má mít +1. Vlastův kandidát: **Jindra (?)**.
- Kandidát Race Coordinator: **Mirek (?)**.
- **Světlana:** manažerka traťových komisařů + Crowd Lead.
- Race Control kandidátní místo: **Točírna**.

## Aplikace
Jedno datové jádro; interní management + Crew/Rider/Partner/Media/Spectator pohledy a web.
První implementace: **Partneři → Finance**.
AI 2027 = experimentální copilot, ne kritická infrastruktura.

## Pravidlo dokumentace
CONFIRMED = odsouhlasené; OPEN = rozhodnout/ověřit; BACKLOG = později; INPUTS NEEDED = podklady od Vojty.

## Handoff do Codexu
1. Přečti všechny MD v tomto adresáři.
2. Dokumentace je source of truth.
3. Neměň zásadní architekturu bez explicitního důvodu.
4. Začni detailem a implementací modulu Partneři, poté Finance.

## Průběžná rozhodnutí
Každé nové důležité rozhodnutí z Codexu zapiš ve stejném pracovním kroku do příslušného `.md` a podle rozsahu také do `DECISIONS.md`. Rozhodnutí nesmí zůstat pouze v chatu. Rozlišuj potvrzené zadání, implementační rozhodnutí a otevřené návrhy; starší rozhodnutí nemaž, ale označ případné nahrazení.
