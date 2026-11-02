# Provozní stav a ukládání — omezený hook

Implementovat pouze `event-app/src/components/use-operations-workspace.ts`, client React hook bez JSX. Stavová část širší30c; UI bude další krok. Bez SQL, nových závislostí, účtů, persistence nebo skutečných dat. Použít loadOperations/writeOperation, operations-model, CrewData/Edition, OperationView z operations-views.

Export `OperationSelection = {kind:'zone'|'task'|'registration';value:Zone|OperationTask|Registration}|{kind:'registration_grant';value:RegistrationGrant}` a `OperationsFilters={search:string;status:string;includeArchived:boolean}`.

`useOperationsWorkspace({edition,crew,userId,onGuardChange}:{edition:Edition;crew:CrewData;userId:string;onGuardChange:(guard:()=>boolean)=>void})` vrací:

- data:OperationsData|null, loading:boolean, saving:boolean, error:string|null, notice:string|null, selection:OperationSelection|null, dirty:boolean, view:OperationView, filters:OperationsFilters, canEdit:boolean, canRegister:boolean;
- changeView(view:OperationView), changeFilters(next:Partial<OperationsFilters>), open(kind:'zone'|'task'|'registration',id:string), create(kind:'zone'|'task'|'registration'), openGrant(userId:string), change(next:Zone|OperationTask|Registration|RegistrationGrant), cancel(), reload(), save(next:Zone|OperationTask|Registration|RegistrationGrant):Promise<void>.

Parent remountuje podle userId:edition.id. Member výchozí service, ostatní tasks. Filtry prázdné hledání/status all/includeArchived false. canEdit jen admin/coordinator a aktivní ročník; canRegister jen data.canRegistration a aktivní ročník. Správa registration_grant jen admin i v archivu. Open/create ověří ročník a práva; běžný člen může otevřít jen úkol přes ownAssignments, readonly. OpenGrant jen existující crew.members stejného roku. Nové entity přes newZone/newTask/newRegistration s crypto.randomUUID a version0. Draft je kopie, nemutovat dataset.

Lifecycle: ref alive/generation/operation pro pozdní odpovědi, cleanup zneplatní read/write. Mount loadOperations, chyby přes operationsMessage bez logu/rawAPI. Načítací chyba schová dataset (null), není prázdný úspěch. canRegistration false odstraní předchozí registrační selection. Všechny promises zachytit. SavingRef synchronně blokuje duplicitní submit i odchod.

DirtyRef nastavovat synchronně při change, i pokud amount text zatím nelze převést a formulář předá kopii stejného draftu. Change nesmí změnit id/user_id/edition nebo kind selection. View/filters/open/new/grant/cancel/reload chrání jediný guard: při saving false, při dirty window.confirm('Zahodit rozepsané změny?'), při souhlasu vyčistí draft/dirty. Čistý otevřený detail zavře bez confirm. Zaregistrovat onGuardChange effectem (guard přes refs), cleanup předá ()=>true. Beforeunload pro dirty/saving. Rodič předá stabilní callback.

Save vyžaduje vybranou selection, shodné id/user_id a edition, odpovídající právo a aktivní rok s výjimkou admin grantu. Body operationPayload(kind,next). Použij hotové operationRequestFingerprint a isOperationAccessError z operations-model, neopisuj je. Fingerprint celého [edition.id,kind,sortedkey-valuepayload]; Map fingerprint->UUID. Stejné tělo po chybě i refresh failure použije stejný requestId, změna kteréhokoliv pole/verze jiný. Request identitu nikdy negenerovat znovu při retry. Neimplementovat vlastní kryptografii.

Po writeOperation úspěchu loadOperations, vybrat novou verzi podle id/user_id, dirty=false, notice Uloženo. UI remountuje form key id/version. Když write uspěl a refresh selhal, ponechat draft/dirty/requestId a explicitní text 'Zápis byl potvrzený, ale nové údaje se nepodařilo načíst. Opakování uloží stejný požadavek.'; nevytvořit druhý nový záznam. Běžná write chyba/conflict zachová draft. Access error42501/CREW_ACCESS_DENIED/OPERATIONS_ACCESS_DENIED schová dataset a citlivý registrační draft. Žádné staré osobní údaje pod falešným úspěchem. Reload je vědomé zahození podle guardu. Běžná síťová chyba sama draft nezahazuje.

Bez selfcheck-in/Hotovo pro člena, realtime/offline, importu, nasazení nebo dalších souborů. Hotový návrh questions=[], neblokující poznámky summary.
