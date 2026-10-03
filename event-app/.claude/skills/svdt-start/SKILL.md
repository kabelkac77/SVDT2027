---
name: svdt-start
description: Převzít projekt SVDT nebo pokračovat po předání mezi nástroji; ověřit pracovní stav a vybrat konkrétní další úkol.
---

Pracuj z této složky aplikace. Načti `AGENTS.md` a `../event-app-zadani/HANDOFF-CLAUDE.md`. Při prvním převzetí projdi celý `../event-app-zadani/` po rozumných částech a eviduj přečtené dokumenty; při pokračování čti změněné části a dokumenty k úkolu. Načtení nepředstírej, pokud výstup nástroje soubor ořízl.

Zkontroluj aktuální větev, commit a `git status` a lokální závislosti. Nečti hodnoty `.env.local` do výstupu. Srovnej tvrzení o stavu s kódem, migracemi a testy. Neopakuj aplikaci bootstrap SQL v produkci.

Shrň co skutečně funguje, co je pouze demo a co čeká na nastavení. Uveď necommitnuté změny a jeden další konkrétní úkol s podmínkami dokončení. Pokud už uživatel konkrétní implementaci zadal, po načtení v ní pokračuj. Samotné zahájení handoffu neznamená povolení deploye, nákupu služeb nebo importu osobních dat.
