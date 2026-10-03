# Finance — pravidla převodu podkladů

Zdrojové sešity, odkazy, podrobná mapa buněk a neveřejné výsledky kontroly jsou v `vojtechhrach/SVDT2027-soukrome/event-app-podklady-soukrome/11-FINANCE-PODKLAD.md`.

- Historický rozpočet je zdroj struktury, nikoli automaticky potvrzené závazky nebo platby nového ročníku.
- Rozlišovat plán, potvrzenou částku, úhrady a proplacení osobních výdajů. Neznámé hodnoty nejsou nuly.
- Oddělit jednotlivé akce a ročníky; sdílené položky vyžadují kontrolované rozdělení.
- Detail a jeho souhrn zaúčtovat právě jednou. Barter a vlastní převody nesmí navyšovat peněžní tok.
- Zachovat původní hodnoty, poznámky, vzorce a identifikaci zdroje pro audit.
- Samostatně vyřešit finanční oprávnění; role v Partnerech neposkytuje automatický přístup k Financím.

Model a flow: `11-FINANCE-MODEL-A-FLOW.md`. Finance zatím fungují jako lokální demo; finanční migrace ani ostrý import nejsou dokončené.

Implementační návaznost 2026-10-03: [11-FINANCE-IMPLEMENTACNI-PLAN.md](11-FINANCE-IMPLEMENTACNI-PLAN.md), §10. Zachovat soukromou review frontu, fingerprint i původní řádky/vzorce, explicitní význam částek, ročník a split akcí. Historii 2026 lze přenést jen jako vědomý návrh plánu, nikoli schválení nebo úhrady 2027. V tomto kroku žádný finanční podklad znovu neimportujeme.
