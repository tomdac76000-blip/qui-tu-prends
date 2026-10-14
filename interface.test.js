import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('les trois formats affichent une saisie puis une révélation sans données manquantes',()=>{
 const listeners={},nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',insertAdjacentHTML(_,s){this.innerHTML+=s;},querySelectorAll(){return[];},classList:{add(){},remove(){}}});return nodes.get(id);};
 const context=vm.createContext({document:{querySelector:node,getElementById:node},localStorage:{getItem(){return null;},setItem(){}},URLSearchParams,location:{search:'',origin:'http://test'},io:()=>({on:(event,fn)=>listeners[event]=fn}),setInterval(){},setTimeout(){},clearTimeout(){},fetch:()=>new Promise(()=>{}),window:{scrollTo(){}},console});
 vm.runInContext(readFileSync(new URL('./app.js',import.meta.url),'utf8'),context);
 const players=['a','b','c'].map(id=>({id,name:id,emoji:'😎',online:true,score:0,yesCount:0,noCount:0,tierSum:0,tierRatings:0}));
 const base={code:'TESTX',me:'a',hostId:'a',phase:'voting',settings:{picks:2,rounds:10,humor:'normal',source:'official',format:'mixed',categories:['general']},players,eligible:['a','b','c'],round:1,total:10,serverNow:Date.now(),deadline:Date.now()+30000,durationMs:30000,voted:0,voters:3,myVote:null,counts:null,answers:null,tierResults:null,tierLists:null,played:{friends:0,personal:0,tier:0}};
 for(const type of ['friends','yesno','tier']){
  const state={...base,question:{text:'Question de test ?',type,category:type==='friends'?'general':type==='yesno'?'perso':'tier'}};listeners.state(state);const html=node('#app').innerHTML;assert.ok(html.includes(type==='tier'?'Valider ma tier list':type==='yesno'?'Choisis Oui ou Non':'Valider mon vote'));assert.ok(!html.includes('NaN'));
  const result={...state,phase:'results',voted:3,counts:type==='yesno'?{yes:2,no:1,unanswered:0}:{a:2,b:2,c:2},answers:{a:'yes',b:'no',c:'yes'},tierLists:{a:{a:'S',b:'B',c:'D'}},tierResults:{a:{rank:'S',average:4,ratings:1},b:{rank:'B',average:2,ratings:1},c:{rank:'D',average:0,ratings:1}}};listeners.state(result);assert.ok(node('#app').innerHTML.includes('Manche suivante'));assert.ok(!/NaN|undefined/.test(node('#app').innerHTML));
 }
 listeners.state({...base,phase:'finished',question:null,played:{friends:1,personal:1,tier:1}});assert.ok(node('#app').innerHTML.includes('Rejouer avec ces potes'));
});
