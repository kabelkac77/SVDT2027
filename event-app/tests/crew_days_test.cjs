'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=process.env.CREW_DAY_TEST_ROOT || path.resolve(__dirname,'../..');
const web=path.join(root,'event-app-zadani/wireframes');
function person(changes={}){
 const fields={name:'Synthetic crew',categoryId:'cat-a',position:'Synthetic role',owner:'QA',email:'qa@example.invalid',phone:'',contactOriginal:'',statusNote:'',notes:'',barter:'',merch:'',term:'',friday:'08:00–16:00',saturday:'07:00–18:00',money:{estimate:null,agreed:null,total:null,paid:null},status:'candidate',archived:false};
 return {id:'synthetic-a',year:'2027',version:1,name:fields.name,category:'Registrace',categoryId:'cat-a',position:fields.position,owner:'QA',email:fields.email,phone:'',status:'candidate',statusLabel:'Neoslovený',statusBasis:'Synthetic',cash:null,barter:'',merch:'',raw:[],extra:[],source:{sheet:'Synthetic',row:1},fields,...changes};
}
function harness(records=[person()]){
 const nodes=new Map();
 function node(id){if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',textContent:'',hidden:false,value:'',scrollTop:0,addEventListener(){},setAttribute(){},removeAttribute(){},focus(){},querySelector(){return node(id+'-child');},append(){},before(){}});return nodes.get(id);}
 const data={workspace:true,private:false,defaultYear:'2027',categories:[{id:'cat-a',name:'Registrace',color:'cat-0'}],records};
 const sandbox={window:{SVDT_CREW_SHEET:data,SVDT_CREW_EDITOR:{includeArchived:false,afterRender(){}},addEventListener(){}},document:{getElementById:node,querySelector:node,documentElement:{dataset:{}},addEventListener(){},head:{append(){}}},location:{hash:'#people',search:''},URLSearchParams,Intl,matchMedia:()=>({matches:false,addEventListener(){}}),history:{replaceState(){}},crypto:{randomUUID:()=> 'synthetic-uuid'},structuredClone,AbortController,fetch:()=>new Promise(()=>{}),setTimeout:()=>0,clearTimeout(){},FormData:class{constructor(form){return Object.entries(form);}}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(web,'crew-sheet.js'),'utf8'),sandbox);
 return {nodes,sandbox,data,run:code=>vm.runInContext(code,sandbox),node,loadEditor(){vm.runInContext(fs.readFileSync(path.join(web,'crew-workspace.js'),'utf8'),sandbox);}};
}
test('main table declares eight columns and both day headings',()=>{
 const html=fs.readFileSync(path.join(web,'crew.html'),'utf8'),head=html.match(/<thead>([\s\S]*?)<\/thead>/)[1];assert.equal((head.match(/<th>/g)||[]).length,8);assert.ok(head.includes('PÁ (od–do)'));assert.ok(head.includes('SO (od–do)'));
});
test('main person row includes two persisted ranges and eight cells',()=>{
 const h=harness();h.sandbox.sample=person();const html=h.run('sRow(sample)');assert.equal((html.match(/<td(?:\s|>)/g)||[]).length,8);assert.ok(html.includes('08:00–16:00'));assert.ok(html.includes('07:00–18:00'));
});
test('missing day values render unknown without copying general term',()=>{
 const r=person();delete r.fields.friday;delete r.fields.saturday;r.fields.term='Synthetic general term';const h=harness([r]);h.sandbox.sample=r;const html=h.run('sRow(sample)');assert.ok(!html.includes('undefined'));assert.ok(!html.includes('Synthetic general term'));assert.ok((html.match(/>—</g)||[]).length>=2);
});
test('day text is escaped in both row values and attribute titles',()=>{
 const r=person();r.fields.friday='"><img src=x onerror=alert(1)>';r.fields.saturday='A&B "Synthetic"';const h=harness([r]);h.sandbox.sample=r;const html=h.run('sRow(sample)');assert.ok(!html.includes('<img'));assert.ok(!html.includes('title=""><'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('A&amp;B'));
});
test('search finds both day ranges while preserving year and archive filters',()=>{
 const selected=person(),foreign=person({id:'foreign',year:'2026'}),archived=person({id:'archived',archived:true});const h=harness([selected,foreign,archived]);
 for(const query of ['08:00','07:00']){h.sandbox.query=query;const ids=h.run('sheetQuery=query;filteredRows().map(r=>r.id)');assert.deepEqual(Array.from(ids),['synthetic-a']);}
});
test('historic detail and group headers still span the eight-column table',()=>{
 const r=person({year:'2026'});r.fields={};const h=harness([person(),r]);h.sandbox.sample=r;assert.ok(h.run('sDetail(sample)').includes('colspan="8"'));assert.ok(h.node('sheet-rows').innerHTML.includes('colspan="8"'));assert.ok(!h.run('sRow(sample)').includes('08:00–16:00'));
});
test('row rendering never mutates stored field values',()=>{
 const row=person(),before=JSON.stringify(row);const h=harness([row]);h.sandbox.sample=row;h.run('sRow(sample)');assert.equal(JSON.stringify(row),before);
});
test('inline editor contains both day inputs with existing values under the row',()=>{
 const h=harness();h.loadEditor();h.sandbox.sample=h.data.records[0];const html=h.run('renderWorkDetail(sample)');assert.ok(html.includes('colspan="8"'));assert.ok(html.includes('name="friday"'));assert.ok(html.includes('name="saturday"'));assert.ok(html.includes('value="08:00–16:00"'));assert.ok(html.includes('value="07:00–18:00"'));
});
test('ordinary form collection preserves independent day values and general term',()=>{
 const h=harness();h.loadEditor();h.sandbox.form={name:'Synthetic',categoryId:'cat-a',status:'candidate',friday:'09:00–15:00',saturday:'07:30–19:00',term:'Independent term'};const fields=h.run('collectWorkForm(form)');assert.equal(fields.friday,'09:00–15:00');assert.equal(fields.saturday,'07:30–19:00');assert.equal(fields.term,'Independent term');
});
