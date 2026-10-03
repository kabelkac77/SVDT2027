# Finance v Supabase — implementační plán

Datum: 2026-10-03. Výchozí Partneři: commit `707d560` na `main`. Source of truth: celý `event-app-zadani/`, zejména `11-FINANCE.md`, `11-FINANCE-MODEL-A-FLOW.md`, `11-FINANCE-PODKLAD.md`, `SPOLUPRACE-A-ZALOHY.md`.

**Stav: návrh k implementaci.** Tento dokument nepřidává finanční SQL ani mění Supabase. Finance dnes fungují pouze na `/demo`. Konkrétní finanční granty, způsob schvalování, produkční migrace, import a spuštění provozu nejsou tímto plánem schválené. Nové důležité závěry jsou současně v `DECISIONS.md`.

## 1. Cíl a hranice

Skutečný modul musí po přihlášení oprávněného člena uložit položku a částečnou úhradu do PostgreSQL, po reloadu je načíst a spočítat shodné zůstatky. Musí oddělit ročníky, finanční oprávnění, plán, potvrzený závazek/pohledávku, vypořádání a tok peněz pořadatele. Bez finančního grantu není přístup ani přes přímé Data API nebo RPC.

V1 postupně zahrne rozpočet, příjmy/výdaje, protistrany, schvalování, bankovní/hotovostní úhrady, osobní výdaje a jejich konkrétní proplacení, barter, opravné operace, evidenci dokladů a kontrolovaný import. Není to účetní systém, tvorba daňových přiznání ani odesílání plateb do banky.

Fio API, automatické bankovní párování, cizí měny, zálohy/přeplatky, vlastní převody mezi účty, účetní integrace, externí portál a offline zápisy jsou další etapy. V1 tyto operace odmítne vysvětlenou chybou; nebude je maskovat jako běžný příjem/výdaj. Nový návrh se nezaměňuje za již fungující demo.

## 2. Výchozí kód a nutné změny

| Dnešní stav | Změna pro skutečný backend |
| --- | --- |
| `src/lib/finance.ts`: lokální `FinanceItem`, `actual`, `Settlement`, `balances`, localStorage | Oddělit typy/validaci/výpočty od demo úložiště; pojmenovat `actual` jako potvrzenou částku. Přidat DB adaptér, serverové zůstatky a explicitní verze. |
| `src/components/finance.tsx`: demo flow a místní historie | Rozlišit demo/skutečnou evidenci, oprávnění a schvalování, zachovat pracovní UI/tokeny; finální redesign není součást backendu. |
| `partners-app.tsx`: Finance se zobrazují pouze v demu | V ostrém režimu načíst dostupné finanční granty; nabídnout modul pouze oprávněnému uživateli a přidat bezpečný přechod Partner ↔ Finance. |
| `backend.ts`: partnerské tabulky a obecný `audit_log` | Finanční loader podle vybraného ročníku, filtru a stránky; oddělené RPC a finanční audit. Nerozšířit dnešní `loadData()` o veškeré finance. |
| `edition_members`: partnerské admin/manager/viewer | Přidat samostatný ročníkový finanční grant; žádné automatické dědění. |
| `audit_log`: vidí každý interní člen ročníku | Finanční obsah ukládat do nové `finance_audit_log`; do partnerského auditu nepřidat částky, faktury, osobní vyrovnání ani granty. |
| Organizace a osoby mají RLS odvozené od Partnerů | Přidat úzké finanční čtecí politiky pro skutečné protistrany/plátce, zachovat partnerské helpery a jejich stávající rozsah. Dodavatele nevytvářet jako falešného partnera. |

Navržené nové soubory: `src/lib/finance-model.ts`, `finance-demo.ts`, `finance-backend.ts`; stávající `finance.ts` dočasně ponechat jako kompatibilní vstup nebo aktualizovat všechny importy společně. Přidat `tests/finance-database.test.ts`, `tests/browser/finance-backend.spec.ts`, později testy importu/dokladů. Nové migrace patří do `event-app/supabase/migrations/` s novým časovým prefixem. Žádnou použitou partnerskou migraci nepřepisovat.

## 3. Datový kontrakt

Všechny provozní tabulky mají UUID, `edition_id`, UTC `timestamptz` a serverový autorův Auth UUID. Obchodní datum/splatnost je `date`; UI pracuje s Europe/Prague. Mutovatelné hlavičky mají `version >= 1`. Ledger, rozhodnutí a audit jsou append-only; opravy vytvoří další záznam.

### Peníze a NULL

