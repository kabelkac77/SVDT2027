'use strict';
// All people and assignments are invented. No source workbook values are used.
// UI-only projections are demonstrations, not API/DB authorization.
const crewApp = document.getElementById('crew-app');
const crewDialog = document.getElementById('crew-dialog');
const crewDialogContent = document.getElementById('crew-dialog-content');
const ce = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const cn = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const states = {candidate:'Kandidát',contacted:'Oslovený',negotiating:'Řeší se',agreed:'Domluvený',declined:'Odmítnutý'};
const assignmentStates = {tentative:'Předběžně',confirmed:'Potvrzeno',cancelled:'Zrušeno'};
const seedCrew = () => ({
  historyReview:[
    {id:'h1',kind:'person',label:'Fiktivní osoba H01',description:'Ve vymyšlené historii je potvrzená účast. Pro nový ročník potvrzení neplatí.',decision:'defer',target:''},
    {id:'h2',kind:'person',label:'Fiktivní osoba H02',description:'Možná shoda s existující osobou; kontakt se liší. Nic se nesloučí podle jména.',decision:'defer',target:''},
    {id:'h3',kind:'group',label:'Fiktivní skupina pomocníků',description:'Chybí konkrétní jména a termíny. Nelze vytvořit potvrzené osoby.',decision:'defer',target:''},
    {id:'h4',kind:'vacancy',label:'Fiktivní volná pozice',description:'Plánovaná potřeba bez jména a ověřeného počtu lidí.',decision:'defer',target:''},
    {id:'h5',kind:'summary',label:'Fiktivní souhrnný řádek',description:'Souhrn není člověk ani samostatná platba.',decision:'defer',target:''}
  ],
  people: Array.from({length:12},(_,i)=>({id:`c${String(i+1).padStart(2,'0')}`,name:`Fiktivní člen crew ${String(i+1).padStart(2,'0')}`,state:['agreed','agreed','negotiating','contacted','candidate','agreed','agreed','agreed','declined','candidate','agreed','negotiating'][i],area:['Stavba','Stavba','Stavba','Stavba','Komisaři','Komisaři','Registrace','Foto','Foto','Doprava','Doprava','Registrace'][i],email:i%3===0?`crew-${String(i+1).padStart(2,'0')}@example.invalid`:'',owner:i<6?'Koordinátor A':'Koordinátor B',availability:i===2?'Pátek jen část dne, upřesnit.':'Dostupnost k ověření při domluvě.',note:i===0?'Modelová interní poznámka. Jiný obsah než instrukce pro crew.':''})),
  requirements:[
    {id:'r1',title:'Příprava stavby',area:'Stavba',day:'2027-04-23',from:'14:00',to:'18:00',need:3,place:'Modelové zázemí A',leader:'Vedoucí stavby A',instructions:'Přijď k modelovému zázemí A. Další práci rozdělí vedoucí.'},
    {id:'r2',title:'Ranní kontrola stavby',area:'Stavba',day:'2027-04-24',from:'07:00',to:'09:00',need:2,place:'Modelové zázemí A',leader:'Vedoucí stavby A',instructions:'Vyčkej na zadání vedoucího.'},
    {id:'r3',title:'Komisaři · úsek A',area:'Komisaři',day:'2027-04-24',from:'10:00',to:'17:00',need:3,place:'Modelový úsek A',leader:'Vedoucí úseku A',instructions:'Pokyny k místu a střídání je nutné doplnit.'},
    {id:'r4',title:'Registrace · ráno',area:'Registrace',day:'2027-04-24',from:'07:00',to:'10:00',need:2,place:'Modelový vstup A',leader:'Vedoucí registrací A',instructions:'Po příchodu se ohlas vedoucímu.'},
    {id:'r5',title:'Foto · příprava a závod',area:'Foto',day:'2027-04-24',from:'09:00',to:'17:00',need:null,place:'Místo srazu neurčené',leader:'Kontakt neurčený',instructions:'Rozsah se ještě domlouvá.'},
    {id:'r6',title:'Doprava materiálu',area:'Doprava',day:'2027-04-23',from:'12:00',to:'16:00',need:2,place:'Modelový sklad A',leader:'Vedoucí dopravy A',instructions:'Počkej na potvrzení konkrétního zadání.'}
  ],
  assignments:[
    {id:'a1',person:'c01',requirement:'r1',state:'confirmed'},
    {id:'a2',person:'c02',requirement:'r1',state:'tentative'},
    {id:'a3',person:'c01',requirement:'r2',state:'confirmed'},
    {id:'a4',person:'c06',requirement:'r3',state:'tentative'},
    {id:'a5',person:'c07',requirement:'r4',state:'confirmed'},
    {id:'a6',person:'c08',requirement:'r5',state:'confirmed'},
    {id:'a7',person:'c11',requirement:'r6',state:'tentative'}
  ]
});
let crewData=seedCrew(), crewProfile='leadership', crewScenario='ready', crewFilters={q:'',area:'all',state:'active'}, crewDirty=false, crewBusy=false, crewReturn=null, crewSerial=20;
const crewRoute=()=>location.hash.slice(1)||'people';
const crewLocked=()=>['archive','offline'].includes(crewScenario);
const visiblePeople=()=>crewData.people.filter(p=>crewProfile==='leadership'||(crewProfile==='zone'?(p.area==='Stavba'||crewData.assignments.some(a=>a.person===p.id&&a.state!=='cancelled'&&crewData.requirements.some(r=>r.id===a.requirement&&r.area==='Stavba'))):p.id==='c01'));
const visibleRequirements=()=>crewData.requirements.filter(r=>crewProfile==='leadership'||(crewProfile==='zone'?r.area==='Stavba':crewData.assignments.some(a=>a.person==='c01'&&a.requirement===r.id&&a.state!=='cancelled')));
const visibleAssignments=()=>crewData.assignments.filter(a=>visiblePeople().some(p=>p.id===a.person)&&visibleRequirements().some(r=>r.id===a.requirement));
const fmtSlot=r=>`${r.day.split('-').reverse().join('. ')} · ${r.from}–${r.to}`;
const crewBadge=(text,good=false)=>`<span class="status ${good?'good':''}">${ce(text)}</span>`;
const crewButton=(text,action,attrs='',disabled=false)=>`<button type="button" data-crew-action="${action}" ${attrs} ${disabled?'disabled':''}>${ce(text)}</button>`;
const crewOption=(map,selected)=>Object.entries(map).map(([v,label])=>`<option value="${ce(v)}" ${v===selected?'selected':''}>${ce(label)}</option>`).join('');
const crewNotice=text=>`<div class="notice">${text}</div>`;
function crewHead(title,help,actions=''){return `<div class="page-head"><div><h1>${ce(title)}</h1><p>${ce(help)}</p></div><div class="actions">${actions}</div></div>`;}
function crewTabs(){return `<div class="crew-tabs"><a href="#people" ${crewRoute()==='people'?'aria-current="page"':''}>Lidé</a><a href="#coverage" ${crewRoute()==='coverage'?'aria-current="page"':''}>Obsazenost</a></div>`;}
function crewMessage(text){const el=document.getElementById('crew-feedback');el.textContent=text;el.classList.add('visible');}
function crewAssignmentsFor(p){return visibleAssignments().filter(a=>a.person===p.id&&a.state!=='cancelled').map(a=>({a,r:crewData.requirements.find(r=>r.id===a.requirement)}));}
function crewList(){
 const people=visiblePeople().filter(p=>(!crewFilters.q||cn(`${p.name} ${p.email} ${p.area}`).includes(cn(crewFilters.q)))&&(crewFilters.area==='all'||p.area===crewFilters.area)&&(crewFilters.state==='active'?p.state!=='declined':crewFilters.state==='all'||p.state===crewFilters.state));
 const areas=Object.fromEntries([...new Set(visiblePeople().map(p=>p.area))].map(a=>[a,a]));
 const assignments=p=>crewAssignmentsFor(p).map(({a,r})=>`<small>${ce(r.title)} · ${ce(fmtSlot(r))} · ${ce(assignmentStates[a.state])}</small>`).join('')||'<small>Bez konkrétního přidělení</small>';
 const contact=p=>p.email?ce(p.email):'Kontakt chybí';
 return crewHead('Lidi a crew','Jeden člověk, více možných prací a termínů.',crewButton('Přidat člověka','new','class="primary"',crewLocked()||crewProfile!=='leadership'))+crewTabs()+`<div class="toolbar crew-filters"><label class="search">Hledat člověka<input id="crew-search" type="search" value="${ce(crewFilters.q)}" placeholder="Jméno, oblast nebo kontakt"></label><label>Oblast<select id="crew-area">${crewOption({all:'Všechny dostupné',...areas},crewFilters.area)}</select></label><label>Domluva pro ročník<select id="crew-state">${crewOption({active:'Bez odmítnutých',all:'Všechny stavy',...states},crewFilters.state)}</select></label></div><p class="count" id="crew-count" aria-live="polite">${people.length} z ${visiblePeople().length} osob v dostupném rozsahu · stavy jsou návrh C1</p><div id="crew-results">${people.length?`<div class="table-wrap crew-roster"><table><caption>Fiktivní lidé · obecná domluva není potvrzení směny</caption><thead><tr><th>Člověk / oblast</th><th>Domluva pro ročník</th><th>Přidělení</th><th>Kdo řeší</th><th>Kontakt</th></tr></thead><tbody>${people.map(p=>`<tr><td><a class="crew-name" href="#person/${p.id}">${ce(p.name)}</a><small>${ce(p.area)}</small></td><td>${crewBadge(states[p.state])}</td><td>${assignments(p)}</td><td>${ce(p.owner)}</td><td>${contact(p)}</td></tr>`).join('')}</tbody></table></div><div class="crew-list">${people.map(p=>`<article class="crew-card"><h2><a href="#person/${p.id}">${ce(p.name)}</a></h2><p>${ce(p.area)} · ${ce(p.owner)}</p>${crewBadge(states[p.state])}${assignments(p)}<p class="safe-wrap">${contact(p)}</p></article>`).join('')}</div>`:'<div class="empty"><h2>Nikdo neodpovídá filtrům</h2><p>Změň hledání nebo filtry.</p></div>'}</div>`;
}
function requirementCard(r){
 const assignments=visibleAssignments().filter(a=>a.requirement===r.id&&a.state!=='cancelled');
 const confirmed=assignments.filter(a=>a.state==='confirmed').length;
 const tentative=assignments.filter(a=>a.state==='tentative').length;
 const fullScope=crewProfile==='leadership'||crewProfile==='zone';
 const coverage=fullScope?(r.need===null?'Potřeba neurčená':`${confirmed}/${r.need} potvrzeno · zbývá míst: ${Math.max(0,r.need-confirmed)}`):'Tvoje přidělení';
 return `<section class="section crew-requirement" data-requirement="${r.id}"><div class="page-head"><div><h2>${ce(r.title)}</h2><p>${ce(fmtSlot(r))}</p></div>${crewBadge(coverage,r.need!==null&&confirmed>=r.need&&fullScope)}</div><div class="crew-meta"><span>${ce(r.area)}</span><span>${ce(r.place)}</span><span>${ce(r.leader)}</span></div>${fullScope?`<p>${tentative} předběžně · ${r.need===null?'Počet potřebných míst je nutné doplnit.':'Předběžní lidé se do potvrzeného pokrytí nepočítají.'}</p>`:''}<ul>${assignments.map(a=>{const p=visiblePeople().find(p=>p.id===a.person);return `<li><a href="#person/${p.id}">${ce(p.name)}</a> · ${ce(assignmentStates[a.state])}</li>`;}).join('')||'<li>Nikdo nepřidělen</li>'}</ul>${fullScope?`<div class="actions">${crewButton('Přidělit člověka','assign',`data-requirement="${r.id}"`,crewLocked())}${crewButton('Upravit termín / potřebu','requirement',`data-requirement="${r.id}"`,crewLocked())}</div>`:''}</section>`;
}
function crewCoverage(){
 const reqs=visibleRequirements(), assigns=visibleAssignments().filter(a=>a.state==='confirmed');
 return crewHead('Obsazenost','Potvrzené přidělení musí pokrývat konkrétní práci a termín.')+crewTabs()+`<div class="summary-grid crew-summary"><div class="summary"><span>Potvrzená přidělení</span><strong class="value">${assigns.length}</strong><small>Počet míst/směn, nikoli osob</small></div><div class="summary"><span>Konkrétní potvrzení lidé</span><strong class="value">${new Set(assigns.map(a=>a.person)).size}</strong><small>Stejný člověk se zde počítá jednou</small></div><div class="summary"><span>Potřeba bez počtu</span><strong class="value">${reqs.filter(r=>r.need===null).length}</strong><small>Nelze prohlásit za plně obsazené</small></div></div>${reqs.map(requirementCard).join('')}`;
}
const reviewKinds={person:'Osoba',group:'Skupina',vacancy:'Pozice bez člověka',summary:'Souhrn'};
const reviewDecisions={defer:'Nechat otevřené',candidate:'Návrh nového kandidáta',link:'Návrh propojení s osobou',requirement:'Návrh personální potřeby',skip:'Přeskočit'};
function crewHistoryReview(){
 if(crewProfile!=='leadership')return '<div class="empty"><h1>Převzetí historie není v tomto pohledu dostupné</h1><a href="#people">Zpět na lidi</a></div>';
 return crewHead('Převzetí historie','Vymyšlená kontrolní fronta C06. Žádný skutečný sešit se zde nečte ani neimportuje.')+crewNotice('Volba uloží pouze návrh řešení řádku v této ukázce. Nevytvoří osobu, nepotvrdí účast, nepřepíše kontakt a nevytvoří finanční závazek. Soukromé zdroje patří do samostatného kontrolovaného procesu.')+crewData.historyReview.map(row=>`<section class="section crew-requirement" data-review="${row.id}"><div class="page-head"><div><h2>${ce(row.label)}</h2><p>${ce(reviewKinds[row.kind])}</p></div>${crewBadge(reviewDecisions[row.decision])}</div><p>${ce(row.description)}</p>${row.target?`<p>Navržená osoba: ${ce(crewData.people.find(p=>p.id===row.target)?.name||'Není vybraná')}</p>`:''}<div class="actions">${crewButton('Posoudit řádek','review',`data-review="${row.id}"`,crewLocked())}</div></section>`).join('');
}
function crewPerson(id){
 const p=visiblePeople().find(p=>p.id===id);
 if(!p)return '<div class="empty"><h1>Osoba není v dostupném rozsahu</h1><p>Návrhová simulace neukazuje detail mimo zvolený pohled.</p><a href="#people">Zpět na seznam</a></div>';
 const own=crewProfile==='self', assignments=crewAssignmentsFor(p);
 return `<a class="breadcrumb" href="#people">← Zpět na lidi</a>`+crewHead(p.name,`${p.area} · ${states[p.state]}`)+`<div class="detail-grid"><section class="section"><h2>Kontakt a domluva</h2><p class="safe-wrap">${ce(p.email||'Kontakt chybí')}</p><p>Telefon není v tomto fiktivním příkladu doplněný.</p><p>Kdo řeší přípravu: ${ce(p.owner)}</p><p>${crewBadge(states[p.state])}</p><p class="form-help">Globální kontakt a ročníkové přidělení jsou oddělené. Odměny nejsou součástí provozního pohledu.</p>${!own?crewButton('Zapsat poznámku','note',`data-person="${p.id}"`,crewLocked()):''}</section><div><section class="section"><h2>${own?'Tvoje práce':'Přidělení v aktuálním ročníku'}</h2>${assignments.map(({a,r})=>`<article class="crew-assignment"><h3>${ce(r.title)}</h3><p>${ce(fmtSlot(r))}</p><p>${crewBadge(assignmentStates[a.state],a.state==='confirmed')}</p><p>${ce(r.place)} · ${ce(r.leader)}</p><p>${ce(r.instructions)}</p>${!own?crewButton('Změnit potvrzení','assignment-state',`data-assignment="${a.id}"`,crewLocked()):crewNotice('Příchod a dokončení úkolu ještě nemají schváleného zapisovatele (A3).')}</article>`).join('')||'<p>Zatím bez konkrétní práce a termínu.</p>'}</section>${!own?`<section class="section"><h2>Dostupnost a interní poznámka</h2><p>${ce(p.availability)}</p><p>${ce(p.note||'Bez interní poznámky.')}</p><p class="form-help">Tento blok není crew instrukce. Provozní pohled jej nezobrazuje.</p></section>`:''}</div></div>`;
}
function crewRender(){
 document.getElementById('crew-feedback').classList.remove('visible');
 crewApp.classList.toggle('crew-own',crewProfile==='self');
 document.getElementById('crew-edition').textContent=crewScenario==='archive'?'SVDT 2026 · archivní simulace':'SVDT 2027 · návrh';
 document.getElementById('coverage-nav').hidden=crewProfile==='self';
 document.getElementById('history-review-nav').hidden=crewProfile!=='leadership';
 let banner=crewNotice('<strong>Pracovní návrh C1–C8.</strong> Lidé i termíny jsou vymyšlené. Návrh čeká na společný průchod.');
 if(crewProfile!=='leadership')banner+=crewNotice('Omezený pohled je návrhová ukázka C5. Skutečné přístupy se budou teprve nastavovat.');
 if(crewScenario==='archive')banner+=crewNotice('<strong>Jen pro čtení.</strong> Zobrazená jsou stejná fiktivní data, nejde o načtenou historii.');
 if(crewScenario==='offline')banner+=crewNotice('<strong>Bez spojení.</strong> Modelová data jsou stará; zápis se nepotvrdí. Offline synchronizace není součástí návrhu.');
 if(['save-error','conflict'].includes(crewScenario))banner+=crewNotice('Simulace: změna selže a formulář zůstane zachovaný.');
 let content;
 if(crewProfile==='self')content=crewPerson('c01');
 else if(crewRoute()==='history-review')content=crewHistoryReview();
 else if(crewRoute()==='coverage')content=crewCoverage();
 else if(crewRoute().startsWith('person/'))content=crewPerson(crewRoute().split('/')[1]);
 else content=crewList();
 crewApp.innerHTML=banner+content;
 document.querySelectorAll('.sidebar nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===`#${crewRoute()}`));
}
function openCrewDialog(title,body){crewReturn=document.activeElement;crewDirty=false;crewDialogContent.innerHTML=`<div class="dialog-head"><h2 id="crew-dialog-title">${ce(title)}</h2>${crewButton('Zavřít','close')}</div>${body}`;crewDialog.showModal();setTimeout(()=>crewDialog.querySelector('input:not([type=hidden]),select,textarea')?.focus(),0);}
function closeCrewDialog(force=false){
 if(crewBusy)return false;
 if(!force&&crewDirty){
  if(!crewDialogContent.querySelector('.crew-discard')){
   const warning=document.createElement('div');warning.className='notice crew-discard';warning.setAttribute('role','alert');
   warning.innerHTML=`<p>Zahodit rozpracované změny návrhu?</p><div class="actions">${crewButton('Zahodit změny','discard')}${crewButton('Pokračovat v úpravách','keep-editing')}</div>`;
   crewDialogContent.append(warning);warning.querySelector('button').focus();
  }
  return false;
 }
 crewDirty=false;crewDialog.close();crewDialogContent.innerHTML='';if(crewReturn&&document.contains(crewReturn))crewReturn.focus();return true;
}
const crewFormEnd='<div class="form-actions"><button type="submit" class="primary">Uložit do návrhu</button><button type="button" data-crew-action="close">Zrušit</button></div></form>';
function crewOpenAction(action,el){
 if(action==='close'){closeCrewDialog();return;}
 if(action==='discard'){closeCrewDialog(true);return;}
 if(action==='keep-editing'){crewDialogContent.querySelector('.crew-discard')?.remove();crewDialog.querySelector('input,select,textarea')?.focus();return;}
 if(crewLocked()||crewProfile==='self')return;
 if(action==='review'&&crewProfile==='leadership'){
  const row=crewData.historyReview.find(r=>r.id===el.dataset.review);if(!row)return;
  const choices={defer:reviewDecisions.defer,...(row.kind==='person'?{candidate:reviewDecisions.candidate,link:reviewDecisions.link}:{}),...(row.kind==='vacancy'?{requirement:reviewDecisions.requirement}:{}),skip:reviewDecisions.skip};
  openCrewDialog('Posoudit historický řádek',`<form data-crew-form="review" data-review="${row.id}"><p>${ce(row.label)} · ${ce(reviewKinds[row.kind])}</p><label>Návrh řešení<select name="decision">${crewOption(choices,row.decision)}</select></label>${row.kind==='person'?`<label>Existující osoba pro případné propojení<select name="target"><option value="">Vyber pouze pro návrh propojení</option>${crewOption(Object.fromEntries(crewData.people.map(p=>[p.id,p.name])),row.target)}</select></label>`:''}<p class="form-help">Pouze pracovní návrh. Historické potvrzení, platba ani rozdílný kontakt se nepřevezmou do nového ročníku. Skutečné identity a zdrojové nejasnosti se řeší soukromě.</p>${crewFormEnd}`);
 }
 if(action==='new'&&crewProfile==='leadership')openCrewDialog('Přidat člověka',`<form data-crew-form="new"><label>Jméno<input name="name" required maxlength="100"></label><label>Oblast<select name="area">${crewOption(Object.fromEntries(['Stavba','Komisaři','Registrace','Foto','Doprava'].map(v=>[v,v])),'Stavba')}</select></label><p class="form-help">Vznikne kandidát, nikoli potvrzená účast nebo přihlášený účet.</p>${crewFormEnd}`);
 if(action==='assign'){
  const r=visibleRequirements().find(r=>r.id===el.dataset.requirement);if(!r)return;
  const ps=visiblePeople().filter(p=>p.state!=='declined'&&!crewData.assignments.some(a=>a.person===p.id&&a.requirement===r.id&&a.state!=='cancelled'));
  openCrewDialog('Přidělit člověka',`<form data-crew-form="assign" data-requirement="${r.id}"><p>${ce(r.title)} · ${ce(fmtSlot(r))}</p><label>Konkrétní člověk<select name="person" required><option value="">Vyber člověka</option>${crewOption(Object.fromEntries(ps.map(p=>[p.id,p.name])), '')}</select></label><label>Potvrzení pro tento termín<select name="state">${crewOption({tentative:'Předběžně',confirmed:'Potvrzeno'},'tentative')}</select></label><p class="form-help">Potvrzení zaznamenává odpověď člověka pro uvedenou práci a celý termín; neposílá zprávu. Dostupnost a souběh jiných prací je nutné ověřit ručně.</p>${crewFormEnd}`);
 }
 if(action==='assignment-state'){
  const a=visibleAssignments().find(a=>a.id===el.dataset.assignment);if(!a)return;const r=crewData.requirements.find(r=>r.id===a.requirement);
  openCrewDialog('Potvrzení přidělení',`<form data-crew-form="assignment-state" data-assignment="${a.id}"><p>${ce(r.title)} · ${ce(fmtSlot(r))}</p><label>Stav<select name="state">${crewOption(assignmentStates,a.state)}</select></label><p class="form-help">Potvrzeno znamená, že konkrétní člověk odsouhlasil celý uvedený termín. Neznamená to příchod ani zaplacení.</p>${crewFormEnd}`);
 }
 if(action==='note'){
  const p=visiblePeople().find(p=>p.id===el.dataset.person);if(!p)return;
  openCrewDialog('Interní ročníková poznámka',`<form data-crew-form="note" data-person="${p.id}"><label>Poznámka<textarea name="note" rows="4" maxlength="1000">${ce(p.note)}</textarea></label><p class="form-help">Nejde o instrukci viditelnou běžné crew. Modelový rozsah čeká na C5.</p>${crewFormEnd}`);
 }
 if(action==='requirement'){
  const r=visibleRequirements().find(r=>r.id===el.dataset.requirement);if(!r)return;
  openCrewDialog('Termín a potřeba lidí',`<form data-crew-form="requirement" data-requirement="${r.id}"><label>Modelový den<input type="date" name="day" required value="${r.day}"></label><div class="form-grid"><label>Od<input type="time" name="from" required value="${r.from}"></label><label>Do<input type="time" name="to" required value="${r.to}"></label></div><label>Potřebný počet<input type="number" name="need" min="1" max="100" step="1" value="${r.need??''}"></label><p class="form-help">Prázdná potřeba znamená neurčenou. Tento průchod ukazuje směnu v jednom dni.</p><div class="notice crew-dialog-warning">Změna dne nebo času vrátí potvrzená přidělení této práce do „Předběžně“. Potvrzení nového termínu je nutné znovu zaznamenat. Změna samotného počtu potvrzení neruší.</div>${crewFormEnd}`);
 }
}
function crewFormError(form,text){let e=form.querySelector('.crew-error');if(!e){e=document.createElement('div');e.className='crew-error';e.setAttribute('role','alert');e.tabIndex=-1;form.prepend(e);}e.textContent=text;e.focus();}
document.addEventListener('click',event=>{const el=event.target.closest('[data-crew-action]');if(el)crewOpenAction(el.dataset.crewAction,el);});
crewDialog.addEventListener('input',()=>{crewDirty=true;});crewDialog.addEventListener('change',()=>{crewDirty=true;});
crewDialog.addEventListener('cancel',event=>{event.preventDefault();closeCrewDialog();});
crewDialog.addEventListener('submit',async event=>{
 event.preventDefault();const form=event.target;if(crewBusy)return;
 try{
  if(crewLocked()||crewProfile==='self')throw new Error('V tomto pohledu nelze změnu uložit.');
  const values=Object.fromEntries(new FormData(form));const kind=form.dataset.crewForm;
  if(kind==='review'){
   const row=crewData.historyReview.find(r=>r.id===form.dataset.review);
   if(crewProfile!=='leadership'||!row)throw new Error('Řádek není v dostupném rozsahu.');
   const allowed=row.kind==='person'?['defer','candidate','link','skip']:row.kind==='vacancy'?['defer','requirement','skip']:['defer','skip'];
   if(!allowed.includes(values.decision))throw new Error('Toto řešení neodpovídá typu řádku.');
   if(values.decision==='link'&&!crewData.people.some(p=>p.id===values.target))throw new Error('Pro návrh propojení vyber konkrétní existující osobu.');
  }
  if(kind==='new'&&!values.name.trim())throw new Error('Vyplň jméno.');
  if(kind==='requirement'&&(!values.day||values.from>=values.to))throw new Error('Konec musí být po začátku ve stejném dni.');
  if(kind==='requirement'&&values.need!==''&&(!Number.isInteger(Number(values.need))||Number(values.need)<1||Number(values.need)>100))throw new Error('Potřeba musí být celé číslo 1–100 nebo prázdná.');
  const requirement=visibleRequirements().find(r=>r.id===form.dataset.requirement);
  const assignment=visibleAssignments().find(a=>a.id===form.dataset.assignment);
  if(['assign','requirement'].includes(kind)&&!requirement)throw new Error('Práce není v dostupném rozsahu.');
  if(kind==='assign'&&(!visiblePeople().some(p=>p.id===values.person&&p.state!=='declined')||crewData.assignments.some(a=>a.person===values.person&&a.requirement===requirement.id&&a.state!=='cancelled')))throw new Error('Vyber dostupnou osobu bez stejného aktivního přidělení.');
  if(kind==='assignment-state'&&!assignment)throw new Error('Přidělení není v dostupném rozsahu.');
  crewBusy=true;form.querySelector('[type=submit]').disabled=true;
  await new Promise(resolve=>setTimeout(resolve,100));
  if(crewScenario==='save-error')throw new Error('Uložení selhalo. Rozpracovaný obsah zůstává.');
  if(crewScenario==='conflict')throw new Error('Záznam změnil někdo jiný. Návrh zůstává, cizí změnu nepřepisujeme.');
  if(kind==='new')crewData.people.push({id:`c${++crewSerial}`,name:values.name.trim(),area:values.area,state:'candidate',email:'',owner:'Koordinátor neurčený',availability:'Dostupnost nezjištěná.',note:''});
  if(kind==='review')Object.assign(crewData.historyReview.find(r=>r.id===form.dataset.review),{decision:values.decision,target:values.decision==='link'?values.target:''});
  if(kind==='assign')crewData.assignments.push({id:`a${++crewSerial}`,person:values.person,requirement:requirement.id,state:values.state});
  if(kind==='assignment-state')assignment.state=values.state;
  if(kind==='note')visiblePeople().find(p=>p.id===form.dataset.person).note=values.note.trim();
  if(kind==='requirement'){
   const changed=requirement.day!==values.day||requirement.from!==values.from||requirement.to!==values.to;
   Object.assign(requirement,{day:values.day,from:values.from,to:values.to,need:values.need===''?null:Number(values.need)});
   if(changed)crewData.assignments.filter(a=>a.requirement===requirement.id&&a.state==='confirmed').forEach(a=>{a.state='tentative';});
  }
  crewBusy=false;closeCrewDialog(true);crewRender();crewMessage('Změna je jen v otevřeném návrhu. Reload ji resetuje.');
 }catch(error){crewFormError(form,error.message);}finally{crewBusy=false;const submit=form.querySelector('[type=submit]');if(submit)submit.disabled=false;}
});
crewApp.addEventListener('input',event=>{if(event.target.id==='crew-search'){const focus=event.target.selectionStart;crewFilters.q=event.target.value;crewRender();const input=document.getElementById('crew-search');input.focus();input.setSelectionRange(focus,focus);}});
crewApp.addEventListener('change',event=>{if(event.target.id==='crew-area')crewFilters.area=event.target.value;if(event.target.id==='crew-state')crewFilters.state=event.target.value;crewRender();});
function crewSwitch(el,change){if(crewBusy){crewMessage('Vyčkej na dokončení modelové změny.');return false;}if(crewDialog.open&&!closeCrewDialog())return false;change();document.getElementById('sidebar').classList.remove('open');document.getElementById('crew-menu').setAttribute('aria-expanded','false');crewRender();return true;}
document.getElementById('crew-profile').addEventListener('change',event=>{const previous=crewProfile;if(!crewSwitch(event.target,()=>{crewProfile=event.target.value;crewFilters={q:'',area:'all',state:'active'};}))event.target.value=previous;});
document.getElementById('crew-scenario').addEventListener('change',event=>{const previous=crewScenario;if(!crewSwitch(event.target,()=>{crewScenario=event.target.value;}))event.target.value=previous;});
document.getElementById('crew-theme').addEventListener('change',event=>{document.documentElement.dataset.theme=event.target.value;});
document.getElementById('crew-reset').addEventListener('click',()=>{crewSwitch(null,()=>{crewData=seedCrew();crewFilters={q:'',area:'all',state:'active'};crewScenario='ready';document.getElementById('crew-scenario').value='ready';});});
document.getElementById('crew-menu').addEventListener('click',event=>{const open=document.getElementById('sidebar').classList.toggle('open');event.target.setAttribute('aria-expanded',String(open));});
document.getElementById('crew-controls-toggle').addEventListener('click',event=>{const open=document.querySelector('.prototype-bar').classList.toggle('expanded');event.target.setAttribute('aria-expanded',String(open));event.target.textContent=open?'Skrýt možnosti návrhu':'Zobrazit možnosti návrhu';});
window.addEventListener('hashchange',()=>{document.getElementById('sidebar').classList.remove('open');document.getElementById('crew-menu').setAttribute('aria-expanded','false');crewRender();});
window.addEventListener('beforeunload',event=>{if(crewDirty||crewBusy){event.preventDefault();event.returnValue='';}});
crewRender();
