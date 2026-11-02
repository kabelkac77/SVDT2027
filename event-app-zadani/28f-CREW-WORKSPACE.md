# Omezený krok: pouze pracovní workspace crew

Implementovat jediný soubor event-app/src/components/crew-workspace.tsx, client export CrewWorkspace({userId,onLogout}): userId:string,onLogout:()=>Promise<void>. Auth a změny identity řeší existující CrewApp obal, tento komponent je keyed userId a odmountován při jeho změně. Žádná auth SDK getSession/listener/login logika sem nepatří. Implementovat jen načítání/evidenci ročníků, tabulku a formuláře. V cleanup označit generation/inactive pro pozdní odpovědi. Use loadCrewEditions/loadCrew/writeCrew z backendu a model/formy dle předaného kontraktu. Žádné jiné soubory/demo/localStorage/importy/účty/SQL. Zachovat názvy app-shell crew-app/sidebar/workspace/topbar/crew-* pro hostCSS. Přibližně350–450 řádků, vyhnout se zbytečnému duplicitnímu JSX.

Načíst dostupné crew ročníky, zvolit poslední aktivní, nulovýrole není demo. Při načtení jiného roku starý datový snímek skrýt, generation guard. Při selhání rolí/access vyčistit stará data, chybu konstantně zobrazit. Chybějící konfigurace/migrace je čitelná chyba nastavení. Odhlášení až po guardu přes onLogout(), zachytit případnou chybu. Při unmount nevracet žádný předchozí snapshot. Authrefresh při stejném userId workspace neremountuje.


Sidebar Lidi a crew aktivní, Partneři odkaz /, další moduly zatím nedávat jako funkční. Pro odchod chránit draft. Stručná hláška: jde o sdílenou evidenci, místní historická evidence se automaticky nepřenáší.

Sbalené kategorie s výrazným názvem, barevným pruhem cat-0..cat-11 ověřeným regex, počet zobrazených a souhrny pěti stavů filtrovaných uložených záznamů. Hledání, filtr stavů, checkbox vyřazených. Pokrytí cíle coverageFor(category,data.entries) nad celou uloženou kategorií pouze pro admin/coordinator! Member dostává vlastní RLS výřez, takže mu neukazovat zavádějící týmové deficity, místo toho 'Moje přiřazení'. Cíl termín viditelný; stavy Neurčeno/K ověření/Chybí N/Cíl pokryt. Nezaměňovat řádky s lidmi.

Osm sloupců Jméno / Stav / Pozice / Kdo řeší / PÁ (od–do) / SO (od–do) / Domluva / Rok. Řádek klikem a klávesnicí otevře další tr/td colSpan8 s CrewEntryEditor; ovládací button u jména aria-expanded, ne nový modal/stránka. Kontakty v detailu. Když data.canFinance=false, žádné částky/barter/merch v DOM, jen 'Odměna neveřejná'. Pokud true stručný přehled známé domluvy a CrewCompensationForm uvnitř detailu (oddělené uložení, nový roster napřed uložit). Přidat člověka admin/coor; klientské UUID/verze0 už před prvním pokusem, výchozí kind unresolved, žádný autoperson merge. Nový draft musí mít místo v tabulce i když neodpovídá aktuálnímu filtru. Úprava kategorie/zařazení nesmí ztratit otevřený detail; draft renderovat pod původním řádkem až do uložení nebo zahození. Member readonly, archiv readonly.

## Zápis a draft

Ref lock i disabled UI brání dvěma současným submitům. writeCrew(e,kind,payload,requestId). Drž fingerprint JSON těla+kind+edition a requestId přes chyby; stejné tělo opakuje stejné UUID, změněné tělo nové. Neuložené změny při chybě zachovat, při konfliktu nabídnout vědomé zahození/načtení aktuální verze. Při nejasném zápisu a nepovedeném refresh nesmí nový UUID duplikovat vytvořený záznam. Po úspěchu načíst nové verze ze serveru, zachovat otevřený řádek, draft aktualizovat na uložený záznam. Stav úspěchu pouze po potvrzeném serverovém výsledku. Pokud write uspěl a refresh selhal, zachovat původní request/draft a upozornit, žádný druhý neidentický zápis naslepo.

beforeunload při dirty/saving. Změna ročníku/řádku/filtrů, zavření detailu, sbalení kategorie obsahující draft, settings a odhlášení chrání draft včetně settings child onDirty. Během saving zakázat přepnutí/odchod uvnitř UI. window.confirm pro vědomé zahození; při odmítnutí hodnoty/rozepsání zachované. Při přijetí zahození resetovat i child form stav (key nebo odmount), aby se nechtěně nezachovalo staré neuložené nastavení.

## Nastavení

Jen editovatelné role v aktivním ročníku mají Kategorie/cíle: výběr existující / nová a CrewCategoryForm. Jen admin má Přístupy: výběr existujícího členství / nové a CrewMembershipForm. Po uložení reload aktuálního datového snímku/versions a remount příslušného formuláře, aby další změna nešla se starou verzí. Popisky existujících členství email/role (UUID není hlavní label). Nic sám nevytváří účty, neuděluje konkrétní práva a neposílá zprávy. Vlastní přístup může být po změně odebraný: stará data musí zmizet i když následný refresh vrátí CREW_ACCESS_DENIED.

Správa Přístupů je dostupná adminovi i v archivovaném ročníku, protože revokace práv nesmí odemknout/změnit historii; pouze member write zde může proběhnout. Ostatní archived forms readOnly.
