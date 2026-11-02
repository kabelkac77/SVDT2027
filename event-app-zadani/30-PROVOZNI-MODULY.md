# Úkoly, harmonogram, závodníci, zóny a provozní pohled

Stav: datový základ a doménový model implementované, bez aplikace na skutečný server. Adapter, rozhraní a provozní aktivace čekají na navazující kroky.

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

Datový základ ověřen 2026-11-02: 6 PGlite scénářů a10 doménových scénářů, cílený TypeScript prošel. [Evidence](operations-foundation-verification.json). Jde o izolované ověření schématu/modelu, nikoli celkový build dosud rozpracovaného sdíleného rozhraní nebo skutečný provoz.
