# SVDT APP — hrubá architektura

## Princip
Jedno centrální datové jádro a nad ním různé pohledy:
- interní management,
- Crew Portal,
- Rider Portal,
- Partner Portal,
- Media Portal,
- divácká část,
- veřejný web,
- budoucí broadcast/timekeeping API.

Jeden údaj se zadává jednou a podle oprávnění se zobrazuje tam, kde je potřeba.

## Datová hierarchie
### Event / projekt
Např. Svatohorský Downtown Příbram.

### Edition / ročník
Např. SVDT 2027. Ročník je hlavní kontejner provozních dat. Po skončení se archivuje. Do nového roku lze kopírovat strukturu, role, zóny a šablony, nikoli staré incidenty či zaplacené faktury.

### Centrální entity napříč ročníky
- Person
- Organization / Partner
- Supplier
- Rider
- Asset / Equipment
- Document

Konkrétní role, účasti, partnerství, finance atd. jsou ročníkové vazby.

## Hlavní objekty/moduly
1. Event + Edition
2. People / Personnel
3. Roles + Organization
4. Partners
5. Finance
6. Suppliers
7. Riders + Registration
8. Zones
9. Map
10. Tasks / Checklists
11. Schedule / Programme
12. Crew Base / Accreditation
13. Radio Plan
14. Race Control / Operational Log
15. Incidents jako strukturované záznamy v provozním logu
16. Documents / Assets
17. Media Plan
18. Branding
19. Build Plan / Track Construction
20. Year-round Work Sessions / Brigády
21. Notifications / Communications
22. Permissions / Access
23. Audit Log
24. Knowledge Base / Lessons Learned
25. Feedback
26. AI Copilot jako nekritická nadstavba

## Personál
Centrální databáze všech lidí z minulých i budoucích ročníků.

Pro konkrétní ročník:
- role,
- zóna,
- nadřízený,
- čas nástupu,
- směna,
- radio ID,
- odměna,
- check-in/out,
- skutečné hodiny,
- účast potvrzena/nepotvrzena.

Historie člověka se zachovává napříč ročníky.

### Crew Portal
Každý vidí zejména:
- kdy má přijít,
- kam,
- co dělá,
- komu se hlásí,
- mapu,
- kontakt,
- instrukce,
- dokumenty,
- důležité zprávy,
- odměnu,
- check-in.

Systém eviduje, zda člověk účast potvrdil a zda četl důležité instrukce.

### Crew Shop
Napojení na e-shop. Crew může nakoupit merch se zvýhodněním (např. 30 % sleva) a po potvrzení se částka může odečíst z odměny. Musí vzniknout transparentní záznam pro finance a sklad/e-shop.

## Partners — interní modul
Držet jednoduchý.

U partnera:
- owner,
- stav: osloven / potvrzen / zamítnut,
- obecná interní poznámka,
- datum dalšího kroku/kontaktu.

Po potvrzení partnera se aktivují ročníkové údaje, plnění, finance a Partner Portal.

## Partner Portal
Partner vidí pouze vlastní data.

Obsah:
- domluvená plnění,
- stav plnění: nesplněno / v řešení / splněno,
- důkaz plnění: odkaz, foto, dokument,
- VIP QR vstupenky,
- parkování,
- praktické info,
- harmonogram,
- kontakty,
- formulář partnera: kontaktní osoby, parking, branding, sociální sítě, technické požadavky,
- upload log a podkladů,
- smlouvy určené ke sdílení,
- jejich vystavené faktury + stav,
- po akci report plnění a dosahů,
- feedback.

Partner nikdy nevidí interní poznámky, interní rozpočet ani jiné partnery.

## Finance
První verze bude vycházet z existujícího Excelu.

Základ:
- příjmy / výdaje,
- plán / skutečnost,
- kategorie,
- vazba na partnera/dodavatele/osobu,
- faktura,
- stav platby,
- kdo schválil,
- příloha.

Později:
- Fio API pro import a párování pohybů,
- automatické vs. ruční přiřazení,
- přehled kdo dluží nám / komu dlužíme my.

Není cílem nahrazovat účetnictví.

