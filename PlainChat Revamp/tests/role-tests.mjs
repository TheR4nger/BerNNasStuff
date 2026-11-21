import assert from 'node:assert/strict';
import {createEngine} from './engine.mjs';
class N{
 constructor(text='',id=null){this.textContent=text;this.id=id;this.isConnected=true;this.children=[];this.self=false}
 getAttribute(a){return a==='data-cell-id'&&this.id!==null?String(this.id):null}
 querySelector(q){if(q==='.player-name-wrapper')return this.name;if(q.includes('is-self')||q.includes('data-is-self')||q.includes('data-local-player'))return this.self?this:null;return null}
 querySelectorAll(q){return q.includes('summoner-secondary-text')?[this.roleEl]:[]}
 matches(q){return this.self&&q.includes('is-self')}
}
function slot(id,role,name,self=false){const x=new N('',id);x.name=new N(name);x.roleEl=new N(role);x.self=self;return x}
const a=slot(1,'TOP','Krug'),b=slot(2,'JUNGLE','Gromp'),c=slot(3,'MID','MyRealName',true),d=slot(4,'BOTTOM','Raptor'),e=slot(5,'SUPPORT','Murk Wolf');
const slots=[a,b,c,d,e];
const doc={body:{},querySelectorAll:q=>q==='.summoner-container'?slots:[],querySelector:()=>null};
const Obs=class{observe(){}disconnect(){}};
const eng=createEngine({doc,Observer:Obs,getSession:async()=>null,getMe:async()=>null,interval:()=>1,clear:()=>{}});
function session(pos){return {gameId:100,localPlayerCellId:3,myTeam:Object.entries(pos).map(([id,assignedPosition])=>({cellId:Number(id),assignedPosition}))}}
const base={1:'top',2:'jungle',3:'middle',4:'bottom',5:'utility'};
eng.setSession(session(base),420);eng.reconcile();
assert.equal(a.name.textContent,'DK Doran');
assert.equal(b.name.textContent,'DK Kanavi');
// Pick order reorder: no aliases should change.
slots.reverse();eng.reconcile();
assert.equal(a.name.textContent,'DK Doran');
assert.equal(b.name.textContent,'DK Kanavi');
// Session changes before DOM: aliases must not be assigned to wrong cell.
eng.setSession(session({...base,1:'jungle',2:'top'}),420);eng.reconcile();
assert.equal(a.name.textContent,'Krug');
assert.equal(b.name.textContent,'Gromp');
assert.equal(Object.keys(eng.status().aliases).length,2);
// DOM catches up, each cell gets correct new alias.
a.roleEl.textContent='JUNGLE';b.roleEl.textContent='TOP';eng.reconcile();
assert.equal(a.name.textContent,'DK Kanavi');
assert.equal(b.name.textContent,'DK Doran');
assert.equal(eng.status().aliases.krug,'DK Kanavi');
assert.equal(eng.status().aliases.gromp,'DK Doran');
// One missing role must not block other known slots.
d.roleEl.textContent='';eng.reconcile();
assert.equal(a.name.textContent,'DK Kanavi');
assert.equal(d.name.textContent,'Raptor');
assert.equal(e.name.textContent,'DK Delight');
// Change own role: cannot assign DK to own player.
eng.setSession(session({1:'jungle',2:'top',3:'bottom',4:'middle',5:'utility'}),420);
c.roleEl.textContent='BOTTOM';d.roleEl.textContent='MID';eng.reconcile();
assert.notEqual(c.name.textContent,'DK Smash');
assert.equal(d.name.textContent,'DK ShowMaker');
eng.stop();
console.log('PASS: pick reorder, staggered role swaps, partial role detection, own slot protection');
