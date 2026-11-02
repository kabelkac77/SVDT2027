# Omezený krok: pouze formuláře sdílené crew

Předchozí dvousouborový krok překročil 900s bez návrhu a nic nezapsal. Rozsah nyní zmenšený: implementovat jen event-app/src/components/crew-forms.tsx. Žádný CrewApp, auth nebo tabulkový renderer v tomto kroku. Použít předaný crew-model.ts. Jasné čitelné formuláře, max přibližně 350 řádků.


Export SaveCrew=(kind:CrewWriteKind,payload:Record<string,unknown>)=>Promise<boolean>. Export CrewEntryEditor(props): {draft:CrewEntry,data:CrewData,onChange:(next:CrewEntry)=>void,onSave:()=>void,onCancel:()=>void,disabled:boolean,readOnly:boolean}. Řízené vstupy jméno, kategorie, druh (nevyjasněný/osoba/skupina), pozice, kdo řeší, kontakty, stav/termín, PÁ/SO, poznámka pro crew a vyřazení. U kind person nabídnout opětovné použití Person ID z již uložených osob stejného ročníku s čitelným jménem; prázdná volba vytvoří novou osobu po uložení, žádné slučování. Změna kind na jiný než person vymaže person_id. Propojení účtu jen admin (povolení kontroluje také DB), volby enabled memberships z data.members email; dřívější nezobrazenou vazbu zachovat jako 'Přiřazený účet'. Člen/readOnly má disabled fieldset a žádné uložení. Technická UUID nepoužívat jako hlavní popisky.

Export CrewCategoryForm(props): {category?:CrewCategory,onSave:SaveCrew,onDirty:()=>void,disabled:boolean}. Formulář název/barva, počet (prázdno null, známá0 platná, integer0..10000), přesný termín cíle. Request kind category s explicitním id (generovat jednou), version0/uložená verze, name,color,required_count,required_term. Při chybě zachovat, po úspěchu rodič dostane nové údaje.

Export CrewCompensationForm(props): {entryId:string,fee?:CrewCompensation,onSave:SaveCrew,onDirty:()=>void,disabled:boolean}. Pouze rodič při data.canFinance=true. Odhad/domluva/celková hodnota/vyplaceno v Kč přes crewMoneyInput a nullableCrewMoney (haléře), barter a merch. Zápis kind compensation id=entryId,version fee.version nebo0. Nulové a neznámé odlišit, neprovádí se bankovní úhrada. Nekombinovat s roster zápisem (oddělené tlačítko). Ošetřit parseMoney chyby lokální konstantní hláškou. Nepoužívat raw bankovní nebo API údaje.

Export CrewMembershipForm(props): {member?:CrewMembership,onSave:SaveCrew,onDirty:()=>void,disabled:boolean}. Jen admin. Přidání přes přesný e-mail existujícího účtu, role admin/coordinator/member, zapnuto a samostatně finance jen pro coordinator/admin. Změna existujícího členství přes user_id a version, známý email zobrazit. Zakázat can_finance pro member a při změně na member vynulovat false. Vysvětlit že účet musí existovat a žádná pozvánka se sama neodesílá. Žádné auto-granty nebo skutečné účty v kódu. Rodič zobrazí seznam existujících členství s možností editace, nepřidávat hromadné role.

Kopii dat nedávat do localStorage; používat server a paměťové drafty. Bez síťového volání během renderu. Nové globální CSS ani jiné soubory v tomto kroku neměnit. Všechny popisky česky, ne SQL/RPC/UUID nebo interní implementační detaily běžnému člověku.

Správce má finance implicitně bez ohledu na can_finance. U členství tuto skutečnost vysvětlit a pro admin checkbox nedělat dojem že finance lze odebrat.