## Suppliers
Centrální databáze dodavatelů + ročníková účast.

Supplier form před akcí:
- kontaktní osoba,
- kdy přijede,
- vozidlo/vjezd,
- parking,
- doba vykládky,
- elektřina,
- stan,
- potřebná pomoc,
- další technické požadavky.

Externí gastro = supplier. Vlastní bary = interní zóna/objekt.

## Riders + Registration
Centrální databáze riderů z minulých let. Párování podle e-mailu; rider se přihlásí a pouze aktualizuje data.

Ročníková účast:
- kategorie,
- registrace,
- platba,
- licence,
- startovní číslo,
- prezence,
- pořadí/start,
- výsledky.

Budoucí:
- online platba kartou (např. Stripe),
- QR/bankovní převod,
- automatické e-maily,
- API pro timing/broadcast/komentátora,
- rider profil + foto,
- race-day notifikace,
- kolik riderů je před ním,
- aktuální stav závodu.

## Zones
Zóna je univerzální objekt: traťová zóna, start, cíl, VIP, bar, afterparty, kids race, Točírna atd.

Must-have:
- název,
- hranice v mapě,
- manažer,
- personál + rádia,
- vybavení,
- dodavatelé,
- harmonogram,
- úkoly,
- technické požadavky,
- dokumenty/grafika,
- kontakty/instrukce,
- stav připravenosti,
- incidenty/log,
- poznámky pro další rok.

Zóna funguje jako kontejner: otevřu ji a vidím vše relevantní.

## Map — kritická část systému
Mapa je architektonický požadavek č. 1.

Požadavky:
- velmi rychlá na desktopu i mobilu,
- fullscreen,
- kvalitní zoom/pan/search,
- velké množství vrstev, ale logicky seskupených,
- role-based výchozí vrstvy,
- offline cache,
- klik na objekt → detail z databáze,
- jedna hlavní LIVE mapa; ne dvě konkurenční mapy plán/live,
- změny proti plánu pouze označit a detail zobrazit na vyžádání,
- u dat zobrazovat stáří/poslední potvrzení.

Možné vrstvy:
- zóny,
- překážky,
- komisaři,
- IZS,
- broadcast,
- branding,
- partneři,
- elektrika,
- internet,
- parking/vjezdy,
- dodavatelé,
- bary,
- Race Control,
- live crew tracking.

### Tisk map
- export PDF,
- volba formátu, výřezu, měřítka a vrstev,
- vhodné pro fyzické zakreslování v terénu.

### Scan / foto papírové mapy
Uživatel nahraje scan/fotku ručně zakreslených změn. AI navrhne změny do digitální mapy, ale nic se nezapíše bez potvrzení člověkem.

## Live Crew Tracking
Opt-in / podle role a pravidel ochrany soukromí. Prioritně vedení, hlavní manažeři, mobilní týmy a IZS.

Mapa ukazuje:
- pozici,
- roli,
- stáří poslední polohy.

AI může odpovědět např. „kdo je nejblíž překážce 8?“.

## Plan vs Live
Před akcí je app zdroj plánované pravdy. V race day je default vždy aktuální live stav.

Rychlé změny:
- přesunuto,
- zrušeno,
- změna osoby,
- krátká poznámka.

Ideálně hlasem: uživatel změnu nadiktuje → systém ukáže návrh → člověk potvrdí → propíše se všem + audit historie.

## Tasks
Jeden jednoduchý systém:
- název,
- owner,
- deadline,
- stav,
- komentář,
- vazba na zónu/partnera/dokument/dodavatele apod.

V race day minimalizovat workflow.

## Schedule
Jeden centrální časový model a nad ním různé pohledy:
- rider,
- moderátor,
- divák,
- stavba,
- produkce,
- Race Control,
- zóna.

Pokud pro roli není specializovaný pohled, zobrazí se obecný harmonogram.

## Year-round Brigády
Jednoduchý modul:
- datum,
- místo,
- cíl dne,
- kdo může,
- kdo potvrdil,
- kdo dorazil,
- hodiny,
- fotky před/po.

