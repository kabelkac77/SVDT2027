'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=process.env.CREW_CATEGORY_TEST_ROOT || path.resolve(__dirname,'../..');
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
function summary(group,changes={}){const h=harness(group);Object.assign(h.data,changes);h.sandbox.group=group;return {h,html:h.run('sGroupSummary(group)')};}
function stateCount(html,status){const match=html.match(new RegExp('<span[^>]*class="[^"]*sheet-group-status[^"]*\\b'+status+'\\b[^"]*"[^>]*>([\\s\\S]*?<strong>([0-9]+)</strong>)'));return match?match[2]:'';}
test('collapsed category headers contain a summary while member rows stay closed',()=>{
 const h=harness([person({status:'confirmed'}),person({id:'second',status:'contacted'})]);const html=h.node('sheet-rows').innerHTML;assert.ok(html.includes('sheet-group-summary'));assert.ok(!html.includes('data-person-row='));assert.ok(html.includes('aria-expanded="false"'));assert.ok(html.includes('colspan="8"'));
});
test('each stored status is counted once with existing label and no zero chips',()=>{
 const rows=['confirmed','contacted','declined','candidate','unknown'].map((status,i)=>person({id:'sample-'+i,status}));rows.push(person({id:'extra',status:'confirmed'}));const {html}=summary(rows);
 assert.ok(stateCount(html,'confirmed').includes('2'));for(const status of ['contacted','declined','candidate','unknown'])assert.ok(stateCount(html,status).includes('1'));
 const one=summary([person({status:'confirmed'})]).html;assert.equal(stateCount(one,'candidate'),'');assert.equal(stateCount(one,'declined'),'');
});
test('unknown and prototype-shaped statuses count as review instead of corrupting output',()=>{
 const {html}=summary(['__proto__','constructor','made-up'].map((status,i)=>person({id:'sample-'+i,status})));assert.ok(stateCount(html,'unknown').includes('3'));assert.ok(!html.includes('__proto__'));assert.ok(!html.includes('constructor'));assert.ok(!html.includes('made-up'));
});
test('unsaved new records never increase confirmed counts and have a separate note',()=>{
 const {html}=summary([person({status:'confirmed'}),person({id:'draft',status:'confirmed',version:0})]);assert.ok(stateCount(html,'confirmed').includes('1'));assert.match(html,/Neuložené[^<]*|Neuložené[\s\S]*?1/);assert.ok(html.includes('1'));
});
test('history and static model do not show current-year saved-status summaries',()=>{
 const {h}=summary([person()]);h.run("sheetYear='2026'");assert.equal(h.run('sGroupSummary(sheetData.records)'),'');h.run("sheetYear='2025'");assert.equal(h.run('sGroupSummary(sheetData.records)'),'');h.run("sheetYear='2027';sheetData.workspace=false");assert.equal(h.run('sGroupSummary(sheetData.records)'),'');
});
test('empty categories have no fake state totals',()=>{const {html}=summary([]);assert.ok(!html.includes('sheet-group-status'));});
test('summary reflects search and status filters rather than all stored members',()=>{
 const h=harness([person({name:'Synthetic Alpha',status:'confirmed'}),person({id:'beta',name:'Synthetic Beta',status:'contacted'})]);h.run("sheetStatus='contacted';renderSheet()");let html=h.node('sheet-rows').innerHTML;assert.equal(stateCount(html,'confirmed'),'');assert.ok(stateCount(html,'contacted').includes('1'));
 h.run("sheetStatus='all';sheetQuery='Alpha';renderSheet()");html=h.node('sheet-rows').innerHTML;assert.ok(stateCount(html,'confirmed').includes('1'));assert.equal(stateCount(html,'contacted'),'');
});
test('archived and foreign-year rows remain outside until explicitly included',()=>{
 const h=harness([person({status:'confirmed'}),person({id:'archived',status:'declined',archived:true}),person({id:'foreign',year:'2026',status:'contacted'})]);let html=h.node('sheet-rows').innerHTML;assert.equal(stateCount(html,'declined'),'');assert.equal(stateCount(html,'contacted'),'');h.run('window.SVDT_CREW_EDITOR.includeArchived=true;renderSheet()');html=h.node('sheet-rows').innerHTML;assert.ok(stateCount(html,'declined').includes('1'));assert.equal(stateCount(html,'contacted'),'');
});
test('helper never reads identity/contact data and never mutates the input',()=>{
 const r=person({status:'confirmed'});for(const key of ['name','email','phone','raw'])Object.defineProperty(r,key,{get(){throw Error('Unexpected identity read');}});const h=harness([]);h.sandbox.group=Object.freeze([Object.freeze(r)]);const html=h.run('sGroupSummary(group)');assert.ok(stateCount(html,'confirmed').includes('1'));
});
