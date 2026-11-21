import assert from 'node:assert/strict';
import {createEngine} from './engine.mjs';
class Node {constructor(text='',id=null){this.textContent=text;this.id=id;this.isConnected=true;this.children=[];this.self=false}
getAttribute(k){return k==='data-cell-id'&&this.id!==null?String(this.id):null}
querySelector(q){if(q==='.player-name-wrapper')return this.name;if(q.includes('is-self')||q.includes('data-is-self')||q.includes('data-local-player'))return this.self?this:null;return null}
querySelectorAll(q){return q.includes('summoner-secondary-text')?[this.roleEl]:[]}
matches(q){return this.self&&q.includes('is-self')}}
function slot(id,role,name){const s=new Node('',id);s.name=new Node(name);s.roleEl=new Node(role);return s}
const slots=[slot(null,'TOP','Krug'),slot(null,'JUNGLE','Gromp'),slot(null,'MID','MyRealName'),slot(null,'BOTTOM','Scuttle Crab'),slot(null,'','Wolf')];
const doc={body:{},querySelectorAll:q=>q==='.summoner-container'?slots:[],querySelector:()=>null};
const e=createEngine({doc,Observer:class{observe(){}disconnect(){}},getSession:async()=>null,getMe:async()=>null,interval:()=>1,clear:()=>{}});
const data=(selfRole='middle')=>({localPlayerCellId:3,myTeam:[{cellId:1,assignedPosition:'top'},{cellId:2,assignedPosition:'jungle'},{cellId:3,assignedPosition:selfRole},{cellId:4,assignedPosition:'bottom'},{cellId:5,assignedPosition:'utility'}]});
e.setSession(data(),420);e.reconcile();
assert.equal(slots[0].name.textContent,'DK Doran');assert.equal(slots[1].name.textContent,'DK Kanavi');assert.equal(slots[2].name.textContent,'MyRealName');assert.equal(slots[3].name.textContent,'DK Smash');assert.equal(slots[4].name.textContent,'Wolf');
assert.deepEqual(e.status().diagnostics,{reason:'partial',slots:5,updated:3,skipped:1});
e.setSession(data(''),420);e.reconcile();assert.equal(slots[0].name.textContent,'Krug');assert.equal(e.status().ownRole,null);
e.setSession(data(),420);e.reconcile();assert.equal(slots[0].name.textContent,'DK Doran');
e.stop();console.log('PASS: incomplete roles, diagnostics, no stale aliases while own role missing');
