# Příprava sdíleného provozu bez změny dat

Aktivace zůstává odložená podle31. Nový read-only diagnostický balíček je příprava pro operátora se skutečným přístupem, nikoli produkční migrace nebo přidělení oprávnění. Nic se nepovažuje za potvrzené tím, že existuje tabulka stejného jména.

## Postup

1. Ověřit správný projekt a jeho dostupnost, skutečný přístup operátora a evidovat přesný schválený Git commit. Veřejný klient nestačí pro DDL nebo dump.
2. Spustit pouze supabase/preflight-readonly.sql na potvrzeném projektu. Skript je transakce READ ONLY a dotazuje jen systémové katalogy: existenci očekávaných tabulek/RPC, RLS a základní role. Nečte jména, kontakty, úhrady nebo reálné řádky. Výsledek zůstává soukromý.
3. Porovnat zjištěný stav a schválený migrační inventář. Existující ručně aplikované migrace neopakovat podle pouhé absence záznamu v migrační historii. Presence/RLS/execute právo nejsou důkaz správného těla funkce nebo živého vícero účtů.
4. Před DDL vytvořit a izolovaně obnovit skutečnou zálohu stávající DB a příloh. Pending crew/operations migrace aplikovat až v potvrzeném prostředí podle zjištěného stavu a schváleného plánu.
5. Určit existující UUID účtů a samostatné crew/finance/registrace granty. Vlasta nemá automaticky potvrzený celý rozpočet jen podle jména nebo role. Neodesílat pozvánky/zprávy.
6. Připravit soukromý náhled importu místního SQLite se všemi sloupci/historií. Dokud není odsouhlasené mapování identit/skupin a vazeb, SQLite zůstává pracovní zdroj a nic se hromadně neslučuje nebo nepřepisuje.
7. Teprve poté nasadit schválený commit, HTTPS a správné OAuth návraty, ověřit alespoň dva účty a zákazy přístupů, souběh a obnovu. Prohlížečové/živé ověření nelze nahradit katalogovým skriptem.

## Potřebné od uživatele později

Správný projekt/přístup operátora, konkrétní účty a rozsahy, provozní cíl a granty, soukromé mapování importu a skutečný společný průchod. Tyto věci se nyní pouze evidují; nejsou podmínkou nezávislé práce na obecném kódu/testech. Read-only skript se v tomto kroku nespouští na skutečném projektu.

## Ověření2026-11-04

Katalogový skript prošel3 PGlite scénáři: chybějící schema, celá syntetická aplikace a neprivilegovaná authenticated role. Nezobrazil soukromé sentinelové řádky a nezměnil data ani roli. Očekává24 tabulek a8 RPC signatur; přítomnost není důkaz aplikované migrace. Inventář4 migračních souborů je v shared-deployment-plan.json a obsahuje SHA256 a zakázané autoApply.

Diagnostika aktuální místní konfigurace: veřejný HTTPS klient existuje, projektová DNS adresa se stále nepřekládá; pg_dump/pg_restore nejsou v runtime PATH. Na skutečném serveru se nic nespouštělo. Nativní Claude Pro je přihlášený, ověřeno ve stejném oprávněném kontextu jako runner; výsledek auth status z omezeného sandboxu byl zavádějící a není důvodem vyžadovat od uživatele nové přihlášení.

## Konkrétní akceptace a přechod

Matice rolí, negativní víceúčtové scénáře, souběh, OAuth/ochrana draftu, jediný autoritativní zdroj zápisu a postup při poruše jsou v [34](34-SDILENY-PROVOZ-AKCEPTACE.md). Aktuální soukromý náhled převodu podle33 je příprava; provenance model, mapování/cílové UUID a skutečný import zůstávají otevřené. Žádná živá akceptace nebo grant tímto zápisem neproběhly.

## Rozšíření2026-11-05 — zdroje převodu

Aktuální katalogový preflight očekává26tabulek a12funkcí;3interní transferfunkce musí mít execute zakázané pro public/anon/authenticated. Inventář má5migrací se SHA256 a autoApply:false. Nová35 se na skutečný projekt neaplikovala. Před snapshotem/převodem ověřit skutečný stav: dosud nenasazené tabulky nesmějí být mylně požadované v předmigračním dumpu. Po skutečné aktivaci musí být v úplném dumpu a obnovené s oprávněními/vazbami. Porovnání36 je readonly příprava nad explicitním kompletním exportem, nikoli API pro import.

## Aktuální návaznost2026-11-27

Aktuální inventář má7 migrací,26 aplikačních a4 platformní katalogové tabulky a27 kontrolovaných funkcí. Starší počty i diagnostika2026-11-04 výše jsou historický záznam, nikoli dnešní stav připojení. Tento nezávislý blok živé přístupy ani nativní přihlášení znovu nezkoušel. Vyplnitelný soukromý provozní protokol a pořadí důkazů jsou v [45](45-PREDPROVOZNI-PROTOKOL.md); žádná živá brána tím není splněná.

## 2026-11-28 —8. migrace a kontrola těla importeru

Inventář nyní obsahuje8 additive migrací s autoApply:false. [55](55-CREW-OPRAVA-EXPIRACE-A-OVERENI.md) opravuje61 při zachování původní signatury; read-only katalog30 relací/27 funkcí sám nerozliší staré a opravené tělo. Před aktivací navíc doložit skutečnou migrační historii a shodu prosrc SHA/config/owner/ACL plus předepsanou akceptaci. Nová brána crew_import_expiry_after_lock_acceptance nevykonává SQL automaticky. Živý target zůstává unknown a žádné DDL/grant/import se zde nespustilo.
