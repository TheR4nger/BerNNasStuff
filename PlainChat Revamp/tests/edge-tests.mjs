import assert from 'node:assert/strict';
import {createEngine} from './engine.mjs';
class Observer {
  static instances=[];
  constructor(fn){this.fn=fn;this.connected=false;Observer.instances.push(this)}
  observe(){this.connected=true}
  disconnect(){this.connected=false}
}
const doc={body:{},querySelectorAll:()=>[],querySelector:()=>null};
let rejectSession;
const getSession=()=>new Promise((_,reject)=>{rejectSession=reject});
const engine=createEngine({doc,getSession,getMe:async()=>null,Observer,
 interval:()=>1,clear:()=>{},logger:{warn(){}}});
engine.start();
engine.setSession({localPlayerCellId:1,myTeam:[{cellId:1,assignedPosition:'TOP'}]},420);
assert.equal(engine.status().active,true);
rejectSession(Object.assign(new Error('not found'),{status:404}));
await new Promise(r=>setTimeout(r,10));
assert.equal(engine.status().active,false);
assert.equal(Observer.instances[0].connected,false);
engine.stop();
console.log('PASS: 404 deactivates, observer disconnects');
const node={nodeType:3,textContent:'Gromp',isConnected:true};
const wrapper={nodeType:1,childNodes:[node],matches:()=>false,querySelectorAll:()=>[node]};
const nested={nodeType:1,childNodes:[wrapper],matches:()=>false,querySelectorAll:()=>[wrapper,node]};
assert.equal(nested.childNodes[0].childNodes[0].textContent,'Gromp');
console.log('PASS: nested text fixture');
