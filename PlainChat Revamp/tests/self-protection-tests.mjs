import assert from 'node:assert/strict';
import {createEngine} from './engine.mjs';
class El {
 constructor(text='',role='',id=null){this.textContent=text;this.role=role;this.id=id;this.isConnected=true;this.children=[]}
 getAttribute(k){return k==='data-cell-id'&&this.id!==null?String(this.id):null}
 querySelector(q){if(q==='.player-name-wrapper')return this.name;if(q.includes('is-self')||q.includes('data-is-self')||q.includes('data-local-player'))return null;return null}
 querySelectorAll(q){return q.includes('summoner-secondary-text')?[this.roleEl]:[]}
 matches(){return false}
}
function slot(name,role){const e=new El();e.name=new El(name);e.roleEl=new El(role);return e}
let slots=[slot('Gromp','TOP'),slot('Murk Wolf','JUNGLE'),slot('MyRealName','MID'),slot('Krug','BOTTOM'),slot('Scuttle Crab','SUPPORT')];
const doc={body:{},querySelectorAll:q=>q==='.summoner-container'?slots:[],querySelector:()=>null};
const e=createEngine({doc,Observer:class{observe(){}disconnect(){}},getSession:async()=>null,getMe:async()=>null,interval:()=>1,clear:()=>{}});
const sess=(self,game)=>({gameId:game,localPlayerCellId:self,myTeam:[{cellId:1,assignedPosition:'top'},{cellId:2,assignedPosition:'jungle'},{cellId:3,assignedPosition:'middle'},{cellId:4,assignedPosition:'bottom'},{cellId:5,assignedPosition:'utility'}]});
e.setSession(sess(3,101),420);e.reconcile();
assert.equal(slots[2].name.textContent,'MyRealName');
assert.equal(slots[0].name.textContent,'DK Doran');
// New lobby: player nickname changes visual pick order, no data-cell-id in HTML.
e.deactivate();
slots=[slot('MyRealName','TOP'),slot('Gromp','JUNGLE'),slot('Murk Wolf','MID'),slot('Krug','BOTTOM'),slot('Scuttle Crab','SUPPORT')];
e.setSession(sess(1,102),420);e.reconcile();
assert.equal(slots[0].name.textContent,'MyRealName');
assert.equal(slots[1].name.textContent,'DK Kanavi');
assert.equal(slots[2].name.textContent,'DK ShowMaker');
assert.equal(e.status().selfEvidence,'real-name-and-role');
// Unconfirmed self + a real stranger name must never be overwritten.
e.deactivate();
slots=[slot('Gromp','TOP'),slot('Murk Wolf','JUNGLE'),slot('Raptor','MID'),slot('Krug','BOTTOM'),slot('AnotherPlayer','SUPPORT')];
e.setSession(sess(3,103),420);e.reconcile();
assert.equal(e.status().diagnostics.reason,'own-slot-unconfirmed');
assert.equal(slots[4].name.textContent,'AnotherPlayer');
assert.equal(slots[0].name.textContent,'Gromp');
e.stop();
console.log('PASS: self preserved across pick reorder and new sessions; unknown real names untouched');
