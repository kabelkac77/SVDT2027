import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CrewEntryEditor,CrewCategoryForm,CrewCompensationForm,CrewMembershipForm} from '../src/components/crew-forms';
import {emptyCrewEntry} from '../src/lib/crew-model';
const category:any={id:'category-a',edition_id:'edition-a',name:'Synthetic category',color:'cat-0',required_count:null,required_term:'',version:1};
const row:any={...emptyCrewEntry('category-a'),id:'row-a',edition_id:'edition-a',name:'Fiktivní <člen>',friday:'08:00–16:00',saturday:'07:30–18:00'};
const data:any={role:'admin',canFinance:true,categories:[category],entries:[row],compensation:[],members:[]};
const shared={onSave:async()=>false,onDirty:()=>{},disabled:false};
function render(component:any,props:any){return renderToStaticMarkup(createElement(component,props));}
function value(html:string,name:string){return html.match(new RegExp('<input[^>]*name="'+name+'"[^>]*value="([^"]*)"'))?.[1];}
test('inline entry editor includes persistent Friday/Saturday inputs and safely escapes names',()=>{const html=render(CrewEntryEditor,{draft:row,data,onChange:()=>{},onSave:()=>{},onCancel:()=>{},disabled:false,readOnly:false});assert.ok(html.includes('name="friday"'));assert.ok(html.includes('name="saturday"'));assert.ok(html.includes('08:00–16:00'));assert.ok(html.includes('07:30–18:00'));assert.ok(!html.includes('<člen>'));});
test('ordinary member editor is read-only and exposes no financial input',()=>{const html=render(CrewEntryEditor,{draft:row,data:{...data,role:'member',canFinance:false},onChange:()=>{},onSave:()=>{},onCancel:()=>{},disabled:false,readOnly:true});assert.match(html,/<fieldset[^>]*disabled/);for(const name of ['agreed','paid','estimate','total'])assert.ok(!html.includes('name="'+name+'"'));});
test('compensation keeps unknown and known zero visibly separate',()=>{const html=render(CrewCompensationForm,{...shared,entryId:'row-a',fee:{roster_id:'row-a',edition_id:'edition-a',estimate:null,agreed:0,total:null,paid:0,barter:'Synthetic barter',merch:'T-shirt',version:1}});assert.equal(value(html,'estimate'),'');assert.equal(value(html,'agreed'),'0,00');assert.ok(html.includes('Synthetic barter'));});
test('category target distinguishes an unknown requirement from an explicit zero',()=>{const unknown=render(CrewCategoryForm,{...shared,category});const zero=render(CrewCategoryForm,{...shared,category:{...category,required_count:0}});assert.equal(value(unknown,'required_count'),'');assert.equal(value(zero,'required_count'),'0');});
test('new membership is not a silent admin or financial grant',()=>{const html=render(CrewMembershipForm,shared);assert.ok(html.includes('type="email"'));assert.match(html,/<option[^>]*value="member"[^>]*selected/);assert.ok(!/<input[^>]*name="can_finance"[^>]*checked/.test(html));});
test('category form offers only the twelve accepted category colors and defaults to cat-0',()=>{const html=render(CrewCategoryForm,shared);assert.ok(!html.includes('#4477aa'));assert.match(html,/<option[^>]*value="cat-0"[^>]*selected/);assert.equal((html.match(/<option/g)||[]).length,12);});
