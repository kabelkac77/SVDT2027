# Sdílený provoz — konkrétní akceptace a přechod

Příprava navazuje na31/32/33. Níže jsou technické podmínky budoucí aktivace, nikoli udělené role, nasazení nebo schválení importu. Použít schválený commit a izolované cílové prostředí. Kontakty, účtová UUID, konkrétní výsledky a zálohy uchovávat soukromě. Žádné automatické pozvánky/zprávy.

## Jeden zdroj zápisu v každé fázi

| Fáze | Pracovní zápisy | Co lze číst jinde | Brána přechodu |
| --- | --- | --- | --- |
| Nyní | Dosavadní místní SQLite2027 | Neměnné snapshoty a historie | Žádný automatický cloudový import |
| Náhled převodu | Stále pouze místní SQLite | Soukromý náhled konkrétního snapshotu | Potvrzené identity/skupiny, všechna původní pole a historie, oprávnění/cíl |
| Příprava převodu | Předem domluvené krátké okno bez zápisů | Nový konzistentní snapshot + ověřená obnova | Schválená additive migrace/provenance, konečný rozdílový náhled bez ztráty |
| Sdílený provoz | Potvrzený Supabase ročník | Uzavřený původní snapshot pouze readonly | Kontroly níže, hosting/Auth, doložená úplná vzdálená záloha |
| Porucha po přechodu | Řízeně zastavit zápisy, zachovat důkazy | Poslední ověřená data a snapshoty | Diagnostika a odsouhlasená obnova/reconciliation |

Po zahájení sdílených zápisů nepřepnout automaticky zpět na starou lokální SQLite: vznikly by dvě rozdílné evidence. Návrat předchozí verze aplikace smí pracovat pouze s kompatibilním schématem a stejnou potvrzenou databází. Neřešit rollback mazáním migrací/historie nebo přepsáním pracovní DB. Souběh před/po snapshotu vyřešit novým konzistentním náhledem, nikoli importem zastaralého souboru.

## Minimální živá matice rolí

Použít oddělené připravené účty a skutečné user JWT, nikoli service_role v prohlížeči. Každý zákaz ověřit také přes příslušný endpoint/RPC, ne pouze skrytou navigací. Testovat v izolovaném ročníku s fiktivními řádky; žádné zkoušení změn na skutečných domluvách.

| Scénář | Očekávaný výsledek |
| --- | --- |
| Bez přihlášení / Auth účet bez členství | Žádná crew/provozní evidence; žádný fallback na demo nebo tichý default grant |
| Partnerský čtenář bez crew role | Partnerská role sama nepřidělí crew; zděděný správce ročníku se kontroluje zvlášť |
| ČlenA, jeho přiřazený roster | Jen jeho přiřazení a povolený provozní kontext, readonly; žádné cizí kontakty/odměny/audit/registrace |
| ČlenA zkouší identitu/ročník členaB | Server odmítne cizí řádky i podvrženou vazbu/autora, nevrátí cached cizí odpověď |
| Koordinátor bez finančního grantu | Provozní editace vlastního ročníku, žádné odměny/jejich audit nebo správa členství |
| Výslovně finančně oprávněný koordinátor | Oddělené odměny ve svém ročníku, žádná automatická správa členství nebo celý rozpočet jiného modulu |
| Crew správce | Správa crew a existujících členství podle serveru; účet se nevytváří automaticky z telefonu/jména |
| Registrace | Samostatně přidělený grant; provozní či finanční role sama registrace neodemkne |
| Odebraná role nebo finanční grant | Nový read/write i opakování starého requestu znovu ověří právo; UI skryje dříve načtená citlivá data |
| Archiv ročníku | Provozní a finanční data readonly, správce může odebrat přístup; historie se nepřepisuje |

Konkrétní Vojta/Vlasta/další účty a rozsahy zůstávají k pozdějšímu potvrzení. Celý rozpočet není totéž co crew odměny nebo partnerova domluva. Nic se neuděluje automaticky podle jména v minulém Excelu.

## Souběh, přihlášení a běžné chyby

- Dvě přihlášení upraví tentýž syntetický řádek: novější serverová verze nesmí být přepsaná starým draftem; konflikt zůstává řešitelný bez ztráty rozepsaných hodnot.
- Nejistá odpověď po zápisu: opakování stejného requestu a stejného těla nezpůsobí druhý zápis; změněné tělo nesmí sdílet identitu requestu. Audit má skutečný Auth účet.
- Přepnutí sekce/ročníku, Obnovit, odhlášení a zavření stránky respektuje rozepsané údaje; potvrzený discard nezanechá draft v jiné identitě. Token refresh stejného účtu není automatické zahození práce.
- OAuth návrat na /crew, zrušení přihlášení, expirovaná session, přístup odebraný během otevřené obrazovky a druhý účet nezobrazí data předchozí identity.
- Nedostupná služba, chybějící migrace nebo grant vrátí bezpečný stav bez osobních údajů v chybě, bez resetu skutečné evidence a bez přepnutí do dema.
- Desktop/mobil, klávesnice, detaily pod řádkem, sbalené kategorie, PÁ/SO, čitelnost odměn pro oprávněné a úzký displej projdou skutečným prohlížečem. SSR/fixture testy toto nenahrazují; browser ověření nyní neproběhlo.

## Zálohy před aktivací

Vzdálený vykonavatel musí mít všech šest aktuálních inventářů a zdrojový commit. Dokud je SQLite na tomto Macu živý pracovní zdroj, server běžící mimo něj nesmí vydávat starou kopii za aktuální. Pro provoz nezávislý na vypnutém Macu je potřeba dokončený přechod autoritativních zápisů do sdílené DB nebo jiný doložený přenos aktuálních snapshotů. Uzavřený historický SQLite snímek lze po přechodu držet readonly vzdáleně; jeho původ a datum uzavření musí být v obnovovacím inventáři.

Storage autorita vzniká z odděleného skutečně oprávněného inventáře v potvrzeném konzistentním okně, ne z téhož RLS seznamu. Při aktivační zkoušce ověřit konkrétní schéma exportu, přesnost časových identit, úplnost rolí/schémat a nepodporované verzované/archivované zdroje. Neznámé globální role, Auth/OAuth konfigurace nebo chybějící soukromé vstupy nesmějí zmizet z obnovovacího plánu.

Nezávislé vzdálené stažení musí odpovídat nové šifrované kopii. Obnovovací klíč musí být dostupný po ztrátě Macu i cílového zařízení. Následuje izolovaná skutečná obnova SQLite, PostgreSQL/Auth a Storage vazeb/bajtů, funkční průchod dvěma účty a ověření plánovaného i zmeškaného běhu. Retence musí zachovat poslední obnovitelný bod. Teprve doložený výsledek dovoluje označit zálohy za aktivní.

## Záznam výsledku později

Soukromý protokol musí uvést schválený commit/migrace, potvrzený projekt/ročník, snapshot a hash importního náhledu, rozhodnutí mapování, účet provádějící krok, časové okno, jednotlivé povolené i zakázané scénáře, důkaz vzdálené obnovy a stav otevřených výjimek. Záznam nesmí obsahovat hesla/tokeny. Tento dokument žádný z těchto kroků sám neprovádí.
