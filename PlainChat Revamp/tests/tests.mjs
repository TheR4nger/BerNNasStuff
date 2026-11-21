import assert from 'node:assert/strict';
import {createEngine} from './engine.mjs';
class Node {
 constructor(text='',classes='',id=null){this.textContent=text;this.className=classes;this.id=id;this.isConnected=true;this.children=[];this.name=null;this.roleEl=null;this.self=false}
 getAttribute(attr){return attr==='data-cell-id'&&this.id!==null?String(this.id):null}
 querySelector(selector){
   if(selector==='.player-name-wrapper')return this.name;
   if(selector.includes('is-self')||selector.includes('data-is-self')||selector.includes('data-local-player'))return this.self?this:null;
   return null;
 }
 matches(selector){return this.self&&selector.includes('is-self')}
 querySelectorAll(selector){
   if(selector.includes('summoner-secondary-text'))return this.roleEl?[this.roleEl]:[];
   return [];
 }
}
function slot(role,id,text,self=false){
 const s=new Node('', 'summoner-container',id);
 s.name=new Node(text,'player-name-wrapper');
 s.roleEl=new Node(role,'summoner-secondary-text');
 s.self=self;return s;
}
const slots=[
 slot('JUNGLE',1,'Gromp'),
 slot('TOP',2,'Krug'),
 slot('SUPPORT',3,'Murk Wolf'),
 slot('MID',4,'Raptor'),
 slot('BOTTOM',5,'MyRealName',true)
];
const doc={body:{},querySelectorAll:q=>q==='.summoner-container'?slots:[],
 querySelector:()=>null};
const Observer=class{observe(){}disconnect(){}};
const subscriptions=new Map();
const engine=createEngine({
 doc,Observer,getQueue:async()=>420,getSession:async()=>({gameId:1,localPlayerCellId:5,myTeam:[
 {cellId:1,assignedPosition:'jungle'},{cellId:2,assignedPosition:'top'},
 {cellId:3,assignedPosition:'utility'},{cellId:4,assignedPosition:'middle'},
 {cellId:5,assignedPosition:'bottom'}]}),
 getMe:async()=>({gameName:'MyRealName',tagLine:'EUW'}),
 observe:(uri,cb)=>{subscriptions.set(uri,cb);return{disconnect(){}}},
 interval:()=>1,clear:()=>{}
});
engine.start();
await new Promise(r=>setTimeout(r,0));
engine.reconcile();
assert.deepEqual(slots.map(s=>s.name.textContent),[
 'DK Kanavi','DK Doran','DK Delight','DK ShowMaker','MyRealName'
]);
assert.equal(engine.status().aliases.gromp,'DK Kanavi');
assert.equal(engine.status().aliases.krug,'DK Doran');
assert.equal(engine.status().aliases['scuttle crab'],undefined);
subscriptions.get('/lol-champ-select/v1/session')({eventType:'Delete'});
await new Promise(r=>setTimeout(r,160));
engine.reconcile();
assert.deepEqual(slots.map(s=>s.name.textContent),[
 'Gromp','Krug','Murk Wolf','Raptor','MyRealName'
]);
engine.stop();
console.log('PASS: five roles, own real name, monster aliases, session deletion, restoration, socket subscription');
// Self marker absent: own real name/cell identifies self; never rename own.
const second=slots.map(s=>slot(s.roleEl.textContent,s.id,s.name.textContent));
const doc2={body:{},querySelectorAll:q=>q==='.summoner-container'?second:[],querySelector:()=>null};
const e2=createEngine({doc:doc2,Observer,getSession:async()=>null,getMe:async()=>null,
 interval:()=>1,clear:()=>{}});
e2.setSession({localPlayerCellId:5,myTeam:[
 {cellId:1,assignedPosition:'jungle'},{cellId:2,assignedPosition:'top'},
 {cellId:3,assignedPosition:'utility'},{cellId:4,assignedPosition:'middle'},
 {cellId:5,assignedPosition:'bottom'}]},420);
e2.reconcile();
assert.equal(second[4].name.textContent,'MyRealName');
assert.equal(second[0].name.textContent,'DK Kanavi');
e2.stop();
console.log('PASS: own role fallback without self CSS marker');