- Výhradně CZK a celočíselné haléře (`*_minor bigint`), žádný float. Vstup parsovat z textu, přijmout čárku/tečku a maximálně dvě desetinná místa; nezaokrouhlovat neplatný vstup.
- Plán i potvrzená částka mohou být NULL. NULL znamená neznámo, 0 známou nulu. Demo má plán povinný; backend tento rozdíl vědomě rozšíří a přidá testy.
- Limit jedné částky navržen stejně jako v demu: `0..100000000000` haléřů; pohyb je kladný. SQL `CHECK` i serverové RPC kontrolují limity a měnu.
- API vrací bigint částky a agregace jako desetinné řetězce. Adaptér používá BigInt nebo kontrolovanou konverzi po ověření bezpečného rozsahu; součet mnoha platných položek může překročit rozsah JS Number. Export má zvlášť jednotku i NULL.
- Historické partnerské `cash_amount_czk` je legacy hodnota celých Kč. Není zdrojem nových úhrad; při vědomém převodu do finančního plánu se násobí 100, ověřuje zdroj a nesmí se změnit jednotka starého sloupce.

### Tabulky a vazby

| Tabulka | Konkrétní pole nad společný základ | Integrita a etapa |
| --- | --- | --- |
| `edition_finance_members` | `user_id`, `role` reader/editor/approver/admin, `version`, `granted_by`, `granted_at` | PK `(edition_id,user_id)`; FK na stejné `edition_members`. Účet bez členství ani partnerský admin bez grantu nemá finance. B1. |
| `finance_categories` | `code`, `name`, `direction` income/expense, `active`, `version` | Unikátní edition+code; použitou kategorii jen deaktivovat. Katalog převzít kontrolovaně ze struktury podkladu, nepřidávat skutečné částky do seedu. B1. |
| `finance_counterparties` | `organization_id` XOR `person_id`, `version` | Ročníkový registr protistran; globální profil se neduplikuje. Unikátní edition+organizace / edition+osoba. Organizace může být partner, dodavatel nebo poskytovatel dotace bez PartnerProspect. B1 organizace, B2 osoby a zakládání profilů. |
| `finance_items` | `title`, `direction`, `scope` main/afterparty/unallocated, `category_id`, nullable `counterparty_id`, nullable `partnership_id`, nullable `planned_minor`, nullable `confirmed_minor`, `currency='CZK'`, nullable `due_on`, `note`, `approval_state`, `version`, `created_by`, `updated_by` | `UNIQUE(id,edition_id)`; složené FK kategorií, protistrany a partnerství do stejného ročníku. Vyplněné partnerství musí patřit stejné organizaci jako protistrana. B1. |
| `finance_approvals` | `item_id`, `item_version`, `decision`, `reason`, `actor_id`, `created_at`, snapshot schválených finančních polí | Rozhodnutí vždy svázané s konkrétní verzí; nelze podvrhnout autora ani schválit zastaralý návrh. B1. |
| `finance_settlements` | `item_id`, `kind` money/personal/barter/reimbursement, `amount_minor`, `occurred_on`, nullable `channel` bank/cash, nullable `payer_person_id`, nullable `personal_settlement_id`, nullable `reverses_id`, `reason`, nullable `document_id`, `created_by` | Složené FK do stejného ročníku/položky. Reimbursement odkazuje na přesnou osobní platbu; reversal na původní záznam. Žádný UPDATE/DELETE z prohlížeče. B1 pouze money; B2 ostatní typy; B3 storna. |
| `finance_requests` | `actor_id`, `request_id`, `operation`, `payload_hash`, `result` | Unikátní edition+actor+request; žádost a výsledek součást stejné transakce. Stejné UUID/jiný payload = chyba, opakování stejného payloadu = stejný výsledek. Čtení pouze vlastních žádostí nebo finance admina. B1. |
| `finance_audit_log` | `actor_id`, `entity`, `entity_id`, `action`, `old_data`, `new_data`, `request_id`, `created_at` | Pouze finanční role daného ročníku; klient bez zápisu/mazání. Neuchovávat klíče, podepsané URL ani celý soubor. B1. |
| `finance_documents` | `item_id`, `kind` invoice/receipt/contract/other, `reference`, nullable `issued_on`, nullable `due_on`, nullable `amount_minor`, `currency`, `storage_path`, `mime_type`, `size_bytes`, `sha256`, `state` pending/ready/failed, `version` | Dokument není úhrada ani automatické schválení částky. Metadata a soukromé soubory. B4. |
| `finance_import_batches`, `finance_import_rows` | batch: fingerprint/formát/cílový ročník/stav/autor; row: zdroj list+řádek, původní hodnoty/vzorce/poznámka, klasifikace, mapping, `item_id`, review state | Soukromá data, vlastní RLS/audit a deduplikace podle zdroje. Zkontrolovaný řádek nesmí znovu vytvořit položku. B5. |

Osobní plátce nemusí mít Auth účet: `payer_person_id` je Person, `created_by` je přihlášený autor evidence. To jsou různé identity. V B2 zavést také ročníkový registr `finance_payers(edition_id,person_id)`; osobní pohyb musí odkazovat na jeho existující záznam. Bankovní účty a citlivé platební instrukce případně uložit do samostatné finanční tabulky, nikdy do globálního partnerského kontaktu.

