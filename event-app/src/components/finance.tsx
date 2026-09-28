"use client";
import { FormEvent, useEffect, useState } from 'react';
import { Data } from '@/lib/model';
import { balances, czk, FinanceItem, FinanceState, financeKey, money, putItem, putSettlement, readFinance, Settlement } from '@/lib/finance';

const scopes = {main:'Hlavní akce',afterparty:'Afterparty',unallocated:'Nerozděleno'};
const kinds = {cash:'Převod / hotovost',personal:'Zaplaceno osobně',barter:'Barter',reimbursement:'Proplacení osobního výdaje'};
export function Finance({data,editionId,onPartner,organizationId=''}:{data:Data;editionId:string;onPartner:(id:string)=>void;organizationId?:string}) {
  const [state,setState] = useState<FinanceState|null>(null);
  const [error,setError] = useState('');
  const [draft,setDraft] = useState<FinanceItem|null>(null);
  const [selected,setSelected] = useState('');
  const [filter,setFilter] = useState('');
  const [query,setQuery] = useState('');
  const [partnerFilter,setPartnerFilter] = useState(organizationId);
  const archived = !!data.editions.find(e=>e.id===editionId)?.archived;
  useEffect(()=>{try {setState(readFinance());} catch(e) {setError(String(e));}},[]);
  const items = state?.items.filter(i=>i.edition_id===editionId && (!partnerFilter || i.organization_id===partnerFilter)) || [];
  const item = items.find(i=>i.id===selected);
  function persist(next:FinanceState) {localStorage.setItem(financeKey,JSON.stringify(next));setState(next);setError('');}
  function act(fn:()=>void) {try {fn();} catch(e) {setError(e instanceof Error?e.message:String(e));}}
  function save(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    act(()=>{
      const str = (key:string)=>String(f.get(key)||'');
      const row:FinanceItem = {...draft!,title:str('title'),direction:str('direction') as FinanceItem['direction'],scope:str('scope') as FinanceItem['scope'],category:str('category'),organization_id:str('organization_id'),planned:money(str('planned')),actual:str('actual').trim()?money(str('actual')):null,due_on:str('due_on'),document_url:str('document_url'),note:str('note')};
      persist(putItem(readFinance(),data,row));setSelected(row.id);setDraft(null);
    });
  }
  function settlement(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();const form=e.currentTarget;const f=new FormData(form);
    act(()=>{persist(putSettlement(readFinance(),data,item!.id,{id:crypto.randomUUID(),item_id:item!.id,kind:String(f.get('kind')) as Settlement['kind'],amount:money(String(f.get('amount'))),date:String(f.get('date')),note:String(f.get('note'))}));form.reset();});
  }
  return <section>
    <div className="section-heading"><div><h1>Finance</h1><p className="muted">Zkušební evidence v CZK · plán, potvrzené částky a vypořádání.</p>{partnerFilter&&<p>Partner: {data.organizations.find(o=>o.id===partnerFilter)?.name} <button onClick={()=>setPartnerFilter('')}>Zobrazit všechny partnery</button></p>}</div>{!archived&&!draft&&<button className="primary" onClick={()=>{setError('');setDraft({id:crypto.randomUUID(),edition_id:editionId,title:'',direction:'expense',scope:'main',category:'Produkce',organization_id:partnerFilter,planned:0,actual:null,due_on:'',document_url:'',note:'',version:0});}}>+ Přidat položku</button>}</div>
    {error&&<p role="alert" className="error">{error}</p>}
    {!state?<p>Načítám finance…</p>:draft?<form onSubmit={save} className="list-panel" style={{padding:24}}>
      <h2>{draft.version?'Upravit položku':'Nová položka'}</h2>
      <div className="field-row"><label>Název<input name="title" required defaultValue={draft.title}/></label><label>Směr<select name="direction" defaultValue={draft.direction}><option value="income">Příjem</option><option value="expense">Výdaj</option></select></label></div>
      <div className="field-row"><label>Část akce<select name="scope" defaultValue={draft.scope}>{Object.entries(scopes).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Kategorie<input name="category" required defaultValue={draft.category}/></label></div>
      <label>Partner<select name="organization_id" defaultValue={draft.organization_id}><option value="">Bez vazby na partnera</option>{data.organizations.filter(o=>data.prospects.some(p=>p.edition_id===editionId&&p.organization_id===o.id)).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      <div className="field-row"><label>Plán (Kč)<input name="planned" inputMode="decimal" required defaultValue={draft.planned/100}/></label><label>Potvrzená částka (Kč)<input name="actual" inputMode="decimal" defaultValue={draft.actual===null?'':draft.actual/100}/><small>Prázdná = dosud neznámá, nula = potvrzených 0 Kč.</small></label></div>
      <div className="field-row"><label>Splatnost<input name="due_on" type="date" defaultValue={draft.due_on}/></label><label>Odkaz na doklad<input name="document_url" type="url" defaultValue={draft.document_url}/></label></div>
      <label>Poznámka<textarea name="note" defaultValue={draft.note}/></label>
      <div className="form-actions"><button type="submit" className="primary">Uložit položku</button><button type="button" onClick={()=>setDraft(null)}>Zrušit</button></div>
    </form>:item?<>
      <button onClick={()=>{setSelected('');setError('');}}>← Přehled financí</button>
      <article className="list-panel" style={{padding:24,marginTop:16}}>
        <h2>{item.title}</h2><p>{item.direction==='income'?'Příjem':'Výdaj'} · {scopes[item.scope]} · {item.category}</p>
        {item.organization_id&&<button onClick={()=>{const p=data.prospects.find(p=>p.edition_id===editionId&&p.organization_id===item.organization_id);if(p)onPartner(p.id);}}>Otevřít partnera · {data.organizations.find(o=>o.id===item.organization_id)?.name}</button>}
        <p>Plán: <strong>{czk(item.planned)}</strong> · Potvrzeno: <strong>{item.actual===null?'Neznámé':czk(item.actual)}</strong></p>
        <p>Zbývá vypořádat: <strong>{balances(item,state.settlements).remaining===null?'Neznámé':czk(balances(item,state.settlements).remaining!)}</strong> · Proplatit osobní výdaje: <strong>{czk(balances(item,state.settlements).reimbursement)}</strong></p>
        <p>Splatnost: {item.due_on||'Neuvedena'}</p><p>{item.note}</p>
        {item.document_url&&<p><a href={item.document_url} target="_blank" rel="noreferrer">Otevřít doklad ↗</a></p>}
        {!archived&&<button onClick={()=>setDraft(item)}>Upravit položku</button>}
        <h3>Úhrady a vypořádání</h3>
        {state.settlements.filter(p=>p.item_id===item.id).map(p=><p key={p.id}>{p.date} · {kinds[p.kind]} · {czk(p.amount)} · {p.note}</p>)}
        {!state.settlements.some(p=>p.item_id===item.id)&&<p className="muted">Zatím bez úhrad.</p>}
        {!archived&&<form onSubmit={settlement}>
          <div className="field-row"><label>Způsob vypořádání<select name="kind">{Object.entries(kinds).filter(([k])=>item.direction==='expense'||!['personal','reimbursement'].includes(k)).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Částka úhrady (Kč)<input name="amount" inputMode="decimal" required/></label><label>Datum úhrady<input name="date" type="date" required/></label></div>
          <label>Poznámka k úhradě<input name="note" placeholder="U osobního výdaje či proplacení uveď osobu"/></label>
          <button type="submit">Zapsat vypořádání</button>
        </form>}
        <h3>Historie</h3>{state.history.filter(h=>h.item_id===item.id).map((h,i)=><p key={i}>{new Date(h.at).toLocaleString('cs-CZ')} · {h.action}</p>)}
      </article>
    </>:<>
      <div className="stats">{(['income','expense'] as const).map(d=><div className="stat" key={d}><span>{d==='income'?'Příjmy':'Výdaje'}</span><strong>{czk(items.filter(i=>i.direction===d).reduce((s,i)=>s+i.planned,0))}</strong><small>Plán · potvrzeno {czk(items.filter(i=>i.direction===d).reduce((s,i)=>s+(i.actual??0),0))}; neznámých {items.filter(i=>i.direction===d&&i.actual===null).length}</small></div>)}</div>
      <div className="filters"><label>Hledat položku<input value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Filtrovat část akce<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Vše</option>{Object.entries(scopes).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
      <div className="list-panel">{items.filter(i=>(!filter||i.scope===filter)&&i.title.toLocaleLowerCase('cs').includes(query.toLocaleLowerCase('cs'))).map(i=><div key={i.id} style={{padding:16,borderBottom:'1px solid #333'}}><button onClick={()=>{setSelected(i.id);setError('');}}>{i.title}</button><p>{i.direction==='income'?'Příjem':'Výdaj'} · {scopes[i.scope]} · plán {czk(i.planned)} · zbývá {balances(i,state.settlements).remaining===null?'neznámé':czk(balances(i,state.settlements).remaining!)}</p></div>)}{!items.length&&<p style={{padding:24}}>Tento ročník zatím nemá finanční položky.</p>}</div>
    </>}
  </section>;
}
