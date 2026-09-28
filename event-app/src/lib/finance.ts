import { Data, isHttpUrl } from './model';

export type FinanceItem = {
  id: string; edition_id: string; title: string; direction: 'income' | 'expense';
  scope: 'main' | 'afterparty' | 'unallocated'; category: string;
  organization_id: string; planned: number; actual: number | null;
  due_on: string; document_url: string; note: string; version: number;
};
export type Settlement = {
  id: string; item_id: string; kind: 'cash' | 'personal' | 'barter' | 'reimbursement';
  amount: number; date: string; note: string;
};
export type FinanceState = { items: FinanceItem[]; settlements: Settlement[]; history: {at: string; item_id: string; action: string}[] };
export const financeKey = 'svdt-finance-demo-v1';
export function money(value: string): number {
  const s = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw Error('Částka musí být nezáporné číslo, nejvýše se dvěma desetinnými místy.');
  const [whole, decimals = ''] = s.split('.');
  const result = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result > 100000000000) throw Error('Částka je příliš vysoká.');
  return result;
}
export const czk = (n: number) => new Intl.NumberFormat('cs-CZ', {style:'currency',currency:'CZK'}).format(n / 100);
export function balances(item: FinanceItem, records: Settlement[]) {
  const rows = records.filter(p => p.item_id === item.id);
  const settled = rows.filter(p => p.kind !== 'reimbursement').reduce((s,p) => s+p.amount,0);
  const personal = rows.filter(p => p.kind === 'personal').reduce((s,p) => s+p.amount,0);
  const reimbursed = rows.filter(p => p.kind === 'reimbursement').reduce((s,p) => s+p.amount,0);
  return {settled, remaining: item.actual === null ? null : item.actual-settled, reimbursement: personal-reimbursed};
}
function editable(data: Data, edition: string) {
  const e = data.editions.find(e => e.id === edition);
  if (!e || e.archived) throw Error('Archivovaný nebo neznámý ročník nelze měnit.');
}
export function putItem(state: FinanceState, data: Data, item: FinanceItem): FinanceState {
  editable(data, item.edition_id);
  const old = state.items.find(i => i.id === item.id);
  if (old && (old.edition_id !== item.edition_id || old.version !== item.version)) throw Error('Záznam se změnil. Obnov data.');
  if (!item.title.trim() || !item.category.trim()) throw Error('Doplň název a kategorii.');
  if (!['income','expense'].includes(item.direction) || !['main','afterparty','unallocated'].includes(item.scope)) throw Error('Neplatný typ položky.');
  for (const n of [item.planned, item.actual]) if (n !== null && (!Number.isSafeInteger(n) || n < 0 || n > 100000000000)) throw Error('Neplatná částka.');
  if (item.organization_id && !data.prospects.some(p => p.edition_id === item.edition_id && p.organization_id === item.organization_id)) throw Error('Partner není v tomto ročníku.');
  if (item.document_url && !isHttpUrl(item.document_url)) throw Error('Doklad musí mít úplnou http(s) adresu.');
  if (item.due_on && !validDate(item.due_on)) throw Error('Neplatná splatnost.');
  if (state.settlements.some(p => p.item_id === item.id) && (old?.direction !== item.direction || old?.organization_id !== item.organization_id)) throw Error('Po zapsání úhrad nelze změnit směr ani protistranu.');
  const b = balances(item, state.settlements);
  if (b.settled > 0 && (item.actual === null || b.settled > item.actual)) throw Error('Potvrzená částka nesmí být nižší než již vypořádaná částka.');
  return {...state,items:state.items.filter(i=>i.id!==item.id).concat({...item,title:item.title.trim(),version:(old?.version || 0)+1}),history:[...state.history,{at:new Date().toISOString(),item_id:item.id,action:old?'Upravena položka':'Založena položka'}]};
}
function validDate(s: string) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s; }
export function putSettlement(state: FinanceState, data: Data, itemId: string, row: Settlement): FinanceState {
  const item = state.items.find(i=>i.id===itemId);
  if (!item || itemId !== row.item_id) throw Error('Položka neexistuje.');
  editable(data,item.edition_id);
  if (!['cash','personal','barter','reimbursement'].includes(row.kind)) throw Error('Neplatný způsob vypořádání.');
  if (!validDate(row.date) || !Number.isSafeInteger(row.amount) || row.amount <= 0) throw Error('Doplň datum a kladnou částku.');
  if (state.settlements.some(p=>p.id===row.id)) throw Error('Úhrada už existuje.');
  if (item.direction === 'income' && ['personal','reimbursement'].includes(row.kind)) throw Error('Osobní výdaje patří k výdajové položce.');
  const b = balances(item,state.settlements);
  if (row.kind === 'reimbursement') {
    if (row.amount > b.reimbursement) throw Error('Proplacení překračuje nevyrovnané osobní výdaje.');
  } else if (b.remaining === null || row.amount > b.remaining) throw Error('Nejprve potvrď částku; úhrada nesmí překročit zbývající částku.');
  if (['personal','reimbursement'].includes(row.kind) && !row.note.trim()) throw Error('Do poznámky uveď osobu a souvislost proplacení.');
  return {...state,settlements:[...state.settlements,row],history:[...state.history,{at:new Date().toISOString(),item_id:itemId,action:`Vypořádání: ${row.kind}, ${czk(row.amount)}`} ]};
}
export function freshFinance(): FinanceState {
  return {items:[{id:'f1',edition_id:'2027',title:'Ukázkový příspěvek partnera',direction:'income',scope:'main',category:'Partneři',organization_id:'o1',planned:5000000,actual:5000000,due_on:'2027-04-01',document_url:'',note:'Fiktivní položka pro vyzkoušení částečné úhrady.',version:1}],settlements:[],history:[]};
}
export function readFinance(): FinanceState {
  const raw = localStorage.getItem(financeKey);
  if (!raw) return freshFinance();
  const state = JSON.parse(raw);
  if (!Array.isArray(state.items) || !Array.isArray(state.settlements) || !Array.isArray(state.history)) throw Error('Ukázkové finance nelze načíst. Obnov demo.');
  return state;
}
