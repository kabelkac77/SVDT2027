# Navazující implementace po personálním přehledu

Potvrzený rozsah 2026-11-02. Aktuální zdroje, původní práce a skutečná personální evidence zůstávají zachované. Každý celek oddělit jako implementovaný kód, syntetické ověření, místní aktivaci a skutečný sdílený provoz. Tento seznam není prohlášení hotové produkce.

## Pořadí

1. **Souhrny kategorií** — zadání 25, issue #22; stavy filtrovaných uložených záznamů i při sbalení, bez ztráty PÁ/SO, historie a formuláře.
2. **Obsazení rolí** — volitelně zadaný požadovaný počet/termín a porovnání s potvrzenými přiřazeními. Bez cílového počtu zobrazit 'Neurčeno', nikoli 0 nebo hotovo. Nesměšovat osobu, skupinový řádek, přiřazení a směnu. Skutečné cíle a nejasné identity zůstávají ruční kontrolou.
3. **Sdílená crew, účty/oprávnění** — navázat na existující ročníky, členství a Supabase Auth; oddělit obecné kontakty, přiřazení pro ročník a soukromé odměny. Přístup rozhoduje databáze. Admin, koordinátor a běžný člen dostanou minimální funkční role a ověřené omezení ročníku; konkrétní lidé/granty se bez identity neodhadují. Žádný tichý přechod do dema, ověřit konflikty, audit, historii, importní náhled a zachování místní evidence. Neoznačovat PGlite/mock test za skutečné přihlášení jiného člověka.
4. **Úplné zálohy mimo počítač** — zdroje, databáze, soukromé přílohy a čitelné exporty v ověřitelném balíčku, manifest, integrita, obnova do nového cíle, hlášení selhání. Využít dříve zvolený neveřejný cíl dle místního provozního záznamu; přístupy a cesta nepatří do veřejného zadání. Před aktivací doložit rozsah, skutečně dostupný cíl a bezpečné uchování. Lokální kopie v synchronizované složce sama neprokazuje uložení mimo zařízení. Neprohlašovat místní SQLite snímek za zálohu celého Supabase a příloh.
5. **Úkoly a harmonogram** — ročníkové úkoly, odpovědnost, termín a stav, seznam/denní harmonogram, vazba na zónu/crew; prosté poloruční odbavení, ne povinný robustní schvalovací systém.
6. **Registrace závodníků** — ročníková registrace a kategorie, stav podkladů a ručně evidované úhrady; schválená pravidla/kapacity/kategorie a skutečný import budou samostatně potvrzené. Žádné automatické platby nebo rozesílání.
7. **Zóny a mapa** — správa zón, místa práce, odpovědné osoby, vazby na úkoly a souřadnice, přehledná mapová vrstva. Podklad/copyright a skutečné souřadnice se neodhadují; žádné automatické sledování lidí.
8. **Provozní mobilní pohled** — stejná aplikace, rolem určený pohled: kam/kdy přijít, práce, kontakt na vedoucího, mapa/instrukce, problémy. Způsob potvrzení příchodu/hotovosti dosud otevřený; nezaměňovat lokální náhled za offline synchronizaci.

## Práce bez průběžných dotazů

Připravovat malé modelové implementace přes místní Claude a nezávislé testy/review Codex. Nejprve dokončit předcházející celek. Pokud některý skutečný přístup nebo provozní volba chybí, zapsat přesnou návaznost do backlogu a pokračovat nezávislou částí. Neobcházet účtový guard, nezařazovat skutečná data do modelového kontextu a nezveřejňovat je. Konkrétní nasazení, individuální granty a nevratný import musí mít konkrétní kontrolovatelný výsledek a odpovídající oprávnění.

## Pozdější ruční průchod

- Identity/skupiny a skutečné požadované role/počty/termíny.
- Účty a konkrétní viditelnost finančních/kontaktních údajů.
- Cíl hostingu, služeb a ověření vzdálené zálohy/obnovy, retence a uchování klíče.
- Pravidla kategorií/kapacit/registrací a význam úhrady.
- Mapový podklad, zóny a skutečné polohy.
- Kdo potvrzuje příchod, hotovou práci a eskalaci problémů.