Indexy: finanční granty podle user+edition; items podle edition+direction+scope a edition+due_on, category/counterparty/partnership; settlements podle edition+item a personal_settlement/reverses; audit podle edition+created_at+id; import podle edition+batch+source row. Stránkování má stabilní pořadí (datum+UUID); souhrny se počítají z celé autorizované množiny v DB, nikoli z jedné načtené stránky.

## 4. Oprávnění — navržená matice

Konkrétní osoby se nepřidělují automaticky. Vojta jako finance owner je potvrzený organizační kontext; grant Auth účtu je samostatná provozní operace. Rozsah Vlasty a dalších lidí zůstává OPEN.

| Operace v dostupném ročníku | Bez finančního grantu | reader | editor | approver | admin |
| --- | --- | --- | --- | --- | --- |
| Položky, souhrny, úhrady, finanční audit, ready doklady | Ne | Ano | Ano | Ano | Ano |
| Nový návrh / úprava neschválené položky / odeslání ke schválení | Ne | Ne | Ano | Ano | Ano |
| Schválení/zamítnutí konkrétní verze | Ne | Ne | Ne | Ano | Ano |
| Zápis skutečné úhrady, osobního výdaje, barteru či proplacení | Ne | Ne | Ne | Ano | Ano |
| Opravné storno bez změny reálných peněz | Ne | Ne | Ne | Ano, s důvodem | Ano, s důvodem |
| Granty, katalog kategorií, importní commit | Ne | Ne | Ne | Ne | Ano |
| Jakýkoli provozní zápis do archivu | Ne | Ne | Ne | Ne | Ne |

Editor nemá právo vydávat návrh za schválený závazek nebo přepisovat již zapsanou platbu. Matice je návrh první dodávky, nikoli uživatelem potvrzené kompetence. Samoobslužné podání vlastního výdaje brigádníkem bude oddělená projekce/portal, ne udělení reader přístupu k celému rozpočtu.

Čtení všech nových finančních tabulek vynucuje RLS podle `auth.uid()` a konkrétního edition grantu. Odebrat default granty anon/authenticated, vrátit jen potřebný SELECT a EXECUTE; přímý INSERT/UPDATE/DELETE není povolen. Samotná RLS politika nenahrazuje granty. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

