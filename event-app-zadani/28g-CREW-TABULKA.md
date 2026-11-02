# Omezený krok: pouze tabulkový pohled crew

Implementovat pouze event-app/src/components/crew-roster-view.tsx, client component export CrewRosterView(props). Čistý prezentační komponent: žádný auth, fetch, effects, vlastní state, ukládání nebo dialogy. Jen React JSX odvozené z props. Žádný další soubor. Max přibližně250 řádků. Pracovní controller dodá host odděleně. Použít crew-model a CrewEntryEditor/CrewCompensationForm dle kontraktu níže, stávající CSS třídy crew-*.

Props (export type CrewRosterProps): {edition:Edition;data:CrewData;userId:string;filters:{search:string;status:string;includeArchived:boolean};expanded:string[];draft:CrewEntry|null;anchorCategoryId:string|null;pendingKind:CrewWriteKind|null;saving:boolean;onToggle:(categoryId:string)=>void;onOpen:(entryId:string)=>void;onChange:(draft:CrewEntry)=>void;onCancel:()=>void;onSave:(kind:CrewWriteKind,payload:Record<string,unknown>)=>Promise<boolean>;onDirty:(kind:CrewWriteKind)=>void}. Edition z ../lib/model, ostatní typy z ../lib/crew-model.

## Výpis

Kategorie z data.categories stejného ročníku, seřazené česky podle jména. Table classcrew-sheet, eightcols Jméno/Stav/Pozice/Kdo řeší/PÁ(od–do)/SO(od–do)/Domluva/Rok. THead a TBody, td data-label pro mobil. Každá skupina tr className='crew-group-row crew-category cat-N', th colSpan8 a button aria-expanded s onToggle, název/počet filtrovaných záznamů/souhrny pěti stavů s crewStatuses. Barevnou class přijmout jen regex ^cat-([0-9]|1[01])$, jinak cat-11. Stavové štítky class crew-status-confirmed/contacted/declined/candidate/unknown + badge. Řádky cat-N, button u jména classcrew-row-button s aria-expanded a onOpen, klávesnicí přístupný. Klik na zbytek řádku může také onOpen, zabránit zdvojenému volání přes stopPropagation ubuttonu. Souhrny vycházejí jen z uložených filtrovaných záznamů, ne draftu.

Filtr: správný ročník, nearchivované pokud !includeArchived, substring hledání přes name/position/owner_label (case-insensitive, normalizovat diakritiku pokud snadné), statusall nebo přesný. Member navíc omezit linked_user_id===userId, i kdyby props omylem obsahovaly širší snímek. Obyčejnému členovi neukazovat týmovou obsazenost! Pouze 'Moje přiřazení'. Admin/coordinator coverageFor(category,data.entries) nad celou uloženou kategorií, ne filtrovanými daty: Neurčeno/K ověření/Chybí N/Cíl pokryt + požadovaný termín. Počet řádků není počet lidí.

## Stabilní detail

Draft stejného ročníku zobrazuje detail v dalším tr classcrew-detail a td colSpan8 pod odpovídajícím řádkem. Žádná jiná stránka/modal. Otevřený uložený řádek udržet viditelný i když po uložení přestane odpovídat filtru; do filtrovaných počtů se navíc nepřičítá. Nový draft, který v data.entries ještě není, vytvoří vlastní zobrazený řádek (ale ne statistiky uložených). Zůstává u anchorCategoryId i když v jeho editoru měníme category_id, aby detail nezmizel do sbalené jiné skupiny. Member nesmí vidět draft cizího linked_user_id. Pokud skupina expanded neobsahuje ID, jen záhlaví; ovládání expand/anchoru řídí rodič. Nevymýšlet údaje pro prázdnou kategorii.

Detail má nahoře Zavřít button onCancel disabledsaving. CrewEntryEditor draft/data/onChange/onCancel/disabled/readOnly. readOnly když archiv nebo role mimo admin/coordinator. disabled=saving nebo pendingKind jiný než roster. onSave volá void onSave('roster',crewEntryPayload(draft)). Neprovádět zápis přímo. Peníze se neukládají spolu s roster.

Finanční data číst a zobrazit jen data.canFinance a roleadmin/coordinator. Pokud false, nedotýkat se vůbec data.compensation ani nevložit skryté částky/barter/merch do DOM, jen 'Odměna neveřejná'. Pokud true, najít fee podle entryid; hlavní řádek známá agreed částka přes crewMoneyInput+' Kč', jinak 'Částka neurčena'. V detailu pro již uložený záznam samostatný CrewCompensationForm, onSave rodič, onDirty()=>onDirty('compensation'), disabledsaving/archived/pendingKind jinýnežcompensation; keyrosterid:feeversion. Pro nový nesaved řádek text nejdřívuložitzáznam. Formy jako sourozenci (ne vnořené form). Neposílat se nic samo, žádný localStorage, raw HTML, kontakty v hlavním řádku nebo výpočty směn.

## Kontrakt již hotových komponent

CrewEntryEditor({draft:CrewEntry,data:CrewData,onChange:(next:CrewEntry)=>void,onSave:()=>void,onCancel:()=>void,disabled:boolean,readOnly:boolean}). Kontroluje všechny rosterfields včetněkontaktů, PÁ/SO, přiřazení; onChange nadřízený označí dirtyroster.
CrewCompensationForm({entryId:string,fee?:CrewCompensation,onSave:(kind,payload)=>Promise<boolean>,onDirty:()=>void,disabled:boolean}). Lokální peněžní texty, vrací nullablehaléře, samostatný save. Vlastní komponenty v tomto kroku nepřepisovat.