Vazba na projekty/překážky a personální historii.

## Build Plan / Track Construction
Samostatný modul, protože stavba od středy před závodem má kritické návaznosti.

Objekt/stavební úsek:
- vazba na zónu,
- termín,
- owner,
- crew,
- technika,
- jeřáb/manipulátor,
- kontejner,
- materiál,
- závislosti,
- stav včetně BLOCKED.

Potřebujeme jednoduchou časovou osu středa–sobota a mapu. Pokud se zpozdí jeřáb, systém ukáže, které navazující práce blokuje.

## Logistics / Equipment
Zatím velmi jednoduché:
- co,
- kde,
- kdo za to odpovídá,
- případně v jakém autě.

Nedělat nyní těžký skladový systém.

## Media Plan
Seznam toho, co musí být mediálně pokryto:
- zóny,
- partneři,
- důležité momenty,
- program,
- foto/video deliverables.

Každý požadovaný výstup lze přiřadit fotografovi/kameramanovi a následně odškrtnout.

## Media Portal
- press kit,
- tiskové zprávy,
- fotogalerie,
- loga,
- pravidla,
- kontakty,
- akreditace,
- schválené materiály.

## Branding
Vazba partner ↔ plnění ↔ zóna ↔ mapa. Mapová vrstva ukáže, kde má být partner/branding a v jakém rozsahu.

## Documents / Assets
Dokument jako samostatný objekt, který lze připojit k partnerovi, zóně, dodavateli, úkolu, ročníku atd.

Grafické assety: primárně finální/schválené výstupy, aby lidé a portály nebrali pracovní verze.

## Access / Accreditation
Evidovat typy přístupu/pásek:
- partner/VIP,
- crew,
- případně video/media,
- další dle potřeby.

Crew páska může být napojená na evidenci útraty na baru na jméno.

U osob lze volitelně aktivovat:
- ubytování,
- parking,
- vjezd.

## Communications
Interní zprávy/notifikace v appce. Budoucí možnost WhatsApp integrace.

Globální stavový banner:
- závod běží,
- HOLD,
- změna programu,
- krizová informace.

Kritická hlášení mohou spustit push notifikaci.

## Weather
Ne samostatný modul pro všechny, ale chytrá vrstva pro Race Control/Vojtu/Vlastu.

Agregace více zdrojů a zvýrazněné varování při riziku. Konkrétní poskytovatele/API vybrat později.

## Electrical / Infrastructure
Zatím mapová vrstva, ne těžký modul:
- rozvaděče,
- odběrná místa,
- napojení,
- orientační příkony,
- centrály.

## Public / Spectator layer
Veřejná/divácká část má čerpat ze stejného datového jádra jako interní app:
- aktuální program,
- mapa,
- výsledky,
- hlášení,
- počasí/rizika podle potřeby,
- stav závodu.

Stejná ověřená data mohou být publikována i na web.

## Bars / Afterparty
Afterparty = zóna s lidmi, úkoly, rozpočtem a programem.
Bary = interní zóny. Detailní skladové hospodářství zatím neřešit; později lze přidat nákupy/prodeje/pokladny.

## Post-event
Musí existovat fáze po závodě:
- deinstalace,
- úklid/odpady,
- vrácení vybavení,
- uzavření financí,
- partner fulfillment report,
- média/deliverables,
- feedback,
- lessons learned,
- archivace ročníku.

Detaily ještě dopracovat.

## Audit / history
U důležitých změn uchovat kdo/co/kdy změnil. Zásadní pro finance, mapu, race-day změny a přístupy.

## Offline
Aplikace má mít offline režim pro kritické mobilní použití. Konkrétní rozsah offline funkcí se určí v technickém návrhu.

## AI Copilot — 2027 experiment
AI není kritická infrastruktura. Celá akce musí fungovat bez AI.

Možnosti:
- hlasové dotazy,
- hlasové založení incidentu/úkolu,
- strukturování hlášení v Race Control,
- návrh změny v mapě,
- shrnutí „co hoří“,
- readiness kontrola,
- partner fulfillment,
- počasí,
- návrh nejbližšího člověka podle live location,
- lessons learned / paměť ročníků.

