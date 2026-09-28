# Finance — dodaný rozpočet a pravidla převodu

Načteno 2026-09-28. Zdroj: [NESDILET-SVDT26_rozpocet-20251211.xlsx](https://docs.google.com/spreadsheets/d/1zslqaib9z-EGycx-sOFiG66jy2Mwl0bi/edit). Jde o uložený XLSX otevřený přes Google Sheets. Poslední změna hlášená Drive: 2026-09-17. SHA-256 stažené kopie: `2b0dfa6a95c1aa1d0182a0c1ccf011a753d605bac3530418524340d791f66a9b`.

Zdroj byl pouze čten. Soukromé částky, kontakty a osobní vyrovnání se nekopírují do Git ani do dema. Lokální výpis všech neprázdných buněk včetně vzorců a uložených výsledků je v ignorovaném `.local/finance-source.json`. Tento výpis není živé napojení na Drive.

## Mapa všech šesti listů

| List | Oblast s obsahem | Význam pro aplikaci |
| --- | --- | --- |
| `predpokl-naklady-2026` | B1:K272; hlavička B6:K6, náklady B7:K260, celkem E262 | Položky, množství, jednotková/celková cena, volný text DPH, odpovědná osoba, potvrzení, úhrada, dotační a další poznámky. Název listu říká předpoklad, záhlaví reálný rozpočet; uvnitř zůstávají odhady. |
| `naklady-Znamen-2026` | A1:H26 | Detail broadcastingu. Součet E26 je již zastoupen položkou hlavního rozpočtu E26; nelze přičíst oba. |
| `zisk-2026` | B1:E50 | Přehled příjmů: startovné, partneři, tombola, bary/merch, vstupné, terminály/QR. Navzdory názvu není celý list čistým ziskem. |
| `STARE-partneri-2025` | B1:U135 | Historie partnerů, sloupce 2025/2024/2023; záhlaví přitom zmiňuje 2026. Neurčuje potvrzené příjmy ani partnerství 2027. |
| `vyuctovani-2026` | B1:I91 | B6:D14 výsledek z nákladů/příjmů; B22:I58 fakturace; B63:E91 likvidita, korekce a vyrovnání pořadatelů. Jde o různé přehledy, nikoliv další příjmové řádky k přičtení. |
| `Afterparty-2026` | B1:K30 | Oddělené náklady a příjmy afterparty. Některé popisy výslovně odkazují na zahrnutí v hlavním rozpočtu. |

Prohlédnuty byly uložené hodnoty i vzorce všech listů; v uložených výsledcích nebyly buňky typu Excel error. To nepotvrzuje věcnou správnost ani aktuální přepočet v Excelu. Původní sešit nebyl přepočítáván ani opravován.

## Zjištění, která ovlivňují datový model

- `Potvrzeno` a `Zaplaceno` jsou dvě různé skutečnosti. Záznamy obsahují zálohy, částečné úhrady, osobní platby, barter i neznámý způsob platby.
- `vyuctovani-2026!G41:I41` obsahuje částku dokladu, datum a poznámku o jen částečné úhradě. Samotné datum proto nepotvrzuje zaplacení celé částky.
- `predpokl-naklady-2026!B203:K231` rozlišuje výdaj osobou a jeho proplacení. Úhrada dodavateli není automaticky vyrovnáním vůči osobě.
- Sloupec DPH obsahuje kromě daňového popisu také způsob úhrady, hodinové sazby nebo poznámky. Nelze jej automaticky převést na sazbu DPH; chybějící sazbu nedopočítáváme.
- `vyuctovani-2026!D23:D53` obsahuje VS i textové stavy. Identifikátor dokladu a platební stav musí mít samostatná pole; VS uchovávat jako text.
- Náklady mohou mít ručně stanovený celek odlišný od množství × sazby. Zachovat obě hodnoty a původní vzorec, rozdíl předat ke kontrole.
- Souhrn `zisk-2026!B48` vynechává terminály na řádku 45, zatímco celkové E50 je zahrnuje. Pro import se nesmí míchat dílčí souhrny a jejich detaily.
- `vyuctovani-2026!G58` je textový součet; příjmy v `zisk-2026!E50` jsou jiný přehled. Bez sjednocení rozsahu nejsou zaměnitelné.
- Afterparty má překryvy s hlavním rozpočtem (`Afterparty-2026!B11:E13`) a příjmy jsou částečně zachycené i v hlavním přehledu (`zisk-2026!E14`, `E46`). Před konsolidací je nutná kontrola jednotlivých vazeb.
- `vyuctovani-2026!B66:C66` výslovně zachycuje jinou akci (Piknik). Oddělení akcí nemůže vycházet pouze z názvu sešitu.
- V sešitu jsou dotace i barter. Barter a přesuny peněz mezi vlastními účty/osobami nesmějí uměle navyšovat peněžní příjmy ani výdaje akce.

## Pravidla převodu

1. Import má nejdříve soukromou frontu ke kontrole se zdrojem list/řádek/buňka/hash. Původní popisy, poznámky a vzorce zachovat.
2. Rozpočet 2026 slouží jako historický podklad a šablona struktury. Do 2027 nepřenášet automaticky potvrzení, platby, splatnosti ani závazky.
3. Každá položka má ročník a rozlišení hlavní akce / afterparty / nerozděleno. Jiná akce se přidělí vlastnímu Event/Edition; neurčité a sdílené položky čekají na ruční rozdělení.
4. Detail a jeho souhrn se zaúčtují do eventového přehledu právě jednou. Souhrn může zůstat kontrolním údajem nebo odkazem na detail.
5. Plán, aktuální potvrzená částka, úhrady a osobní vyrovnání jsou samostatné veličiny. Neznámé hodnoty nejsou nuly. Text „uhrazeno“ bez spolehlivé částky/data je zdrojové tvrzení k ověření, nikoli vymyšlený bankovní pohyb.
6. Vazba na partnera/dodavatele/osobu se potvrzuje přes identitu; názvová podobnost pouze nabídne kandidáta. Potvrzený partner automaticky nevytváří finanční příjem.

## Otevřené body před ostrým importem

- Rozdělení společných položek hlavní akce/afterparty/Piknik a identifikace souhrnů již obsažených jinde.
- Které odhady a poznámky byly finálně vypořádány; přesné částky a data částečných úhrad.
- Které osobní výdaje již byly proplaceny a jak se mají oddělit od rozdělení výsledku pořadatelům.
- Rozsah finančních oprávnění nad rámec adminů Vojty/Vlasty. Role v Partnerech sama o sobě nedává přístup k Financím.

Načtení podkladu je dokončené. Navazující lokální demo a jeho UI jsou popsány v `11-FINANCE-MODEL-A-FLOW.md`. Finanční migrace a ostrý import zatím nejsou implementované.
