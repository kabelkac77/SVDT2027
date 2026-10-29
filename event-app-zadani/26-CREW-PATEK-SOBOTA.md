# Časy PÁ a SO v pracovním personálu

2026-10-29. CONFIRMED: uživatel chce přidat do hlavních sloupců personálu PÁ (od–do) a SO (od–do). Tento konkrétní požadavek má přednost před připraveným souhrnem kategorií (25), který zůstává v backlogu.

## Rozsah implementace

Dva nové sloupce mezi Kdo řeší a Domluva; tabulka tedy má osm sloupců. V hlavičce přesné popisky PÁ (od–do), SO (od–do), v řádcích uložené hodnoty. Neznámá/prázdná hodnota je pomlčka. Uživatelsky jednoduché ručně zapisované časové rozmezí: například 08:00–16:00. Žádné přiřazování data, výpočet délky, kontrola směn nebo automatické odvozování z obecného termínu či historie. Dva textové vstupy PÁ (od–do), SO (od–do) v rozbaleném editoru v sekci Člověk a zařazení, blízko obecného termínu. Zápis při obvyklém Uložit změny; uložené hodnoty hned v hlavním řádku. Stávající term zůstává samostatný, nové časy samy nepotvrzují účast.

## Ukládání a kompatibilita

fields.friday a fields.saturday jsou text max 100 znaků, bez NUL; oříznout okolní whitespace stejně jako ostatní texty. Jiné typy a překročení limitu odmítnout 422 bez částečného zápisu. Nezavádět SQL migraci: uložené fields jsou JSON. U starých záznamů doplnit prázdné hodnoty při čtení do vraceného objektu, nikoli přepisem databáze. Nová evidence i nový člověk mají prázdné hodnoty. Žádné kopírování času z minulých ročníků.

Důležité: starší otevřené okno tyto dvě položky neposílá. validate(fields, previous=None) musí pro chybějící friday/saturday uchovat dříve uloženou hodnotu z previous, pro nový záznam použít prázdno. Ostatní povinná pole, odmítání neznámých polí, typy, verze/konflikty a idempotence zachovat. Explicitně poslaný prázdný text smí čas smazat. Žádná mutace vstupního fields/body/previous. save_record předá do validace previous z prior content v téže transakci. V record() se defaulty aplikují pouze na načtenou kopii f. JSON export zachová hodnoty; record.extra doplní dvě položky PÁ (od–do) a SO (od–do), takže existující úplný CSV export zachytí časy bez změny CSV protokolu.

Historii 2025/2026 nikdy nepřepisovat. V historickém řádku zobrazit pomlčku, pokud fields nemá uložené časy; žádné dohady. Původní raw/extra zůstanou kompletní v detailu. Nové sloupce jsou přehledové, žádné inline automatické ukládání nebo další stránka.

## Renderer a vzhled

crew.html colgroup a thead rozšířit na osm sloupců, odpovídající col-friday/col-saturday. Všechny colspan=6 v crew-sheet.js a crew-workspace.js změnit na osm (detaily, kategorie, prázdné stavy, safe-start). V sRow přidat dvě bezpečně escapované buňky sheet-day sheet-friday a sheet-day sheet-saturday, v title celý text, hlavní text při potřebě zkrátit CSS; nerozbít řádkové rozbalení. Číst výhradně r.fields?.friday/saturday, chybějící je prázdné. Na mobilu zachovat původní karty se zřetelnými textovými popisky PÁ / SO u časů; neukazovat osamocené hodnoty bez dne. Desktop rozumně upravit procentní šířky všech osmi sloupců (součet 100), zachovat čitelné kompaktní řádky a pruhy kategorií. Bez vodorovného přetečení celé stránky na 390 px. Exo, tokeny, stavy, hledání, filtry, sbalování, dirty guard, CSV a zálohy zachovat. Nové časy zahrnout do hledání, aby šlo vyhledat zadaný rozsah, bez změny další logiky.

## Předání a ověření

Výsledná změna se omezuje na těchto pět funkčních souborů: event-app/tools/crew_workspace.py; event-app-zadani/wireframes/crew-workspace.js; crew-sheet.js; crew-sheet.css; crew.html. Žádné jiné soubory, žádné soukromé podklady, síť nebo Git. Host připravil nezávislé Python/Node testy a prohlížečový průchod na fiktivních datech: uložení a reload, starší otevřené okno nesmaže časy, explicitní smazání, chybný typ/délka, historie beze změny, konflikty/idempotence, nový řádek, řádkové rozbalení, CSV a mobilní zobrazení.

**IMPLEMENTED / ověřeno 2026-10-29.** První větší předání s pěti úplnými soubory skončilo časovým limitem bez aplikace souborů. Následující samostatný omezený [serverový krok](26a-CREW-CASY-SERVER.md) dokončil Claude; host provedl nezávislé review, integraci UI a testy. 96 Python + 28 Node testů prošlo. Prohlížeč doložil osm sloupců, uložení rozepsaných časů přes restart testovací služby, zobrazení po reloadu, nezávisle parsovaný CSV export a mobilní 390px zobrazení s uloženými hodnotami bez vodorovného přetečení. Aktualizovaná skutečná místní pracovní verze má soukromě ověřený nezměněný obsah celé DB a nový obnovitelný snímek. [Evidence](crew-days-verification.json). Uživatelské posouzení rozložení a případné rozšíření na směny/konkrétní data odložené do backlogu. Skutečné časové domluvy vyplní uživatel, ne automatický import.
