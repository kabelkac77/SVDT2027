'use strict';
// Local workspace only. Real data arrives from the same-origin private service.
const workspace={token:null,draft:null,dirty:false,saving:false,pending:null,includeArchived:false,lastSaved:null,categoryDirty:false,categoryId:null,categoryVersion:0,categoryRequest:null};
const we=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colorNames=['Modrá','Fialová','Tyrkysová','Oranžová','Růžová','Zelená','Indigo','Hnědá','Olivová','Azurová','Vínová','Šedá'];
const workStatuses={candidate:'Neoslovený / kandidát',contacted:'Poptaný',confirmed:'Potvrzený',declined:'Odmítl',unknown:'K ověření'};
const workTextKeys=['name','categoryId','position','owner','email','phone','contactOriginal','statusNote','notes','barter','merch','term'];
const uuid=()=>crypto.randomUUID();
function minorInput(value){return value===null||value===undefined?'':`${Math.floor(value/100)},${String(value%100).padStart(2,'0')}`;}
function workInput(label,name,value,area=false){return `<label>${we(label)}${area?`<textarea name="${name}" rows="3">${we(value)}</textarea>`:`<input name="${name}" value="${we(value)}" ${name==='name'?'required maxlength="200"':''}>`}</label>`;}
function workOptions(map,value){return Object.entries(map).map(([id,label])=>`<option value="${we(id)}" ${id===value?'selected':''}>${we(label)}</option>`).join('');}
function workNotice(text){const el=document.getElementById('workspace-notice');if(el){el.textContent=text;el.hidden=false;const controls=document.getElementById('sheet-controls');if(controls)controls.open=true;}}
function resetWorkControls(){document.getElementById('sheet-search').value=sheetQuery;document.getElementById('sheet-status').value=sheetStatus;document.getElementById('sheet-category').value=sheetCategory;document.getElementById('sheet-year').value=sheetYear;}
function cleanDraft(){if(workspace.draft?.version===0)sheetData.records=sheetData.records.filter(r=>r.id!==workspace.draft.id);workspace.draft=null;workspace.dirty=false;}
function navigateWork(change){
 if(workspace.saving){resetWorkControls();workNotice('Probíhá ukládání. Vyčkej na potvrzení.');return;}
 if(workspace.dirty){resetWorkControls();workspace.pending=change;let guard=document.getElementById('workspace-unsaved');if(!guard){guard=document.createElement('div');guard.id='workspace-unsaved';guard.className='workspace-error';guard.setAttribute('role','alert');guard.innerHTML='<p>Máš rozepsané neuložené změny.</p><div class="actions"><button type="button" data-work-action="stay">Zůstat u úprav</button><button type="button" data-work-action="discard-navigate">Zahodit a pokračovat</button></div>';document.getElementById('workspace-editor')?.prepend(guard);}guard?.querySelector('button').focus();return;}
 cleanDraft();change();
}
function renderWorkDetail(record){
 if(!workspace.draft||workspace.draft.id!==record.id)workspace.draft={id:record.id,version:record.version,fields:structuredClone(record.fields),sourceId:record.sourceId,requestId:null,fingerprint:null};
 const d=workspace.draft,f=d.fields,categories=Object.fromEntries(sheetData.categories.map(c=>[c.id,c.name]));
 const history=record.sourceId?sheetData.records.find(r=>r.id===record.sourceId&&r.year==='2026'):null;
 return `<tr class="sheet-detail" id="sheet-detail-${we(record.id)}"><td colspan="6"><form id="workspace-editor" class="workspace-editor" autocomplete="off"><div class="sheet-detail-head"><strong>${we(record.name)} · pracovní rok 2027</strong><span class="workspace-save-state">${record.version?`Uložená verze ${record.version}`:'Nový záznam · zatím neuložený'}</span></div><fieldset><div class="workspace-editor-grid"><section><h2>Člověk a zařazení</h2>${workInput('Jméno / skupina','name',f.name)}<label>Kategorie<select name="categoryId">${workOptions(categories,f.categoryId)}</select></label>${workInput('Pozice','position',f.position)}${workInput('Kdo řeší před akcí / na akci','owner',f.owner)}<label>Stav pro rok 2027<select name="status">${workOptions(workStatuses,f.status)}</select></label>${workInput('Termín / potvrzená účast','term',f.term)}${workInput('Poznámka – stav','statusNote',f.statusNote,true)}</section><section><h2>Kontakty a poznámky</h2>${workInput('E-mail','email',f.email)}${workInput('Telefon','phone',f.phone)}${workInput('Další kontakt / poznámka ke kontaktu','contactOriginal',f.contactOriginal,true)}${workInput('Obecná poznámka','notes',f.notes,true)}<label class="workspace-check"><input type="checkbox" name="archived" ${f.archived?'checked':''}>Vyřadit jen z pracovní evidence 2027</label><p class="workspace-help">Vyřazeného člověka najdeš přes „Včetně vyřazených“. Historie zůstává.</p></section><section><h2>Domluva pro rok 2027</h2>${workInput('Kč nástřel','amount-estimate',minorInput(f.money.estimate))}${workInput('Domluvené peníze v Kč','amount-agreed',minorInput(f.money.agreed))}${workInput('Barter','barter',f.barter,true)}${workInput('Merch','merch',f.merch)}${workInput('Celková hodnota v Kč','amount-total',minorInput(f.money.total))}${workInput('Vyplaceno v Kč','amount-paid',minorInput(f.money.paid))}<p class="workspace-help">Prázdné = neurčené; 0 = známá nula. Vyplaceno je ruční evidence, ne bankovní příkaz.</p></section></div></fieldset><div class="workspace-form-actions"><button type="submit" class="primary" id="workspace-save" ${workspace.dirty?'':'disabled'}>Uložit změny</button><button type="button" data-work-action="discard">Zahodit rozepsané</button><span id="workspace-form-state" role="status">${workspace.dirty?'Neuložené změny':'Údaje pro rok 2027 můžeš rovnou upravit.'}</span></div>${history?`<details class="workspace-history"><summary>Údaje z roku 2026 · pouze pro porovnání</summary><dl>${history.raw.map(cell=>`<div class="sheet-pair"><dt>${we(cell.label)}</dt><dd>${we(cell.value??'Neuvedeno')}</dd></div>`).join('')}</dl><p>Historické částky, barter ani vyplacení se nepotvrdily pro rok 2027.</p></details>`:''}</form></td></tr>`;
}
function afterWorkRender(){
 if(!document.getElementById('workspace-actions')){
  const actions=document.createElement('div');actions.id='workspace-actions';actions.className='workspace-actions';actions.innerHTML='<button type="button" data-work-action="new" class="primary">Přidat člověka</button><button type="button" data-work-action="categories">Kategorie a barvy</button><button type="button" data-work-action="export">Stáhnout zálohu</button><button type="button" data-work-action="csv" title="Čitelný export filtrovaného ročníku. Úplnou evidenci uchovává JSON záloha.">Export CSV</button><label class="workspace-check"><input type="checkbox" id="workspace-archived">Včetně vyřazených</label>';
  document.querySelector('.sheet-heading').append(actions);
  const notice=document.createElement('div');notice.id='workspace-notice';notice.className='workspace-notice';notice.setAttribute('role','status');document.querySelector('.sheet-list-meta').after(notice);
  document.getElementById('workspace-archived').addEventListener('change',event=>{const checked=event.target.checked;navigateWork(()=>{workspace.includeArchived=checked;renderSheet();});event.target.checked=workspace.includeArchived;});
 }
 const active=sheetYear==='2027';
 document.querySelectorAll('#workspace-actions [data-work-action]').forEach(button=>{button.hidden=!active&&button.dataset.workAction!=='csv';});
 document.getElementById('workspace-archived').closest('label').hidden=!active;
 document.querySelector('.sheet-heading-help').hidden=true;
 const count=document.getElementById('sheet-count');if(active)count.textContent=count.textContent.replace('zdrojových ','');
 document.getElementById('sheet-year').setAttribute('aria-label','Ročník');const yearLabel=document.getElementById('sheet-year').parentElement;if(yearLabel.firstChild.nodeType===3)yearLabel.firstChild.textContent='Ročník';
 document.getElementById('sheet-privacy').textContent='Soukromá pracovní evidence · ukládá se na tomto počítači';
 document.getElementById('sheet-origin-note').textContent=active?'Pracovní kopie; původní údaje zůstávají v historii.':'Historie · pouze pro čtení';
 document.getElementById('sheet-footnote').textContent=active?'Změnu vždy potvrď tlačítkem Uložit změny.':'Historická data zůstávají zachovaná, úpravy jsou dostupné v roce 2027.';
 document.getElementById('workspace-notice').textContent=active?(workspace.lastSaved?`Uloženo na tomto počítači · ${new Date(workspace.lastSaved).toLocaleTimeString('cs-CZ',{timeZone:'Europe/Prague'})}`:'Rok 2027: uprav lidi a přiřazení do kategorií. Účast a finanční domluvy doplň nově.'):`Rok ${sheetYear} je historie a nelze jej přepsat.`;
 document.querySelectorAll('#workspace-editor input[name^="amount-"]').forEach(input=>{input.inputMode='decimal';});
}
function markWorkDirty(){workspace.dirty=true;const save=document.getElementById('workspace-save');if(save)save.disabled=false;const state=document.getElementById('workspace-form-state');if(state)state.textContent='Neuložené změny';}
function collectWorkForm(form){
 const values=Object.fromEntries(new FormData(form)),fields={};
 for(const key of workTextKeys)fields[key]=String(values[key]??'');
 fields.status=values.status;fields.archived=values.archived==='on';fields.amounts={};for(const key of ['estimate','agreed','total','paid'])fields.amounts[key]=String(values['amount-'+key]??'');
 return fields;
}
async function workApi(path,body){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),10000);
 try{
  const send=()=>fetch(path,{method:body?'PUT':'GET',cache:'no-store',headers:body?{'Content-Type':'application/json','X-SVDT-CSRF':workspace.token}:{},body:body?JSON.stringify(body):undefined,signal:abort.signal});
  let response=await send();
  if(body&&response.status===403){const fresh=await fetch('/api/bootstrap',{cache:'no-store',signal:abort.signal});if(fresh.ok){workspace.token=(await fresh.json()).token;response=await send();}}
  const payload=await response.json();if(!response.ok){const error=new Error(payload.error||'Požadavek se nepodařilo dokončit.');error.status=response.status;throw error;}return payload;
 }catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw new Error('Uložení se nepodařilo potvrdit. Údaje zůstaly rozepsané; zkus uložit znovu.');throw error;}finally{clearTimeout(timer);}
}
function workError(form,message,conflict=false){let box=form.querySelector('.workspace-error:not(#workspace-unsaved)');if(!box){box=document.createElement('div');box.className='workspace-error';box.setAttribute('role','alert');box.tabIndex=-1;form.prepend(box);}box.textContent=message;if(conflict){const button=document.createElement('button');button.type='button';button.dataset.workAction='reload-current';button.textContent='Zahodit rozepsané a načíst uloženou verzi';box.append(document.createElement('br'),button);}box.focus();}
async function saveWorkForm(form){
 if(workspace.saving||!workspace.draft)return;
 const draft=workspace.draft,fields=collectWorkForm(form),fingerprint=JSON.stringify({version:draft.version,fields});
 if(draft.fingerprint!==fingerprint){draft.requestId=uuid();draft.fingerprint=fingerprint;}
 workspace.saving=true;form.querySelector('fieldset').disabled=true;const save=form.querySelector('[type=submit]');save.disabled=true;save.textContent='Ukládám…';
 try{
  const result=await workApi('/api/records/'+draft.id,{requestId:draft.requestId,version:draft.version,year:'2027',fields});
  const at=sheetData.records.findIndex(r=>r.id===draft.id);if(at>=0)sheetData.records[at]=result.record;else sheetData.records.unshift(result.record);
  workspace.dirty=false;workspace.draft=null;workspace.lastSaved=result.record.updatedAt;workspace.saving=false;
  const leavesFilter=!filteredRows().some(r=>r.id===result.record.id);if(leavesFilter)sheetExpanded=null;
  renderSheet();if(leavesFilter)workNotice('Uloženo. Záznam nyní neodpovídá filtru; najdeš ho v jeho nové kategorii nebo mezi vyřazenými.');document.getElementById('workspace-save')?.focus({preventScroll:true});
 }catch(error){workspace.dirty=true;workError(form,error.message,error.status===409);}finally{workspace.saving=false;const current=document.getElementById('workspace-editor');if(current===form){form.querySelector('fieldset').disabled=false;save.disabled=false;save.textContent='Uložit změny';}}
}
async function reloadWorkVersion(){
 const id=workspace.draft?.id;
 try{const loaded=await workApi('/api/bootstrap');workspace.token=loaded.token;workspace.draft=null;workspace.dirty=false;Object.assign(sheetData,loaded.payload);sheetExpanded=sheetData.records.some(r=>r.id===id)?id:null;renderSheet();}catch(error){workNotice(error.message);}
}
function newWorkPerson(){navigateWork(()=>{
 const category=sheetData.categories.find(c=>c.name===sheetCategory)||sheetData.categories[0],id='new-'+uuid();
 const fields=Object.fromEntries(workTextKeys.map(k=>[k,'']));Object.assign(fields,{name:'',categoryId:category.id,status:'candidate',archived:false,money:{estimate:null,agreed:null,total:null,paid:null}});
 sheetData.records.unshift({id,year:'2027',name:'Nový člověk',category:category.name,categoryId:category.id,position:'',owner:'',email:'',phone:'',status:'candidate',statusLabel:'Neoslovený',statusBasis:'Nový pracovní záznam',cash:null,barter:'',merch:'',raw:[],extra:[],source:{sheet:'Pracovní rok 2027',row:'—'},version:0,sourceId:null,fields});
 sheetQuery='';sheetStatus='all';document.getElementById('sheet-search').value='';document.getElementById('sheet-status').value='all';sheetExpanded=id;renderSheet();document.querySelector('#workspace-editor input[name=name]')?.focus();
});}
function discardWork(){if(workspace.saving)return;const isNew=workspace.draft?.version===0;cleanDraft();if(isNew)sheetExpanded=null;renderSheet();}
function categoryForm(id){
 const category=sheetData.categories.find(c=>c.id===id);
 const chosenColor=category?.color||colorNames.map((_,i)=>'cat-'+i).find(color=>!sheetData.categories.some(c=>c.color===color))||'cat-0';
 workspace.categoryId=category?.id||'category-'+uuid();workspace.categoryVersion=category?.version||0;workspace.categoryDirty=false;workspace.categoryRequest=null;
 return `<form id="workspace-category-form"><h2>Kategorie a barevné pruhy</h2><label>Vybrat kategorii<select id="workspace-category-select"><option value="new" ${!category?'selected':''}>Nová kategorie</option>${sheetData.categories.map(c=>`<option value="${we(c.id)}" ${category?.id===c.id?'selected':''}>${we(c.name)}</option>`).join('')}</select></label><label>Název<input name="category-name" value="${we(category?.name||'')}" required maxlength="100"></label><label>Barva pruhu<select name="category-color">${colorNames.map((name,i)=>`<option value="cat-${i}" ${chosenColor===`cat-${i}`?'selected':''}>${we(name)}</option>`).join('')}</select></label><div class="workspace-category-preview ${we(chosenColor)}"><span></span><strong>${we(category?.name||'Nová kategorie')}</strong></div><p class="workspace-help">Stejný pruh označí kategorii i každého člověka v ní. Při přejmenování se zařazení lidí zachová.</p><div class="form-actions"><button type="submit" class="primary">Uložit kategorii</button><button type="button" data-work-action="close-categories">Zavřít</button></div><p id="workspace-category-result" role="status"></p></form>`;
}
function openWorkCategories(){navigateWork(()=>{
 let dialog=document.getElementById('workspace-category-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='workspace-category-dialog';dialog.setAttribute('aria-label','Kategorie a barvy');document.body.append(dialog);dialog.addEventListener('cancel',event=>{event.preventDefault();closeWorkCategories();});}
 dialog.innerHTML=categoryForm(sheetData.categories[0]?.id);dialog.showModal();dialog.querySelector('input').focus();
});}
function closeWorkCategories(force=false){if(workspace.saving)return;const dialog=document.getElementById('workspace-category-dialog');if(workspace.categoryDirty&&!force){let notice=dialog.querySelector('.workspace-category-discard');if(!notice){notice=document.createElement('div');notice.className='workspace-error workspace-category-discard';notice.innerHTML='<p>Kategorie má neuložené změny.</p><button type="button" data-work-action="discard-category">Zahodit změny kategorie a zavřít</button>';dialog.append(notice);}return;}workspace.categoryDirty=false;dialog.close();renderSheet();}
async function saveWorkCategory(form){
 if(workspace.saving)return;const name=form.elements['category-name'].value,color=form.elements['category-color'].value;
 const fingerprint=JSON.stringify({name,color,version:workspace.categoryVersion});
 if(workspace.categoryRequest?.fingerprint!==fingerprint)workspace.categoryRequest={id:uuid(),fingerprint};
 workspace.saving=true;form.querySelectorAll('input,select,button').forEach(el=>el.disabled=true);
 try{
  const result=await workApi('/api/categories/'+workspace.categoryId,{requestId:workspace.categoryRequest.id,version:workspace.categoryVersion,name,color});
  const old=sheetData.categories.find(c=>c.id===result.category.id),oldName=old?.name;
  if(old)Object.assign(old,result.category);else sheetData.categories.push(result.category);
  sheetData.records.filter(r=>r.year==='2027'&&r.categoryId===result.category.id).forEach(r=>r.category=result.category.name);
  if(sheetCategory===oldName)sheetCategory=result.category.name;
  workspace.categoryDirty=false;workspace.saving=false;workspace.draft=null;renderSheet();
  document.getElementById('workspace-category-dialog').innerHTML=categoryForm(result.category.id);document.getElementById('workspace-category-result').textContent='Kategorie a barva jsou uložené na tomto počítači.';
 }catch(error){workError(form,error.message);}finally{workspace.saving=false;form.querySelectorAll('input,select,button').forEach(el=>el.disabled=false);}
}
async function exportWork(){try{const value=await workApi('/api/export');const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='svdt-personal-pracovni-zaloha.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){workNotice(error.message);}}
function exportWorkCsv(){
 if(workspace.saving){workNotice('Probíhá ukládání. Export stáhni až po jeho dokončení.');return;}
 if(workspace.dirty||workspace.categoryDirty){workNotice('Před exportem CSV nejdřív ulož nebo zahoď rozepsané změny. Nic se nezahodilo.');return;}
 try{
  const rows=filteredRows().filter(row=>sheetYear!=='2027'||(Number.isSafeInteger(row.version)&&row.version>0));
  const result=window.SVDT_CREW_CSV.buildCsv(rows,sheetYear);
  const url=URL.createObjectURL(new Blob([result.csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=result.filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  workNotice(`CSV připraveno · ${sheetYear} · uložené záznamy: ${result.rowCount}. Úplnou evidenci uchovává JSON záloha.`);
 }catch(error){workNotice('CSV se nepodařilo připravit. Zkontroluj uložené údaje a zkus export znovu.');}
}
window.SVDT_CREW_EDITOR={renderDetail:renderWorkDetail,afterRender:afterWorkRender,navigate:navigateWork,get includeArchived(){return workspace.includeArchived;}};
document.addEventListener('input',event=>{if(event.target.closest('#workspace-editor'))markWorkDirty();if(event.target.closest('#workspace-category-form')&&event.target.id!=='workspace-category-select'){workspace.categoryDirty=true;const form=event.target.closest('form'),preview=form.querySelector('.workspace-category-preview');preview.className='workspace-category-preview '+form.elements['category-color'].value;preview.querySelector('strong').textContent=form.elements['category-name'].value;}});
document.addEventListener('change',event=>{
 if(event.target.closest('#workspace-editor'))markWorkDirty();
 if(event.target.id==='workspace-category-select'){
  if(workspace.categoryDirty){event.target.value=workspace.categoryVersion?workspace.categoryId:'new';document.getElementById('workspace-category-result').textContent='Nejdřív ulož kategorii, nebo zavři a zahoď rozepsané změny.';return;}
  document.getElementById('workspace-category-dialog').innerHTML=categoryForm(event.target.value==='new'?null:event.target.value);
 }else if(event.target.closest('#workspace-category-form')){workspace.categoryDirty=true;event.target.dispatchEvent(new Event('input',{bubbles:true}));}
});
document.addEventListener('submit',event=>{if(event.target.id==='workspace-editor'){event.preventDefault();saveWorkForm(event.target);}if(event.target.id==='workspace-category-form'){event.preventDefault();saveWorkCategory(event.target);}});
document.addEventListener('click',event=>{
 const action=event.target.closest('[data-work-action]')?.dataset.workAction;if(!action)return;
 if(action==='new')newWorkPerson();if(action==='discard')discardWork();if(action==='stay'){workspace.pending=null;document.getElementById('workspace-unsaved')?.remove();}if(action==='discard-navigate'){const next=workspace.pending;workspace.pending=null;cleanDraft();next?.();}if(action==='reload-current')reloadWorkVersion();if(action==='categories')openWorkCategories();if(action==='close-categories')closeWorkCategories();if(action==='discard-category')closeWorkCategories(true);if(action==='export')exportWork();if(action==='csv')exportWorkCsv();
});
window.addEventListener('beforeunload',event=>{if(workspace.dirty||workspace.saving||workspace.categoryDirty){event.preventDefault();event.returnValue='';}});
(async()=>{try{
 const bootstrap=await workApi('/api/bootstrap');workspace.token=bootstrap.token;window.SVDT_CREW_SHEET=bootstrap.payload;
 await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='crew-sheet.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});
 if(!new URLSearchParams(location.search).has('safe-start'))afterWorkRender();
}catch(error){const main=document.getElementById('main');main.innerHTML='<h1>Pracovní údaje se nepodařilo načíst</h1><p>Obnov stránku nebo zkontroluj spuštěný místní server. Evidence nepřechází do ukázkových dat.</p>';}})();
