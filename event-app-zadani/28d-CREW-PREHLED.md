# Omezený krok: stránka sdílené crew

Implementovat pouze event-app/src/components/crew-app.tsx, client component export CrewApp(). Už existují zkontrolované crew-model.ts/crew-backend.ts a crew-forms.tsx. Host doplní route /crew, CSS, navigaci a testy. Použij existující app-shell/sidebar/workspace/topbar/panel/field-row/form-actions/badge třídy, další třídy začínej crew-. Kořen className='app-shell crew-app'. Přehledné česky, max přibližně400 řádků, žádný nový backend/model/forms nebo soubory. Bez demo/localStorage/importů/skutečných dat/nasazení.

## Přístup a načítání

Stávající supabase() z lib/backend. E-mail/heslo auth login/logOut, getSession a onAuthStateChange. Přihlášení samo není členství. Chybějící konfigurace nebo nasazení migrace je čitelná chyba, nikoliv prázdný úspěch nebo demo. loadCrewEditions/loadCrew. Vybrat aktuální poslední nearchivovaný dostupný ročník. Ukázat rok a přepínač dostupných ročníků, read-only archiv. Oddělení účtů/ročníků: okamžitě skrýt data při skutečné změně auth UID, zneplatnit opožděné načítání i zápisy. Generace/ref guardy, žádná data předchozího uživatele. TOKEN_REFRESHED/stejný UID nesmí smazat draft. Opožděný getSession nesmí přepsat novější auth událost. Při změně účtu volat setData(null) před dalším načtením. Auth callback nesmí awaitovat jiné SDK volání uvnitř locku callbacku (přepnout stav, fetch pak effect). Všechny promise chyby zachytit a mapovat konstantní hláškou; nevypisovat syrové serverové chyby nebo osobní hodnoty.

## Přehled

Sidebar Lidi a crew aktivní, Partneři odkaz /, další moduly zatím nedávat jako funkční. Pro odchod chránit draft. Stručná hláška: jde o sdílenou evidenci, místní historická evidence se automaticky nepřenáší.

Sbalené kategorie s výrazným názvem, barevným pruhem cat-0..cat-11 ověřeným regex, počet zobrazených a souhrny pěti stavů filtrovaných uložených záznamů. Hledání, filtr stavů, checkbox vyřazených. Pokrytí cíle coverageFor(category,data.entries) nad celou uloženou kategorií pouze pro admin/coordinator! Member dostává vlastní RLS výřez, takže mu neukazovat zavádějící týmové deficity, místo toho 'Moje přiřazení'. Cíl termín viditelný; stavy Neurčeno/K ověření/Chybí N/Cíl pokryt. Nezaměňovat řádky s lidmi.

Osm sloupců Jméno / Stav / Pozice / Kdo řeší / PÁ (od–do) / SO (od–do) / Domluva / Rok. Řádek klikem a klávesnicí otevře další tr/td colSpan8 s CrewEntryEditor; ovládací button u jména aria-expanded, ne nový modal/stránka. Kontakty v detailu. Když data.canFinance=false, žádné částky/barter/merch v DOM, jen 'Odměna neveřejná'. Pokud true stručný přehled známé domluvy a CrewCompensationForm uvnitř detailu (oddělené uložení, nový roster napřed uložit). Přidat člověka admin/coor; klientské UUID/verze0 už před prvním pokusem, výchozí kind unresolved, žádný autoperson merge. Nový draft musí mít místo v tabulce i když neodpovídá aktuálnímu filtru. Úprava kategorie/zařazení nesmí ztratit otevřený detail; draft renderovat pod původním řádkem až do uložení nebo zahození. Member readonly, archiv readonly.

## Zápis a draft

Ref lock i disabled UI brání dvěma současným submitům. writeCrew(e,kind,payload,requestId). Drž fingerprint JSON těla+kind+edition a requestId přes chyby; stejné tělo opakuje stejné UUID, změněné tělo nové. Neuložené změny při chybě zachovat, při konfliktu nabídnout vědomé zahození/načtení aktuální verze. Při nejasném zápisu a nepovedeném refresh nesmí nový UUID duplikovat vytvořený záznam. Po úspěchu načíst nové verze ze serveru, zachovat otevřený řádek, draft aktualizovat na uložený záznam. Stav úspěchu pouze po potvrzeném serverovém výsledku. Pokud write uspěl a refresh selhal, zachovat původní request/draft a upozornit, žádný druhý neidentický zápis naslepo.

beforeunload při dirty/saving. Změna ročníku/řádku/filtrů, zavření detailu, sbalení kategorie obsahující draft, settings a odhlášení chrání draft včetně settings child onDirty. Během saving zakázat přepnutí/odchod uvnitř UI. window.confirm pro vědomé zahození; při odmítnutí hodnoty/rozepsání zachované. Při přijetí zahození resetovat i child form stav (key nebo odmount), aby se nechtěně nezachovalo staré neuložené nastavení.

## Nastavení

Jen editovatelné role v aktivním ročníku mají Kategorie/cíle: výběr existující / nová a CrewCategoryForm. Jen admin má Přístupy: výběr existujícího členství / nové a CrewMembershipForm. Po uložení reload aktuálního datového snímku/versions a remount příslušného formuláře, aby další změna nešla se starou verzí. Popisky existujících členství email/role (UUID není hlavní label). Nic sám nevytváří účty, neuděluje konkrétní práva a neposílá zprávy. Vlastní přístup může být po změně odebraný: stará data musí zmizet i když následný refresh vrátí CREW_ACCESS_DENIED.
