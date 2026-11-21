import assert from 'node:assert/strict';
import {createEngine} from './engine.mjs';
class El {
  constructor(name,role,own=false){this.name={textContent:name,isConnected:true};this.role=role;this.own=own;this.isConnected=true;this.children=[];this.innerText=role+'\nAATROX\nAATROX\n'+name}
  querySelector(q){if(q==='.player-name-wrapper')return this.name;if(q.includes('is-self')||q.includes('data-is-self')||q.includes('data-local-player'))return this.own?this:null;return null}
  querySelectorAll(q){if(q.includes('summoner-secondary-text'))return [{textContent:'Banning...',children:[]}];return []}
  matches(q){return this.own&&q.includes('is-self')}
  getAttribute(){return null}
}
const a=[new El('Gromp','TOP'),new El('KRX Viper (Krug)','BOTTOM',true),new El('Murk Wolf','SUPPORT'),new El('Scuttle Crab','MID'),new El('Raptor','JUNGLE')];
const b=[1,2,3,4,5].map(n=>new El('Enemy '+n,''));
const doc={body:{},querySelectorAll:q=>q==='.summoner-container'?[...a,...b]:[],querySelector:()=>null};
const e=createEngine({doc,Observer:class{observe(){}disconnect(){}},getSession:async()=>null,getMe:async()=>null,interval:()=>1,clear:()=>{},logger:{log(){},warn(){}}});
e.setSession({gameId:1,localPlayerCellId:6,myTeam:[{cellId:5,assignedPosition:'top'},{cellId:6,assignedPosition:'bottom'},{cellId:7,assignedPosition:'utility'},{cellId:8,assignedPosition:'jungle'},{cellId:9,assignedPosition:'middle'}]},420);
e.reconcile();
assert.deepEqual(a.map(x=>x.name.textContent),['DK Doran','KRX Viper (Krug)','DK Delight','DK ShowMaker','DK Kanavi']);
assert.deepEqual(b.map(x=>x.name.textContent),['Enemy 1','Enemy 2','Enemy 3','Enemy 4','Enemy 5']);
assert.equal(e.status().diagnostics.updated,4);
e.deactivate();
assert.deepEqual(a.map(x=>x.name.textContent),['Gromp','KRX Viper (Krug)','Murk Wolf','Scuttle Crab','Raptor']);
e.stop();
console.log('PASS: 10 banners, Banning labels, innerText role, own protection, enemy untouched, restore');
