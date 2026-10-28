# Menší opravný krok — pouze backend

Host nyní přebírá autorství regresních testů a opravuje jejich syntetické fixtures. Model mění pouze event-app/tools/crew_workspace.py. Testy jsou čtecí kontext; žádný nástroj ani další zápis není povolen. Vrátit jen obsah změněného povoleného backendového souboru.

Zůstávají tři konkrétní nálezy připnutého review: rozlišit existující platný/neplatný/symlink cíl a stejně vyhodnotit vítěze souběhu; ověřit skutečné potřebné sloupce a neprázdná inicializační metadata pouze pro čtení; chránit všechny I/O chybové větve konstantní bezpečnou výjimkou bez názvů cest. Zachovat atomické zveřejnění os.link bez přepsání, soukromá oprávnění a úklid vlastních dočasných souborů. Ostatní funkce včetně částek, HTTP a ročníků se nemění. Není nutný redesign nebo univerzální migrační framework.

Smyslem je dokončit konkrétní obecný SQLite kontrakt v menším výstupu. Po výsledku host skutečně spustí regresní testy a nezávislé review. Žádný úspěch testů nebo publikaci model netvrdí.
