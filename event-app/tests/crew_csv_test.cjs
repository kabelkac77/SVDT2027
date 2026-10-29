'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const project = path.resolve(__dirname, '../..');
const modulePath = path.join(project, 'event-app-zadani/wireframes/crew-csv.js');
const api = require(modulePath);
const year = '2027';
function row(changes={}) {
  return {...{
    id:'synthetic-001', year, version:1, category:'Registrace', name:'Fiktivní člen',
    status:'contacted', statusLabel:'Poptaný', position:'Syntetická práce', owner:'QA',
    email:'qa@example.invalid', phone:'001234500', barter:'Syntetický barter', merch:'Tričko',
    fields:{term:'Fiktivní termín'}, archived:false, sourceYear:'2026', sourceId:'synthetic-source',
    source:{sheet:'Fiktivní list',row:7},
    raw:[{label:'jméno',value:'Fiktivní člen'},{label:'Kč',value:null},{label:'Kč',value:0}],
    extra:[{label:'Poznámka',value:'Fiktivní poznámka'}],
  }, ...changes};
}
function parse(csv) {
  const program = 'import csv,io,json,sys\ns=sys.stdin.read().removeprefix("\\ufeff")\nprint(json.dumps(list(csv.reader(io.StringIO(s,newline=""),delimiter=";")),ensure_ascii=False))';
  const result=spawnSync(process.env.CREW_CSV_PYTHON || 'python3',['-c',program],{input:csv,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  return JSON.parse(result.stdout);
}
function text(value) { return value.startsWith('\t') ? value.slice(1) : value; }
function columns(matrix) { return matrix[0].map(text); }
function deepFreeze(value) { if(value && typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);} return value; }

test('Node exports a pure buildCsv API',()=>assert.equal(typeof api.buildCsv,'function'));
test('UTF-8 BOM, Czech dialect, CRLF and stable filename',()=>{
  const result=api.buildCsv([row()],year);
  assert.equal(result.filename,'SVDT-lide-2027.csv');assert.equal(result.rowCount,1);
  assert.ok(result.csv.startsWith('\ufeff"'));assert.ok(result.csv.endsWith('\r\n'));
  const matrix=parse(result.csv);assert.equal(matrix.length,2);assert.equal(matrix[0].length,matrix[1].length);
  assert.equal(columns(matrix)[0],'ID');assert.equal(columns(matrix)[1],'Ročník');
});
test('empty selection is a header-only well-formed CSV',()=>{
  const result=api.buildCsv([],year);assert.equal(result.rowCount,0);assert.equal(parse(result.csv).length,1);
});
test('canonical contact, identity and archive columns are preserved as text',()=>{
  const matrix=parse(api.buildCsv([row()],year).csv),header=columns(matrix),data=matrix[1];
  for(const [label,value] of [['ID','synthetic-001'],['Ročník','2027'],['Jméno / skupina','Fiktivní člen'],['Telefon','001234500'],['E-mail','qa@example.invalid'],['Vyřazený','Ne']])assert.equal(data[header.indexOf(label)],'\t'+value);
});
test('all raw fields retain blank, zero and Czech decimal numbers',()=>{
  const sample=row({raw:[{label:'Kč',value:null},{label:'Kč',value:0},{label:'Kč',value:1234.5},{label:'Kč',value:-200}]});
  const m=parse(api.buildCsv([sample],year).csv),h=columns(m),positions=h.map((name,i)=>/^Tabulka \d+: Kč$/.test(name)?i:-1).filter(i=>i>=0);
  assert.equal(positions.length,4);assert.deepEqual(positions.map(i=>m[1][i]),['','0','1234,5','-200']);
});
test('quotes, separators, Unicode and embedded newlines round trip through Python csv',()=>{
  const value='Žluťoučký; "příklad"\r\nDruhý řádek\nTřetí řádek';
  const m=parse(api.buildCsv([row({name:value,raw:[{label:'Zdroj; "název"',value}]})],year).csv),h=columns(m);
  assert.equal(m[1][h.indexOf('Jméno / skupina')],'\t'+value);
  assert.equal(m[1].at(-2),'\t'+value);
});
test('every text cell and header gets exactly one added safety prefix',()=>{
  const values=['=1+2','+1','-text','@cmd','\t=1','\r=2','\n=3','  =4','＝1','＋1','－x','＠x',"'=1",'00123'];
  const sample=row({raw:values.map((value,i)=>({label:'=label-'+i,value})),extra:[]});
  const m=parse(api.buildCsv([sample],year).csv),h=columns(m);
  assert.ok(m[0].every(value=>value.startsWith('\t')));
  const indexes=h.map((name,i)=>name.startsWith('Tabulka ')?i:-1).filter(i=>i>=0);
  assert.deepEqual(indexes.map(i=>m[1][i]),values.map(value=>'\t'+value));
});
test('extra fields align by label and occurrence across reordered rows',()=>{
  const a=row({raw:[],extra:[{label:'X',value:'first'},{label:'X',value:'second'},{label:'X (2)',value:'literal'},{label:'__proto__',value:'prototype'},{label:'constructor',value:'constructor'}]});
  const b=row({id:'synthetic-002',raw:[],extra:[{label:'constructor',value:'B constructor'},{label:'__proto__',value:'B prototype'},{label:'X (2)',value:'B literal'},{label:'X',value:'B first'},{label:'X',value:'B second'}]});
  const m=parse(api.buildCsv([a,b],year).csv),h=columns(m),indexes=h.map((name,i)=>name.startsWith('Další ')?i:-1).filter(i=>i>=0);
  assert.equal(new Set(h).size,h.length);
  assert.deepEqual(indexes.map(i=>text(m[1][i])),['first','second','literal','prototype','constructor']);
  assert.deepEqual(indexes.map(i=>text(m[2][i])),['B first','B second','B literal','B prototype','B constructor']);
});
test('scope rejects mixed years, unsaved rows, invalid years and invalid IDs',()=>{
  for(const args of [[[row({year:'2026'})],year],[[row({version:0})],year],[[row({version:1.5})],year],[[row({id:''})],year],[[row()],2027],[[row()],'all'],[{},year]]){
    assert.throws(()=>api.buildCsv(...args),error=>error instanceof TypeError && !error.message.includes('synthetic-001'));
  }
});
test('history years are supported without a working version',()=>{
  for(const selected of ['2025','2026']){
    const result=api.buildCsv([row({year:selected,version:undefined})],selected);assert.equal(result.rowCount,1);assert.equal(result.filename,`SVDT-lide-${selected}.csv`);
  }
});
test('invalid cell values fail with a constant error instead of partial export',()=>{
  let message;
  for(const value of [NaN,Infinity,{},[],()=>{}]){
    assert.throws(()=>api.buildCsv([row({raw:[{label:'synthetic-private-label',value}]})],year),error=>{
      assert.ok(error instanceof TypeError);assert.ok(!error.message.includes('synthetic-private-label'));
      if(message===undefined)message=error.message;assert.equal(error.message,message);return true;
    });
  }
});
test('frozen input objects and arrays are never mutated',()=>{
  const input=[row()];const before=JSON.stringify(input);deepFreeze(input);api.buildCsv(input,year);assert.equal(JSON.stringify(input),before);
});
test('classic browser script exposes the same API without DOM or network',()=>{
  const sandbox={};sandbox.window=sandbox;sandbox.globalThis=sandbox;
  sandbox.fetch=()=>{throw Error('Unexpected network access');};
  sandbox.document=new Proxy({}, {get(){throw Error('Unexpected DOM access');}});
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(modulePath,'utf8'),sandbox);
  const result=sandbox.SVDT_CREW_CSV.buildCsv([row()],year);assert.equal(result.filename,'SVDT-lide-2027.csv');assert.equal(result.rowCount,1);
});

