import assert from 'node:assert/strict';
import {createEngine} from './engine.mjs';
const doc={body:{},querySelector:()=>null,querySelectorAll:()=>[]};
const e=createEngine({doc,Observer:class{observe(){}disconnect(){}},getSession:async()=>null,getMe:async()=>null,interval:()=>1,clear:()=>{}});
const session={localPlayerCellId:1,myTeam:[{cellId:1,assignedPosition:'top'}]};
for(const q of [null,undefined,440,0,999]){
 e.setSession(session,q);
 assert.equal(e.status().active,false,`must reject ${q}`);
}
e.setSession(session,420);
assert.equal(e.status().active,true);
assert.equal(e.status().queueId,420);
e.setSession(session,440);
assert.equal(e.status().active,false);
assert.equal(e.status().queueId,440);
assert.equal(e.status().diagnostics.reason,'queue-not-solo-duo');
e.setSession(session,null);
assert.equal(e.status().active,false);
assert.equal(e.status().diagnostics.reason,'queue-unconfirmed');
console.log('queue guard tests passed');
