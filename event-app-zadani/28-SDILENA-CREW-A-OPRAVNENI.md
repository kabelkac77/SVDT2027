# Sdílená crew, účty a obsazenost — interní V1

Autorizované pokračování 2026-11-02, navazuje na 27. Datový model a bezpečnostní hranice připravuje host, aplikační implementaci místní Claude. Migrace v repozitáři je schema-only; zatím neaplikovaná na skutečný projekt.

## Data a přístup

Existující ročníky a Supabase Auth zůstávají základem. Nová crew členství jsou oddělená od členství Partnerů, aby crew účet nezískal jejich data. Stávající správce ročníku je také správce crew; nové členství nabízí role správce, koordinátor a člen. Konkrétní lidé/role zatím nejsou udělené. Správce může navázat již existující účet podle přesného e-mailu, účet nevytváří ani mu neposílá zprávu.

Koordinátor upravuje provozní evidenci. Běžný člen čte jen přiřazené vlastní záznamy; kategorie jsou dostupné jako provozní kontext. Odměny, barter/merch a jejich audit jsou v oddělených tabulkách, přístupné správcům, případně výslovně finančně oprávněnému koordinátorovi. Crew audit je správce-only, nepoužívá stávající partnerský audit čitelný širšímu okruhu.

Kategorie mají volitelný požadovaný počet a přesný termín. Roster zachovává jméno/skupinu, kontakty, stav, poznámky, PÁ/SO a ročník. Typ je osoba/skupina/nevyjasněný; výchozí je nevyjasněný. Potvrzená účast vyžaduje termín. U explicitně zvolené osoby vznikne globální Person nebo se vědomě použije již přiřazený Person stejného ročníku; nic se neslučuje podle jména či e-mailu. Provozní texty na ročníkovém řádku jsou samostatný snímek a neaktualizují dřívější ročníky. Skutečný historický import a mapování z místní evidence jsou samostatný kontrolovatelný krok, nyní bez přenosu dat.

## Zápisy a audit

Pouze RPC crew_write(e,kind,p,request_id), kind category/roster/compensation/member. Prohlížeč nemá přímý INSERT/UPDATE/DELETE. Každý zápis ověří aktuálního uživatele, roli, nearchivovaný ročník pro provozní/finanční změny, verzi a přesné povolené klíče. Ročníkové vazby kontrolují složené FK. Opakovaný request stejného aktéra/ročníku vrací týž výsledek, jiné tělo téhož requestu je konflikt. Oprávnění se znovu ověřuje před vrácením cache. Requesty a audit nemohou odhalit odměny běžnému členovi. Změny mají databází ověřeného autora. Členství se vypíná místo smazání vazeb, posledního správce nelze odebrat; zděděný správce se neodnímá přes crew formulář.

## Obsazenost

Cíl bez požadovaného počtu/termínu je Neurčeno. Počítat jedinečná Person ID potvrzená pro přesný požadovaný termín, ne řádky nebo volný text pozice. Skupiny/nevyjasněné řádky se samy nepovažují za jednu osobu. Pokud chybějící počet mohou ovlivnit nevyjasněné záznamy, označit nejistotu místo tvrzení přesné mezery. Nevyhodnocuje se překryv směn nebo odpracované hodiny z ručních PÁ/SO rozsahů.

## Podmínky dokončení

Databázové negativní scénáře: cizí ročník, nepřihlášený, partner-viewer bez crew role, člen cizího záznamu, koordinátor bez finančního grantu, přímý zápis, podvržený autor/role, archiv, souběžná verze, opakované požadavky, odebraný přístup a soukromý audit. Testy používají fiktivní uživatele v PGlite; to není živé ověření poskytovatele Auth.

Aplikační část: samostatná /crew, přihlášení přes existující Supabase klient, výběr dostupného ročníku, sbalené kategorie, detail pod řádkem, ochrana rozepsaných změn, cíle obsazenosti, zvlášť odměny jen oprávněným a správa členství jen správci. Chyba nebo chybějící migrace nesmí otevřít demo ani vymazat data. Místní SQLite a historie se dál používají samostatně až do schváleného řízeného převodu.

Stav: IN PROGRESS. Konkrétní účty, hosting, skutečná migrace/import a živý víceuživatelský průchod nejsou zatím provedené. Vizuální kontrola čeká na dostupný browser.

Správa přístupů je výjimkou ze zamčení archivu: správce může i po archivaci odebrat/znovu upravit členství, aniž změní historickou crew nebo odměny. Ověřeno samostatným databázovým scénářem.

UI předání #27 (dva soubory) a #30 (celá stránka) překročila limit900s bez aplikovaného návrhu. Formuláře #28 byly zúžením úspěšně dodané a hostem opravené/testované. Další krok proto dělí auth obal od pracovního workspace; žádný slepý stejný retry nebo alternativní účet/model.

E-mail pro nové členství musí odpovídat právě jednomu Auth účtu; více shod je explicitní chyba bez udělení práv. Samotné odebrání finančního grantu zachovává koordinaci, ale znepřístupní i dřívější cached finanční odpovědi (testováno).

Samostatný workspace #32 také překročil900s bez výstupu; přihlašovací obal #31 dodaný. Další skutečná změna rozsahu: čistý tabulkový pohled oddělený od asynchronního controlleru (28g). Nejde o opakování stejného promptu.
