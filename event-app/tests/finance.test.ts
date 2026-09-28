import test from 'node:test';
import assert from 'node:assert/strict';
import { balances, freshFinance, money, putItem, putSettlement } from '../src/lib/finance';
import { freshDemo } from '../src/lib/demo';

test('Přesné haléře, částečné úhrady a zákaz přeplatku',()=>{
  assert.equal(money('1 234,56'),123456);
  assert.throws(()=>money('1.234'));
  assert.throws(()=>money('-1'));
  const d=freshDemo();let s=freshFinance();
  const p={id:'pay1',item_id:'f1',kind:'cash' as const,amount:123456,date:'2027-01-01',note:''};
  s=putSettlement(s,d,'f1',p);
  assert.equal(balances(s.items[0],s.settlements).remaining,4876544);
  assert.throws(()=>putSettlement(s,d,'f1',{...p,id:'over',amount:5000000}));
  assert.throws(()=>putSettlement(s,d,'f1',p));
  assert.throws(()=>putItem(s,d,{...s.items[0],actual:100}));
});
test('Osobní výdaj a proplacení nezdvojují náklady, barter nevyžaduje proplacení',()=>{
  const d=freshDemo(); let s=freshFinance();
  s=putItem(s,d,{...s.items[0],direction:'expense'});
  const p={id:'personal',item_id:'f1',kind:'personal' as const,amount:100000,date:'2027-01-01',note:'Ukázkový správce'};
  s=putSettlement(s,d,'f1',p);
  s=putSettlement(s,d,'f1',{...p,id:'reim',kind:'reimbursement',amount:50000});
  assert.deepEqual(balances(s.items[0],s.settlements),{settled:100000,remaining:4900000,reimbursement:50000});
  assert.throws(()=>putSettlement(s,d,'f1',{...p,id:'over',kind:'reimbursement',amount:50001}));
  s=putSettlement(s,d,'f1',{...p,id:'barter',kind:'barter',amount:10000});
  assert.equal(balances(s.items[0],s.settlements).reimbursement,50000);
});
test('Archiv, neznámá částka, cizí partner, souběh a neplatné datum',()=>{
  const d=freshDemo();const s=freshFinance();const item=s.items[0];
  assert.throws(()=>putItem(s,d,{...item,id:'archive',edition_id:'2026'}));
  assert.throws(()=>putItem(s,d,{...item,organization_id:'foreign'}));
  assert.throws(()=>putItem(s,d,{...item,version:0}));
  assert.throws(()=>putItem(s,d,{...item,document_url:'javascript:alert(1)'}));
  const unknown=putItem(s,d,{...item,actual:null});
  assert.equal(balances(unknown.items[0],[]).remaining,null);
  const p={id:'p',item_id:item.id,kind:'cash' as const,amount:1,date:'2027-02-30',note:''};
  assert.throws(()=>putSettlement(s,d,item.id,p));
  assert.throws(()=>putSettlement(unknown,d,item.id,{...p,date:'2027-02-28'}));
});
