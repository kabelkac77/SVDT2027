# Crew — historie pod řádkem a ověření

2026-11-28, přímá implementace Codexem dle uživatele/22/AGENTS, rozsah44 s existujícími RPC40. Base585a3f7b7ec76ba95bebe2c673d0145f65ed3ab2, větev codex/crew-inline-history. [Strojová evidence](crew-inline-history-verification.json).

## Co je implementované

Ve sdílené aplikaci má uložený člověk/skupina správce2027 pod stejným řádkem vlastní sbalenou část „Původ a historie“. Otevření editoru samo žádnou historii nenačítá. Rozbalení načte jen metadata konkrétního rosteru/ročníku. Obsah vyžaduje explicitní „Zobrazit podklad“, i pokud existuje jediný zdroj. Datum zachycení a pořadí rozlišují zdroje, nevymýšlí se název sešitu nebo autor ze UUID. Vybraný zdroj je označen borderem ve stávající značce a aria-pressed.

Původní pracovní2027 je jasně oddělený od dnešního editoru a od navázané historie2026. Chybějící podklady a chybějící historická vazba jsou různé stavy. Historie2025 se neodvozuje. Všechny původní sloupce včetně neznámých zůstávají pod původními názvy; content string se neparsuje/nepřepisuje a má sbalitelný původní text. NULL/0/false/prázdný string/blob se nezaměňují. Objekty/pole jsou pouze JSON text, HTML/odkazy/Markdown/instrukce pouze escapovaný text. Nadměrně hluboké neočekávané JSON se bezpečně odmítne, neprezentuje jako částečný výsledek.

Komponenta nepřebírá žádné údaje, nemá write RPC, nenastavuje účast/odměnu a nemění současná pravidla rozepsaného formuláře. Žádná historie v demo/místním prototypu, u neuloženého řádku nebo jiného ročníku. Koordinátor s finance grantem, člen a viewer historii neodemknou. Správce archivu2027 ji může číst; server kontroluje scope při každém RPC. Osm SQL migrací a jejich oprávnění beze změny.

## Soukromí, stavy a souběhy

Typed read adapter vyžaduje canonical ID, přesný envelope, maximálně1000 index položek, jedinečné package ID a konzistentní metadata/ročník/roster/package/hash/format/autor/čas. Detail musí odpovídat explicitně zvolenému indexu, původnímu pracovnímu ID2027 a jeho přesné nullable vazbě2026. Cizí/neúplná odpověď je bezpečná chyba, ne jiný člověk nebo prázdný úspěch. HTTP401/403 i neúplná serverová chybová těla vedou do denial kategorie, bez echo soukromých hodnot.

Index a detail mají oddělené loading/error/empty stavy. Při výběru nového zdroje starý obsah ihned zmizí. AbortController doplňuje nezávislá generace; platnost kontextu je dána user/edition/roster klíčem komponenty a generací. Zavření/unmount/změna účtu/řádku/ročníku odstraňuje obsah a zneplatní pozdní odpověď. Browser test transportu, který ignoruje AbortSignal, prokázal nezávislost této ochrany. Stejný uživatel po token refresh není jiný účet, po novém otevření se znovu volá server. Okamžitá revokace bez dalšího volání se neslibuje.

Nedostupnost RPC/služby a limit jsou explicitní chyby bez raw serverových detailů; žádný fallback na demo/SQLite/cache a žádné automatické stránkování celé soukromé historie. Historická data se neukládají do localStorage/sessionStorage/IndexedDB/URL/query cache/logů/telemetrie. Běžná Auth session aplikace je oddělená a její existující persistence se nemění. Test kontroluje soukromý marker v obsahových úložištích, i když vývojový Next sám vytváří nesouvisející debug IndexedDB.

Mobilní detail se zalamuje uvnitř tabulky, dlouhé hodnoty mají vlastní posun/omezenou výšku, původní klíče neztrácejí velikost písmen. Zachované SVDT tokeny a Exo, žádný redesign. Ovládací prvky type=button nikdy neodesílají editor, klávesnice má aria-expanded/controls/pressed a viditelný fokus. „Zavřít historii“ vrátí fokus na její toggle a ponechá rozepsaný editor.

## Skutečně provedené ověření

- 293 app/DB testů prošlo:12 nových unit/adapter/SSR (5payload,4HTTP adapter,3role/nový řádek/archiv), v celé sadě také13 původních history DB scénářů.
- 12 syntetických browser scénářů HUI01–12 prošlo na lokálním Chrome: žádný prefetch, explicitní výběr/dva zdroje/empty stavy, odpovědi v opačném pořadí i při ignorovaném abortu, změna řádku/ročníku/účtu přes druhé okno, logout a další denied call, role/archiv/jiný rok, literal HTML/unknown columns a soukromí, síť/missing RPC/limit/scope, rozepsaný editor390px a fokus bez jediného write.
- TypeScript/build prošly. Vizuálně zkontrolované soukromé syntetické desktop/mobil náhledy; na finální zvýraznění/kontrast zopakované2 příslušné scénáře, žádné skutečné screenshoty nebo osobní podklady.
- CI přidává instalaci Chromium a samostatnou12case sadu přes playwright.crew-history.config.ts na port4328, bez opakovaného použití cizího serveru, s fiktivní Supabase adresou a WhatsApp vypnutým. Žádné trace/video/automatické screenshoty v běžném běhu, ruční QA screenshoty pouze explicitně pro syntetické testy.
- Všech8 migračních SHA zachováno. Python313 a skutečné PG export/expirace/dump/restore z58/55 jsou baseline, v tomto UI bloku se znovu nepřipojovaly. Žádný live user JWT/OAuth/project nebo skutečný personál.

```sh
cd event-app
npm run typecheck
npm test
npx playwright test -c playwright.crew-history.config.ts
npm run build
```

## Rozlišení syntetické a živé akceptace

Každý HUI01–12 je synteticky browserově prošlý, **živá část se skutečnými oddělenými účty/JWT/RLS v potvrzeném projektu je stále NEPROVEDENO**. Mock HTTP403 nedokazuje skutečné doručení tokenu; PGlite Auth používá syntetickou identitu. Žádný lokální důkaz neaktivuje projekt/import, nedává nový grant nebo nevytváří účty. Serverová původní40 pravidla se nemění. Finální copy/umístění/UI a společný desktop/mobil průchod jsou pracovní návrh k pozdějšímu potvrzení, ne potvrzení mlčením.

## Backlog a odložené potvrzení

Další neblokovaná práce: syntetická browser akceptace stávajících modulů30 (Moje služba, úkoly/harmonogram, registrace, zóny/mapa), zejména scope/role/archiv/rozepsaná práce. Nezavádět bez podkladů nové business volby z41/42 (např. samoobslužný příchod/dokončení).

Později31/45: UX texty/umístění/desktop-mobil, review Draft55–59, skutečné HUI účty/JWT/RLS a politika průběžné reautorizace dlouho otevřeného pohledu. Dále potvrzený projekt/DB/TLS/privátní exporty/OAuth/Storage/provider, aplikovaná8. migrace, úplná vzdálená záloha/klíč/obnova a výslovná aktivace. Přístupy nyní nevyžadované, nic není považované za souhlas. Žádný skutečný import/DDL/grant/deploy/merge nebo Claude auth/model/usage;4 dřívější temporaries54 se nemažou.
