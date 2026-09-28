---
name: svdt-review
description: Nezávisle zkontrolovat konkrétní diff, větev nebo PR organizační aplikace SVDT před předáním či nasazením.
---

Rozsah revize: $ARGUMENTS

Načti `AGENTS.md`, zadání dotčeného modulu a diff. U necommitnutého `event-app/` nestačí `git diff`: prověř i nové soubory podle `git status`. Rozliš chybu aktuální změny a již známý nedodaný rozsah.

Prioritně ověř:
- Čtení a zápisy mezi ročníky/rolemi, archiv, odmítnutí anonymního uživatele a nového účtu bez členství. Skrytí UI není kontrola oprávnění.
- Transakce a souběh: zastaralý formulář, dvě úhrady současně, rollback, audit autora. U financí nezdvojené osobní proplacení, NULL vs nula a celočíselné částky.
- Importy nevkládají soukromá data do bundle a nevymýšlejí aktuální stav spolupráce ze starého Excelu.
- Migrace nepoškozuje existující data; návrat aplikace a obnova DB mají realistický postup.
- Testy ověřují skutečné pravidlo a MD odpovídají výsledku. Mock Auth a lokální demo nejsou důkaz produkční funkčnosti.

Uveď konkrétní chyby s prioritou, cestou/řádkem, spouštěčem a dopadem. Pokud chyby nenajdeš, uveď to a zbývající meze ověření. V čistém review neměň soubory; při výslovném zadání oprav nalezené problémy a znovu ověř dotčené chování. Review samo neautorizuje merge/deploy.
