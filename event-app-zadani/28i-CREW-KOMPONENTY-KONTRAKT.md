# Kontrakty hotových komponent pro controller

Toto je úplný veřejný kontrakt potřebný pro controller28h. Implementace tabulky i formulářů již existuje; jejich interní JSX ani další podklady nejsou pro tento krok potřeba. Typy CrewData/CrewEntry/CrewCategory/CrewMembership/CrewWriteKind z ../lib/crew-model, Edition z ../lib/model. Žádné další komponenty s podobným jménem nezakládat.

Z ./crew-roster-view importovat CrewRosterView. Props:

```ts
{edition: Edition; data: CrewData; userId: string;
 filters: {search:string; status:string; includeArchived:boolean};
 expanded:string[]; draft:CrewEntry|null; anchorCategoryId:string|null;
 pendingKind:CrewWriteKind|null; saving:boolean;
 onToggle:(categoryId:string)=>void; onOpen:(entryId:string)=>void;
 onChange:(draft:CrewEntry)=>void; onCancel:()=>void;
 onSave:(kind:CrewWriteKind,payload:Record<string,unknown>)=>Promise<boolean>;
 onDirty:(kind:CrewWriteKind)=>void;}
```

Tabulka již řeší osm sloupců, filtry a souhrny, vlastní výřez člena, viditelnost odměn, barevné sbalovací kategorie, nový draft s UUID, detail pod řádkem a readonly archiv. Volá onChange pro roster, onDirty('compensation') pro odměny. pendingKind blokuje ostatní formuláře. Controller řídí state, load/save/guardy a předává props, nevykresluje řádky znovu.

Z ./crew-forms importovat tyto dvě komponenty:

```ts
CrewCategoryForm({category?:CrewCategory,
 onSave:(kind:CrewWriteKind,payload:Record<string,unknown>)=>Promise<boolean>,
 onDirty:()=>void, disabled:boolean})
CrewMembershipForm({member?:CrewMembership,
 onSave:(kind:CrewWriteKind,payload:Record<string,unknown>)=>Promise<boolean>,
 onDirty:()=>void, disabled:boolean})
```

Děti drží vlastní formulářový text. Při zahození nebo úspěšném reloadu je remountovat změnou key zahrnující formEpoch/id/verzi, při chybě zachovat stejný key. Kategorie ukládá kindcategory, členství kindmember. Načtení správné verze, kontrolu souběhu a identitu requestu zajišťuje controller. Nové členství je jen přes existující účet podle e-mailu; žádné automatické role nebo pozvánky. Backend kontrakty jsou předané skutečnými crew-backend.ts a crew-model.ts; jiné moduly nejsou potřeba.