Zápisové RPC mohou být `security definer` jen s explicitní kontrolou role, prázdným `search_path` a plnými názvy schémat; odebrat EXECUTE z PUBLIC/anon a povolit authenticated pouze konkrétní veřejné RPC. Pomocné funkce umístit do neveřejného schématu a nezveřejnit generické privilegované CRUD. [Supabase Database Functions](https://supabase.com/docs/guides/database/functions).

Nepřidávat finanční oprávnění do `require_edition_editor()`; má jiný význam. Nový `require_finance_role()` kontroluje samostatný grant a aktivní ročník. Rozšíření čtení globálních profilů má vlastní politiku a helper; změna `can_read_organization()` by nechtěně rozšířila i partnerskou historii. `save_partner()` zůstává partnerskou operací.

## 5. Schvalování a stav položky

Navržený životní cyklus: **draft → submitted → approved / rejected**. Rejected lze vrátit do draftu a znovu předložit. `cancelled` je uzavření nepoužité položky s důvodem; nelze jím skrýt zůstatky nebo pohyby. Zrušené návrhy nevstupují do aktivního rozpočtu, ale jsou dohledatelné.

- Plán a návrh potvrzené částky lze zapsat před schválením; UI je jasně označí. Souhrn potvrzených závazků zahrnuje jen schválené verze. Neschválené návrhy mají oddělený přehled.
- Schválení vyžaduje známou potvrzenou částku (včetně 0), směr, kategorii, scope, protistranu nebo odůvodnění její absence. Ve V1 nejsou částečná schválení jedné položky.
- Každé rozhodnutí obsahuje skutečného autora, čas a schválený snapshot. Zápis úhrady schválení nemaže; `item_version` v approval uchovává historickou verzi, approval state trvá při pohybech.
- Po schválení nejsou finanční pole volně přepisovatelná. Není-li žádný účinný pohyb, lze explicitně vrátit položku do návrhu (auditovaný důvod), změnit ji a znovu schválit. S účinnými pohyby B1 změnu finančních parametrů odmítne; B3 umožní přesně definované opravné workflow. Poznámka či odkaz na doklad závazek nemění, ale verzi/audit ano.
- Návrh výchozí politiky: approver nesmí schválit vlastní návrh. Výjimka finance admina vyžaduje samostatnou potvrzenou politiku a povinný důvod. Bez jejího potvrzení se self-approval neimplementuje jako tichý bypass; v testovacím prostředí použít dvě identity.

## 6. Zůstatky, osobní výdaje a tok peněz

Pro každý původní pohyb se počítá účinná částka = původní částka minus validní úplné storno. Částky nikdy nesčítat napříč ročníky, měnami nebo neodsouhlasenými verzemi.

Pro schválenou položku:

```text
M = účinné úhrady pořadatele (bank/cash)
P = účinné osobní platby dodavateli
B = účinný barter
R = účinná proplacení osobních plateb
vypořádáno s protistranou = M + P + B
zbývá protistraně = confirmed_minor - M - P - B
zbývá proplatit osobě za konkrétní osobní platbu = P_j - sum(R_j)
peněžní tok pořadatele u výdaje = M + R
peněžní tok pořadatele u příjmu = M
```

Příjem nepovoluje osobní výdaj ani proplacení. Barter snižuje zbývající vypořádání, ale nevytváří hotovostní/bankovní příjem či výdaj. Jeho hodnota musí být schválená, s popisem plnění. Proplacení nesnižuje dodavatelský závazek podruhé.

Fiktivní akceptační příklad: potvrzený výdaj 10 000 Kč; pořadatel uhradí 3 000 Kč, osoba A 2 000 Kč a osoba B 1 000 Kč, barter 1 000 Kč. Zbývá dodavateli 3 000 Kč. Proplacení 1 500 Kč osobě A ponechá dodavatelský zůstatek 3 000 Kč, A zbývá 500 Kč, B 1 000 Kč a tok peněz pořadatele je 4 500 Kč. Náklad se nestane 11 500 Kč.

U NULL potvrzené částky je zůstatek neznámý a nelze zapsat vypořádání. U známé nuly není kladné vypořádání možné. Stav nezaplaceno/částečně/vypořádáno a po splatnosti je odvozený; ruční checkbox ho nenahrazuje. „Vypořádáno“ může zahrnovat barter/osobní platby a není synonymem „přišlo na účet“.

Souhrny mají zvlášť plán, schválené potvrzené částky, peníze pořadatele, barter, osobní platby, závazek proplacení a dosud nevypořádané příjmy/výdaje. Pokud je část množiny neznámá, zobrazit známý mezisoučet a počet neznámých položek, nikoli kompletní součet s implicitními nulami. „Skutečnost“ se v UI musí nahradit jednoznačným názvem příslušné veličiny.

## 7. RPC, transakce a souběh

| RPC — návrh kontraktu | Hlavní vstup | Výstup a kontrola |
| --- | --- | --- |
| `save_finance_item` | edition, nullable id, expected_version, povolená obchodní pole, request_id | ID, nová verze; editor+, platné vazby/částky, jen dovolená finanční pole daného stavu. |
| `submit_finance_item` / `decide_finance_item` | edition, id, expected_version, decision, reason, request_id | Stav, verze; schválení jen approver+, validní snapshot, kontrola self-approval. |
| `post_finance_settlement` | edition, item id, expected_version, kind, amount_minor, date, channel/person/source, request_id | Pohyb, nová verze a serverové zůstatky; approver+, approved položka, žádný přeplatek. |
| `reverse_finance_settlement` | edition, settlement id, expected item version, reason, request_id | Nové storno a zůstatky; neduplicitní reversal, žádný záporný osobní zůstatek. B3. |
| `reopen_finance_item` / `cancel_finance_item` | edition, id, expected_version, reason, request_id | Jen povolený přechod a nulové účinné pohyby/závazky. |
| `get_finance_summary` | edition, filtry scope/direction/category/counterparty | Úplné autorizované agregace v textových haléřích + unknown counts; žádná cizí data. |
| `set_finance_member` | edition, target member, role/remove, expected grant version, reason, request_id | Pouze finance admin, audit změny, serializace správy grantů v rámci ročníku a ochrana posledního admina. |

Každý zápis provede v jedné transakci:

1. Ověření Auth identity a základní kontroly členství; sdílený zámek na aktivním `editions` řádku proti archivaci. Archivace musí použít stejný řádek a výlučný zápis; finance admin archiv nemůže obejít.
2. Ověření finanční role a zamknutí vlastního grantu proti souběžnému odebrání. Správa grantů navíc nejprve serializuje všechny změny grantů daného ročníku (transakční advisory lock), aby dvě současná odebrání nemohla odstranit oba poslední adminy. Potom zamyká vlastní/cílové granty ve stabilním pořadí. Všechny RPC dodržují stejné pořadí zámků ročník → granty → request → položky. Změna práv čeká na běžící autorizovanou transakci, pozdější zápis po odebrání selže.
3. Serializaci request_id (např. transakční advisory lock nebo unikátní insert s čekáním), ověření shody payloadu a replay již dokončené žádosti. Při chybě rollback i žádosti; po ztracené odpovědi klient opakuje stejnou žádost, po změně vstupu použije nové UUID. Replay neprovede znovu kontrolu staré očekávané verze, ale znovu ověří právo číst výsledek.
4. `SELECT … FOR UPDATE` na finance item; kontrolu očekávané verze. Pro více položek použít stabilní pořadí UUID. Osobní zdroj i proplacení používají zámek stejné položky, takže součty nemůže souběh přepočítat nad starým stavem.
5. Validaci povolených polí a složených FK, přepočet zůstatků z ledgeru uvnitř zámku, kontrolu částky i zůstatku konkrétní osoby/platby.
6. Zápis ledgeru/stavu, inkrement item version, append audit s `auth.uid()`, uložit výsledek request_id. Vracet verzi a zůstatky z téže transakce.

Všechny operace měnící zůstatek musí používat stejný zamykací protokol; nestačí klientská validace nebo oddělený SELECT před INSERT. UI při `VERSION_CONFLICT` zachová draft a nabídne vědomé načtení; samo neobnoví verzi a nepřepošle cizí obsah. Po timeoutu nejprve ověřit idempotentní výsledek, ne vytvořit další platbu.

Kontrolované chyby: ACCESS_DENIED, EDITION_ARCHIVED, VERSION_CONFLICT, NOT_APPROVED, INVALID_RELATION, INVALID_AMOUNT, OVER_SETTLEMENT, OVER_REIMBURSEMENT, REQUEST_PAYLOAD_MISMATCH, REVERSAL_DEPENDENCY. Zobrazovat srozumitelnou zprávu bez payloadů, SQL internals a osobních dat v logu.

## 8. Opravy, storna a skutečné vratky

B1 ledger nelze změnit ani smazat; uživatel má vědět, že opravy pohybů budou dodány v B3 před reálným provozem. Schválené pole s existujícími pohyby není běžný inline editor.

B3 zavede **úplné evidenční storno** chybně zadaného pohybu, nikoli automatické vrácení peněz. Reversal uloží odkaz na originál, stejný kind/částku, autora a povinný důvod; unikátní `reverses_id` zabrání dvojímu stornu. Klient nesmí poslat libovolný záporný pohyb. Storno storna v první dodávce nepovolit; správný pohyb se znovu zaeviduje s novým ID.

Osobní platbu lze stornovat až po stornu navázaných proplacení, jinak by vznikl záporný zůstatek. Přesun chybné osobní identity: nejprve obrátit závislosti, poté původní osobní platbu a zapsat správnou; vše s jasnou historií, případně atomickým opravným RPC. Faktické již odeslané peníze se tím neztrácejí z dokumentace.

Skutečný dobropis/vrácení platby je jiné workflow. Vyžaduje vazbu na původní položku/pohyb, doklad, schválenou změnu závazku a evidenci reálného protisměrného toku. B3 má nejprve navrhnout `finance_adjustments` a `post_finance_refund`, otestovat celý dopad na závazek i peníze; do té doby tyto případy ponechat mimo podporované operace, nikoli použít evidenční storno. Částečné vratky a přeplatky nelze prohlásit za hotové jen na základě testu storna.

## 9. Doklady a přílohy

B1 umí poznámku a volitelný validovaný HTTP(S) odkaz s upozorněním, že přístup k externímu souboru řídí jeho úložiště. URL není bezpečnostní náhrada přílohy ani platby; tokenové/podepsané URL dlouhodobě neukládat. B4 přidá soukromý bucket a metadata. Žádný public bucket pro faktury.

Cesta objektu: `<edition_uuid>/<document_uuid>/<random_filename>`. Storage RLS ověří finanční grant, ročník, metadata a stav; nelze získat soubor pouhou znalostí UUID či cestou sousedního ročníku. Podepsaný odkaz vydávat krátkodobě jen po autorizaci; jeho již vydanou platnost zohlednit při odebrání role. Service key klient nikdy nedostane. [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control).

Upload není jedna transakce se SQL: založit pending metadata → omezený upload do přidělené cesty → serverové ověření existence/typu/velikosti/hash → finalizace ready. Nedokončené uploady ponechat ve failed/pending, umožnit retry a pozdější úklid sirotků. Omezení návrhu: PDF/JPEG/PNG, např. 10 MiB na soubor (OPEN limit); ověřit skutečný obsah, ne jen příponu. Privilegovanou finalizaci lze řešit omezenou serverovou/Edge funkcí; volba nesmí potichu změnit hosting nebo aktivovat placený tarif.

Faktura má vlastní identifikaci a datum; stav uhrazení se odvozuje z výslovného přiřazení vypořádání, nikoli z existence souboru. V první etapě je splatnost a zůstatek na položce; pokud je k ní více faktur s odlišnými splatnostmi, rozšířit model o kontrolované alokace mezi doklady a pohyby nebo položky vědomě rozdělit před úhradami. Nesčítat částku hlavičky položky znovu jako částku každého dokladu.

Metadata Document jsou navržená pro budoucí sdílený dokumentový modul, ale finanční soubor se nezpřístupní Partnerům automaticky. Do Partners audit/poznámky ani veřejného portálu nepřenášet obsah finančních dokladů.

## 10. Kontrolovaný import a rozdělení akcí

B5 navazuje na neveřejnou mapu podkladu; v tomto úkolu se znovu nečtou ani nepřenášejí skutečné řádky. Model není potvrzení rozpočtu 2027.

1. Lokální parser se známou verzí formátu načte podklad jako data, uchová list/řádek/původní hodnoty/vzorce/poznámky a fingerprint souboru. Vzorce nespouštět jako kód; rozlišit vzorec, jeho uložený výsledek a chybějící výsledek. Veřejné testy mají pouze fiktivní sešit/JSON.
2. Vybrat konkrétní akci a ročník. Souhrnné řádky označit jako souhrn, duplicity/překryvy a nejasná jména/platby jako review. Nejasná úhrada nevznikne z buňky „skutečnost“ bez dokladu o významu.
3. Historii 2026 nabídnout pouze jako návrh struktury/plánu 2027. Potvrzené závazky, approvals, platby a proplacení se do nového ročníku nekopírují. NULL zůstává NULL.
4. Protistrany párovat na existující UUID; IČO+země pomáhá ověřit organizaci, název ani e-mail sám nestačí. Identitu osob a osobního plátce potvrdit, neodvozovat z volné poznámky.
5. Sdílenou hlavní akci/afterparty rozdělit s ručně potvrzenými částkami. Součet částí musí přesně odpovídat zdrojové částce v haléřích; případný zbytek výslovně přidělit nebo ponechat unallocated. Neimportovat zároveň celý zdroj a jeho části. V první verzi rozdělit na položky s propojenou source group před jakoukoli úhradou; B1 živé placené položky automaticky nerozděluje.
6. Náhled ukáže počet schválených/odmítnutých/review řádků, známé částky, NULL, mapování a kolize. Finance admin potvrdí pouze vybrané řádky; transakční RPC uloží položky a provenance s request_id. Velký import rozdělit do explicitních atomických dávek; stav celého batch zřetelně ukáže částečné dokončení.
7. Unikátní fingerprint+list+řádek+cíl zabrání opakování stejného zdroje. Opravený soubor má nový fingerprint; uložené vazby, porovnání původního zdrojového ID a review musí zabránit duplicitě i tehdy, nikoli jen kontrola hashe.
8. Po importu porovnat úplné součty/counts s review manifestem a otevřít vzorek v aplikaci. Oprava importu probíhá přes běžné auditované operace; hromadné DELETE placených položek není rollback.

## 11. UI a propojení s Partnery

- Finance svého ročníku: filtry směr/scope/kategorie/protistrana/schvalování/splatnost, jasně oddělené souhrny a počet neznámých částek. U archivu read-only.
- Formulář: neznámé částky ponechat prázdné; popsat plán a potvrzení. Protistrany vybírat z ročníkového registru, novou identitu zakládat vědomě. Schválení je samostatná akce.
- Detail: položka, approval historie, ledger, serverové zůstatky, osobní proplacení po jednotlivých platbách/osobách, doklady, audit. Dvojí odeslání blokované; chyba uchová vstup.
- Úhrada: bank/cash, datum, částka, případná poznámka/doklad. U personal konkrétní plátce; u reimbursement výběr původní osobní platby a její zůstatek. Barter samostatně s popisem.
- Partner → Finance nabídne pouze organizaci+ročník, nikdy nepřidělí finanční grant. Finance → Partner jen pokud uživatel současně smí číst příslušné partnerství; finance-only účet nedostane interní partner poznámky.
- Partnerské „Kč odhad“ = finanční plán, „Kč potvrzené“ = schválená potvrzená částka. Sloupec „Kč real“ vyžaduje přejmenování na konkrétní peněžní veličinu, např. „Přijato peněžně“. Bez grantu zůstávají finanční buňky skryté/„—“; pro sdílení vybraných částek s partnerským managerem by bylo potřeba další explicitní projekční oprávnění, které nyní není schválené.
- Potvrzení Partnerů nevytvoří automaticky finanční položku ani příjem. Finance neovlivňují automaticky partner status nebo splněnost plnění.
- Skutečný backend nemá fallback do localStorage. Odhlášení či změna účtu vymaže finanční stav klienta; odpověď pro starý účet/ročník se zahodí pomocí generačního identifikátoru. Finanční data se neposílají do SSR/cache veřejné stránky. Demo zůstane výhradně fiktivní.

## 12. Etapy a podmínky dokončení

| Etapa | Dodávka / závislosti | Akceptace |
| --- | --- | --- |
| B0 — uzavření kontraktu | Potvrdit finanční matice, konkrétní granty, self-approval, význam částek, základní kategorie, variantu dokladů. Připravit fiktivní fixture a izolované DB/Auth prostředí. | Rozhodnutí ve Finance MD + DECISIONS; žádné OPEN maskované jako hotová implementace. |
| B1 — první skutečný průchod | Nové migrace members/categories/counterparties/items/approvals/requests/audit + ledger money; role/RLS/RPC, loader/UI, serverové agregace. Organizace může být protistrana bez partnerství; zpočátku použít existující profily. | Dva oprávněné účty vytvoří/schválí položku; částečná platba přežije reload; nečlen a partnerský admin bez grantu nic nezískají; archiv, rollback, verze a replay žádosti fungují. Provoz pouze v izolovaném prostředí. |
| B2 — osoby a nepeněžní vypořádání | Payer registry, person counterparties a bezpečné zakládání/propojení globálních profilů; personal/barter/reimbursement RPC+UI. Závisí na B1. | Příklad dvou osob z §6, částečné proplacení, nemožnost proplatit jinou osobu/ročník nebo přeplatit zdroj. Barter nezvýší peněžní tok. |
| B3 — opravné operace | Append-only evidenční storna a závislosti, explicitní oprava položky/schválení; samostatně dokončit návrh skutečných dobropisů/vratek. | Dvojí storno selže; závislé proplacení chráněné; původní historie zůstává. Nepodporované skutečné vratky jasně odmítnuté, nebo kompletně otestované odděleným workflow. |
| B4 — doklady | Metadata + soukromý Storage, autorizovaná finalizace, retry/úklid sirotků. Nové finanční SQL/Storage politiky, žádný veřejný bucket. | Cizí role/ročník nečte ani nenahrává; guessed path/URL neobejde kontrolu; neúplný upload nevypadá jako ready. |
| B5 — import, export a obnova | Review batch/rows, mapping, zdrojové vazby, split, idempotence; čitelné CSV/XLSX a obnovení DB+Auth+Storage v izolaci. | Počty/součty proti manifestu, opakovaný/opravovaný zdroj bez duplicity, NULL/haléře/ID zachované, souhrn nezapočtený jako detail; obnova ověřená. Skutečný import až po zvláštním pokynu. |
| B6 — akceptace a případné spuštění | Skutečné Auth/PostgREST/Storage více účtů, souběh dvou spojení, ověřené zálohy a provozní monitoring. | Uživatel zkontroluje konkrétní release/migrace a výslovně zadá nasazení a produkční import. Teprve pak změna skutečného prostředí. |

V B1 se budoucí dokladové/personální FK nesmějí odkazovat na dosud neexistující tabulku; odpovídající sloupce/constrainty přidají teprve B2/B4 migrace. Indexy a veřejné API rozšiřovat společně s danou etapou.

Každá etapa = samostatný malý commit/PR s kódem, odpovídajícími testy a aktualizací modelu/statusu/DECISIONS. Dokončení B1 se nesmí označit za dokončení celého finančního modulu. Etapy B2–B5 jsou předpoklady evidence skutečných typů výdajů ze zdroje, ne důvod importovat vše do nehotového B1.

## 13. Povinné ověření

**Doména:** přesné haléře včetně desetinné čárky, NULL vs 0, rozsah jednotlivých částek i agregací, směr, splatnost, plán/potvrzeno/peníze, doklad bez dopadu na úhradu. Žádná fixture se skutečnými jmény/částkami.

**SQL/PGlite:** fresh migrace a upgrade nad partnerskými fixtures, všechny finanční role a explicitní deny scénáře; přímé tabulkové mutace/audit/granty; FK napříč ročníky a špatné partnerství/organizace; archiv; stale approval/settlement; rollback; replay stejné a změněné žádosti; osobní zůstatky po zdrojích; storna a jejich závislosti; izolace finančního auditu od partnerského viewer. Testovat také SELECT * a nepovolené API cesty, ne jen skrytá tlačítka. RLS filtruje řádky, nikoli libovolně vybrané citlivé sloupce. [Supabase Column Level Security](https://supabase.com/docs/guides/database/postgres/column-level-security).

**Skutečný souběh v izolovaném PostgreSQL:** dvě nezávislá spojení zkusí doplatit poslední zůstatek současně; uspěje nejvýše jeden zápis, zbytek skončí konfliktem/přeplatkem. Dvě proplacení téhož osobního zdroje, dva stejné request_id, souběžné odebrání posledních adminů, úhrada proti stornu/změně role/archivaci. PGlite a sekvenční test zastaralé verze tento víceuživatelský test nenahrazují.

**Browser s mock backendem:** položka → submit → approval → částečná úhrada → reload; Partner ↔ Finance s rozdílnými granty; error a zachovaný draft; odpověď starého ročníku; logout/login jiným účtem; mobil; NULL vs 0; chybějící backend nikdy nespustí demo. Použít fiktivní URL/klíč a samostatný lokální server jako u Partnerů.

**Izolovaná Supabase akceptace:** skutečné JWT/Auth, PostgREST RPC návratové typy bigint, granty a všechny deny scénáře, expirace session, Storage ACL a odpovědi chyb, dva účty ve dvou prohlížečích. Není-li izolované prostředí dostupné, označit tuto akceptaci jako neověřenou; netestovat ji mutacemi produkce bez pokynu.

## 14. Migrace a provozní hranice

Před první finanční migrací read-only ověřit verzi původního schématu, použité partnerské migrace, default grants, PostgreSQL verzi a dostupná schémata/API. Do veřejných MD nepsat přístupy. Pro testovací prostředí není potřeba placenou službu automaticky zakládat.

Použít aditivní migrace, RLS/granty ve stejné změně a prázdný finanční registr bez provozních dat. Finance zůstávají nedostupné, dokud nejsou explicitně přidělené granty a ověřená API/UI. Technický flag jen ovládá UI; neposkytuje oprávnění. Prvního finance admina zavede oprávněný správce samostatnou ověřenou operací, nikoli seed s reálným UUID v Gitu. Další správa grantů je auditovaná; posledního finance admina nelze nechtěně odebrat.

Rollback aplikace: vypnout přístupovou nabídku/revertovat frontend, ponechat DB a audit, odebrat dotčená RPC oprávnění dle incidentu. Nesmazat nové tabulky s daty. Před reálným upgradem uložit verzi schématu, obnovitelnou zálohu a otestovat návrat kompatibilního frontendu. Destruktivní down migrace není základní plán obnovy.

Denní zálohy a CSV/XLSX podle `SPOLUPRACE-A-ZALOHY.md` rozšířit o všechny finance tabulky, provenance, audit, granty a inventář souborů. Export respektuje role a ročníky; text bezpečný proti spuštění vzorců, ID/IČO jako text, datum ISO a jasné haléře. DB dump samotný neobnoví soubory, CSV samo neobnoví SQL/RLS/Auth. Zkušební obnova musí předcházet označení záloh za funkční.

V tomto úkolu: žádné `db push`, produkční SQL, import, DNS/hosting, konfigurace banky, odeslání plateb, aktivace WhatsApp/Twilio nebo změna tarifu. Publikace zadání do Gitu není nasazení.

## 15. Otevřená rozhodnutí před příslušnou etapou

| Rozhodnutí | Doporučený výchozí návrh | Kdy musí být uzavřeno |
| --- | --- | --- |
| Kdo vidí a spravuje finance | Vojta explicitní finance admin; Vlasta a další dostanou jen uživatelem určené role, žádná automatika z Partnerů. | B0 / před skutečnými granty |
| Kdo schvaluje vlastní návrhy | Oddělený approver; admin výjimku zavést jen po výslovné volbě s důvodem a auditem. | B0 |
| Co přesně znamenají částky v podkladu a daňový režim | Ukládat eventové částky podle potvrzeného významu; nepřepočítávat DPH ani předstírat daňovou evidenci. Rozlišení bez/s DPH řešit až podle ověřeného podkladu. | B0 / nejpozději B5 |
| Kategorie a pravidla hlavní akce/afterparty | Kontrolovaný katalog, unallocated pro nejasnosti; ruční přesné dělení a jediný import detailu. | B0 + B5 |
| Osobní plátci a evidence proplacení | Centrální Person + ročníkový payer registry + konkrétní zdrojový pohyb, nikoli jméno v poznámce. | B2 |
| Dobropisy/vratky/zálohy/přeplatky | První dodávka je odmítá; skutečné vratky navrhnout odděleně od evidenčního storna. | B3 / před importem takových případů |
| Soukromé soubory a finalizace | Supabase Storage + metadata; ověřit limity, retenci a hosting omezené serverové funkce. Žádný automatický upgrade tarifu. | B4 |
| Zálohy/plánovač/retence | Dočasný iCloud dle již určeného neveřejného cíle; skutečný dump a test obnovy samostatně. | B5–B6 |
| Izolované prostředí, release a ostrý import | Lokální fixture a testovací DB nejprve; změna produkce jen po výslovném pokynu. | B0 + B6 |

## Doporučený první implementační úkol

Po uzavření B0 dodat **B1: finanční grant, návrh a schválení jedné položky, bankovní/hotovostní částečná úhrada, idempotentní RPC a oddělený finanční audit**. Fiktivní příjem 1 000 Kč, úhrada 250 Kč, po reloadu potvrzeno 1 000 Kč, peněžně přijato 250 Kč, zbývá 750 Kč. Stejný test zopakovat pro výdaj; partnerský manager bez finance grantu nesmí získat ani částku přes API. Teprve potom přidat osobní platby/barter, opravy a soukromé doklady.