Kritické změny vždy potvrzuje člověk. AI pro 2027 testovat jako copilot a podle zkušenosti rozhodnout, co standardizovat pro 2028.

## Technický směr — pracovní
- moderní webová/PWA aplikace,
- jedna codebase,
- React/Next.js jako kandidát,
- PostgreSQL,
- Supabase jako kandidát pro DB/auth/realtime/storage,
- mapové řešení vybrat po prototypu (Mapbox je kandidát),
- API-first,
- AI samostatná vrstva,
- využívat kvalitní hotové služby/API i placené, pokud dávají smysl a náklady jsou rozumné.

## První implementační fáze
1. základ projektu + auth + Event/Edition,
2. **Partners**,
3. **Finance**.

Architektura ale musí už od začátku umožnit přidání všech výše uvedených modulů bez zásadního přepisování datového modelu.


## Další potvrzené architektonické požadavky

### Personál / Crew Portal
Centrální databáze lidí napříč ročníky. Ročníkově role, zóna, nadřízený, směna/nástup, radio ID, odměna, check-in/out a skutečné hodiny. Crew Portal ukazuje kdy/kam/co/komu se hlásím, mapu, instrukce, dokumenty, odměnu a důležité zprávy. Budoucí Crew Shop může odečítat zvýhodněný merch z odměny s transparentním finančním záznamem.

### Riders
Centrální databáze z minulých let, login přes e-mail, aktualizace profilu místo opakovaného vyplňování. Ročníkově registrace, platba, licence, kategorie, číslo, prezence, start, výsledek. Budoucí Stripe/QR/bankovní platby, automatické e-maily, rider notifikace a API pro broadcast/timing.

### Suppliers
Vlastní databáze + formulář: kontakt, příjezd, vozidlo/vjezd, parking, vykládka, elektřina, stan, pomoc, technické požadavky. Externí gastro = supplier; vlastní bary = interní zóna.

### Year-round Brigády
Datum, místo, cíl dne, kdo může/potvrdil/dorazil, hodiny a fotky. Vazba na člověka a projekt/překážku.

### Build Plan
Plnohodnotný jednoduchý modul pro středu–sobotu před závodem: objekt/úsek, zóna, owner, crew, technika, jeřáb/manipulátor, materiál, dependencies a stav včetně BLOCKED. Musí zobrazit dopad zpoždění na navazující práce.

### Tasks
Jeden lehký systém úkolů: owner, deadline, stav, komentář a vazba na libovolný objekt.

### Schedule
Jeden centrální časový model, pohledy podle role: rider, moderátor, divák, stavba, produkce, Race Control, zóna.

### Communications
Interní notifikace; možná WhatsApp integrace. Globální stavový banner (RUNNING/HOLD/změna programu/krize) + push pro kritické zprávy.

### Weather
Chytrá vrstva pro Race Control/Vojtu/Vlastu, agregace více zdrojů a zvýrazněná varování.

### Accreditation
Typy pásek/přístupů: VIP/partner, crew, případně media/video. U crew lze evidovat barovou útratu na jméno. Volitelné ubytování, parking a vjezd.

### Public/Spectator
Veřejná/divácká část a web čerpají stejné ověřené jádro: program, mapa, výsledky, hlášení, stav závodu a relevantní weather/risk info.

### Media Plan
Seznam požadovaných foto/video výstupů navázaný na zóny, program a partner fulfillment; přiřazení konkrétním lidem a kontrola pokrytí.

### Documents / permits
Dokumenty lze nahrávat a vázat na objekty. Povolení/smlouvy/zábory/pojištění mají ownera a termíny/expirace.

### Readiness
Oblasti mohou potvrdit READY vlastníci. Vojta/Vlasta jako admin mohou potvrdit za někoho; audit log uloží autora.

### Offline
Kritické mobilní použití musí mít offline režim; rozsah definovat v technickém návrhu.

### Storage
Synology Drive (~6 TB) je kandidát pro velké mediální/file úložiště; prověřit API. Aplikace minimálně drží metadata, oprávnění, stav a odkazy.