// Exercise the real workspace event handler with synthetic DOM/download adapters.
function workspaceHarness(rows, selected='2027') {
 const state={downloads:[],blobs:[],notices:[],listeners:{}};
 const notice={set textContent(value){state.notices.push(value);},hidden:false};
 const dom={getElementById(id){return id==='workspace-notice'?notice:id==='sheet-controls'?{}:null;},
  addEventListener(name,handler){state.listeners[name]=handler;},
  createElement(tag){assert.equal(tag,'a');return {click(){state.downloads.push({filename:this.download,url:this.href});}};}};
 const sandbox={document:dom,crypto:{},Blob,AbortController,URLSearchParams,
  URL:{createObjectURL(blob){state.blobs.push(blob);return 'blob:synthetic';},revokeObjectURL(){}},
  fetch:()=>new Promise(()=>{}),setTimeout:()=>0,clearTimeout(){},
  window:{SVDT_CREW_CSV:api,addEventListener(){}},sheetYear:selected,filteredRows:()=>rows};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(project,'event-app-zadani/wireframes/crew-workspace.js'),'utf8'),sandbox);
 state.run=code=>vm.runInContext(code,sandbox);
 state.click=()=>state.listeners.click({target:{closest:()=>({dataset:{workAction:'csv'}})}});
 return state;
}
test('workspace click downloads only selected saved rows, including collapsed members',async()=>{
 const h=workspaceHarness([row(),row({id:'synthetic-002'}),row({id:'unsaved',version:0})]);h.click();
 assert.equal(h.downloads.length,1);assert.equal(h.downloads[0].filename,'SVDT-lide-2027.csv');
 const matrix=parse(await h.blobs[0].text());assert.equal(matrix.length,3);assert.ok(!JSON.stringify(matrix).includes('unsaved'));
 assert.ok(h.notices.at(-1).includes('uložené záznamy: 2'));
});
test('workspace preserves dirty person and category drafts and blocks downloads while saving',()=>{
 for(const flag of ['dirty','categoryDirty','saving']){
  const h=workspaceHarness([row()]);h.run(`workspace.${flag}=true;workspace.draft={id:'synthetic-draft'};`);h.click();
  assert.equal(h.downloads.length,0);assert.equal(h.run(`workspace.${flag}`),true);assert.equal(h.run('workspace.draft.id'),'synthetic-draft');assert.ok(h.notices.length>0);
 }
});
test('workspace history export uses the selected year and does not require versions',async()=>{
 const h=workspaceHarness([row({year:'2026',version:undefined})],'2026');h.click();assert.equal(h.downloads[0].filename,'SVDT-lide-2026.csv');assert.equal(parse(await h.blobs[0].text()).length,2);
});
test('workspace empty filter exports headers without broadening the selection',async()=>{
 const h=workspaceHarness([]);h.click();assert.equal(parse(await h.blobs[0].text()).length,1);assert.ok(h.notices.at(-1).includes('uložené záznamy: 0'));
});
test('workspace rejects mixed-year data without a partial download or data in the notice',()=>{
 const h=workspaceHarness([row({year:'2026',name:'synthetic-private-value'})]);h.click();assert.equal(h.downloads.length,0);assert.equal(h.notices.length,1);assert.ok(!h.notices[0].includes('synthetic-private-value'));
});
test('canonical fields reject invalid values rather than losing data silently',()=>{
 for(const change of [{name:{}},{phone:NaN},{source:{sheet:[]}},{fields:{term:Infinity}},{raw:null},{extra:null},{raw:new Array(2)}])assert.throws(()=>api.buildCsv([row(change)],year),TypeError);
 assert.throws(()=>api.buildCsv(new Array(2),year),TypeError);
});
