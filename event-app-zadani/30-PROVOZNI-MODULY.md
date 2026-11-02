# Úkoly, harmonogram, závodníci, zóny a provozní pohled

Stav2026-11-02: implementované schema, doménový model, adaptér, řízené formuláře, přehledy, ukládání a integrace do /crew. Bez aplikace na skutečný server, skutečných grantů/importu a nasazení.

Autorizované pokračování 27. Tento základ je samostatný od historické místní SQLite. Skutečné podklady, individuální granty, nasazení a import se neodhadují.

## Model a hranice

- Úkol je ročníkový, má název/popisek, stav Čeká/Probíhá/Blokováno/Hotovo/Zrušeno, odpovědné přiřazení crew, zónu, začátek/konec a deadline. Harmonogram řadí uložené místní časy akce Europe/Prague, ne časové pásmo telefonu. Chybějící termín není dnešní datum. Zobrazení neslibuje výpočet směn, offline synchronizaci nebo automatické upozornění.
- Zóna má název, instrukce, barevný pruh, vedoucího jako ročníkové přiřazení crew a explicitně zveřejněný pracovní kontakt. Soukromý telefon člověka se automaticky nezpřístupňuje celé crew. Relativní souřadnice 0–100 v plánu musí být obě nebo žádná; skutečný mapový podklad/polohy dodá uživatel později. Bez sledování polohy a externího geokódování. Bez podkladu jde o plán zón, nikoli ověřenou mapu areálu.
- Registrace závodníka má jméno, kontakt, volný název kategorie, číslo, stav Nová/K ověření/Potvrzená/Zrušená, domluvený poplatek a ručně zapsanou uhrazenou část v haléřích. Potvrzení registrace není potvrzení platby. NULL neznámé je odlišné od nuly; částečné úhrady i přeplatek jsou zřetelné. Nepřidává se datum narození, zdravotní údaj, platební brána ani rozhodování o způsobilosti. Pravidla kategorií, kapacity, čísla, skutečný import a význam potvrzení zůstávají k akceptaci.
- Provozní mobilní pohled je stejná responzivní aplikace, vlastní přiřazení/termíny/úkoly, instrukce a zvolený pracovní kontakt. Zápisy příchodu/hotovo běžným členem zůstávají vypnuté do potvrzení, kdo tyto stavy spravuje. Neimplikuje nepřetržitý Race Control, offline nebo nouzovou komunikační službu.

## Přístupy

Správce a koordinátor upravují úkoly a zóny. Běžný crew člen vidí jen své přiřazené úkoly a provozní zóny. Registrace a kontakty závodníků smí číst/upravovat správce nebo člen s výslovným samostatným právem Registrace; koordinátor ho nemá automaticky. Pouhé právo Registrace neuděluje editaci crew ani odměny. Právo uděluje správce již existujícímu členství. Žádná zpráva nebo pozvánka se sama neposílá.

Zápisy přes operations_write, verzované a idempotentní; audit je neveřejný crew audit. RLS a složené vazby vynucují ročník, archiv brání změnám a odebrání práv brání i opakování dřívějšího requestu. Klient nemá přímé zápisy a lokální demo neslouží jako náhrada serverové chyby.

## Ověřování

Syntetické databázové scénáře pro vlastní/cizí úkol, samostatný grant Registrace, zakázané kontakty/odměny, archiv, cizí ročník, podvržená pole, verze/opakování/revokaci, rozsahy času/mapy a neznámé/nulové peníze. Doménové scénáře pro řazení harmonogramu beze změny pásma, přestupná data, stavy úhrady, whitelist payloadů a chybějící polohu. To není potvrzení skutečných pravidel závodu ani produkčního provozu.

Datový základ ověřen 2026-11-02: 7 PGlite scénářů a10 doménových scénářů, cílený TypeScript prošel. [Evidence](operations-foundation-verification.json). Jde o izolované ověření schématu/modelu, nikoli celkový build dosud rozpracovaného sdíleného rozhraní nebo skutečný provoz.

Správce smí i v archivu odebrat právo Registrace, aniž mění historická data. Samostatný databázový scénář ověřuje zamčení registrací a následné znepřístupnění kontaktů po revokaci.

## Ověřený první průchod aplikací

Navigace Provoz závodu sdílí přihlášení a ročník s crew. Nabízí Úkoly, Harmonogram, Zóny a plán, Moje služba a Registrace podle přístupu. Inline formuláře a guard společně chrání přepnutí pohledu, ročníku, odhlášení a běžný odchod na Partnery. Nové UUID a plný fingerprint brání duplicitě stejného pokusu při retry. Síťová chyba zachová draft, ztráta oprávnění skryje dataset. Archivovanou registraci lze otevřít ke čtení; administrátor může odebrat registrační přístup i v archivu.

147 testů celé aplikace prošlo; z toho66 nových provozních:7 databázových,12 doménových,5 HTTP adaptéru,8 SSR formulářů,16 přehledů,11 jednotkových stavového hooku a7 SSR integračních panelu. Jednotkový hook harness ověřuje asynchronní hranici s řízenými useState/useRef/useEffect a falešným backendem; nepředstírá skutečné React DOM plánování. SSR používá skutečné podkomponenty a zvolený snímek hooku. Prohlížeč je v místním nastavení vypnutý; nový interaktivní/visual/mobile E2E průchod není ověřený. Skutečný Supabase provoz a reálné role/OAuth také ne.
