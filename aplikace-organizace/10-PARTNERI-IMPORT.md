# Podklad Partnerů — pravidla importu

Zdrojové soubory, odkazy na tabulky, konkrétní listy/řádky, kontakty a výsledky filtrace jsou v soukromém repozitáři `vojtechhrach/SVDT2027-neverejne`, složka `aplikace-organizace-neverejne/10-PARTNERI-IMPORT.md`.

- Filtrovat podle akce a ročníku; historie nedokládá potvrzenou spolupráci v novém ročníku.
- Nejasné přiřazení, sdílené částky a nejednoznačné identity předat k ruční kontrole.
- Zachovat původ list/řádek; podobný název není důkaz totožnosti organizace.
- Kandidát není automaticky oslovený nebo potvrzený partner. Stav a owner se volí při kontrolovaném uložení.
- Soubor se načítá lokálně ve frontě podkladů. Skutečná data nepatří do veřejného dema ani klientského bundle.

Filtr: `event-app/scripts/filter_partners.py`. Model: `10-PARTNERI-MODEL-A-FLOW.md`. Lokální pracovní kopie výsledku může zůstat v ignorované `.local/partners-intake.json`.
