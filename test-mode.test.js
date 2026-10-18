import {test} from 'node:test';
import assert from 'node:assert/strict';
import {io} from 'socket.io-client';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createGameServer} from './server.js';
const wait=async(fn)=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,25));}assert.ok(fn(),'La simulation doit progresser sans intervention sur les bots.');};
const send=(s,e,d={})=>new Promise((r,j)=>s.timeout(3000).emit(e,d,(err,v)=>err?j(err):r(v)));
async function setup(game=''){
 const server=createGameServer();await new Promise(r=>server.http.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.http.address().port,sockets=[];
 const connect=(ns,options)=>{const s=io(url+ns,options);sockets.push(s);s.on('state',v=>s.state=v);return s;};
 const context=vm.createContext({window:{},io:connect,setTimeout,clearTimeout});vm.runInContext(readFileSync(new URL('./demo-mode.js',import.meta.url),'utf8'),context);const bots=context.window.TestMode;
 const host=connect(game?'/arcade':'/',{forceNew:true});await wait(()=>host.connected);const made=await send(host,'create',{game,name:'Solo',demo:true});assert.equal(made.ok,true);assert.ok(made.testKey);bots.start(made,game);await wait(()=>host.state?.players.filter(p=>p.online).length===3);
 return{server,url,host,made,bots,sockets,close(){bots.stop();sockets.forEach(s=>s.disconnect());server.close();}};
}
test('Test solo : accès isolé, clé privée, deux bots et reconnexion sans doublons',async()=>{const t=await setup('note');try{
 assert.equal(t.host.state.demo,true);assert.equal(t.host.state.players.filter(p=>p.bot).length,2);assert.ok(!JSON.stringify(t.host.state).includes(t.made.testKey));
 const outsider=io(t.url+'/arcade',{forceNew:true});t.sockets.push(outsider);await wait(()=>outsider.connected);
 assert.equal((await send(outsider,'join',{game:'note',code:t.made.code,name:'Intrus'})).ok,false);
 assert.equal((await send(outsider,'join',{game:'note',code:t.made.code,testKey:'incorrect',botIndex:0})).ok,false);
 t.bots.stop();await wait(()=>t.host.state.players.filter(p=>p.online).length===1);const resumed=await send(t.host,'join',{game:'note',code:t.made.code,token:t.made.token});assert.equal(resumed.testKey,t.made.testKey);t.bots.start(resumed,'note');await wait(()=>t.host.state.players.filter(p=>p.online).length===3);assert.equal(t.host.state.players.length,3);
 await send(outsider,'create',{game:'trivial',name:'Normal'});assert.equal((await send(outsider,'test-scene',{scene:'final'})).ok,false);
 }finally{t.close();}});
test('Test Qui tu prends : bots votent pour les trois formats et après rejouer',async()=>{const t=await setup();try{
 await send(t.host,'settings',{rounds:10,format:'mixed'});await send(t.host,'start');const types=new Set();
 for(let round=1;round<=10;round++){await wait(()=>t.host.state.voted===2);const s=t.host.state,type=s.question.type||'friends';types.add(type);const vote=type==='yesno'?{answer:'yes'}:type==='tier'?{ranking:Object.fromEntries(s.eligible.map(id=>[id,'A']))}:{picks:s.eligible.filter(id=>id!==s.me).slice(0,s.settings.picks)};await send(t.host,'vote',{round,...vote});await wait(()=>t.host.state.phase==='results');assert.equal(t.host.state.voted,3);await send(t.host,'next');}
 assert.equal(types.size,3);await send(t.host,'restart');await send(t.host,'start');await wait(()=>t.host.state.voted===2);
 }finally{t.close();}});
test('Test Trivial : humain commence, bots jouent, raccourcis camembert et finale',async()=>{const t=await setup('trivial');try{
 await send(t.host,'start');assert.equal(t.host.state.active,t.host.state.me);assert.equal(t.host.state.settings.mode,'qcm');await send(t.host,'test-scene',{scene:'hq'});assert.equal(t.host.state.question.difficulty,5);const room=t.server.arcade.rooms.get(t.made.code);await send(t.host,'answer',{id:room.question.id,answer:room.question.wrong[0]});await send(t.host,'continue');await wait(()=>t.host.state.phase==='result');assert.notEqual(t.host.state.active,t.host.state.me);
 await send(t.host,'test-scene',{scene:'final'});assert.equal(t.host.state.final,true);await send(t.host,'category',{cat:0});await send(t.host,'answer',{id:room.question.id,answer:room.question.answer});assert.equal(t.host.state.phase,'finished');assert.equal(t.host.state.winner,t.host.state.me);
 }finally{t.close();}});
test('Test Note : réponses automatiques, puis le bot pose ses questions et propose',async()=>{const t=await setup('note');try{
 await send(t.host,'start');for(const p of t.host.state.noteTurns)await send(t.host,'ask',{round:1,player:p,text:'Un plat ?'});await wait(()=>t.host.state.phase==='noteGuess');assert.equal(t.host.state.secretNote,null);await send(t.host,'note-guess',{round:1,value:5});await send(t.host,'continue');await wait(()=>t.host.state.noteQuestions[t.host.state.me]);await send(t.host,'reply',{round:2,text:'Une pizza'});await wait(()=>t.host.state.phase==='result');assert.ok(Number.isInteger(t.host.state.submitted));
 }finally{t.close();}});
test('Test Piège : indices préécrits, devineur humain puis bot sans blocage',async()=>{const t=await setup('piege');try{
 await send(t.host,'start');await wait(()=>t.host.state.phase==='guess');assert.equal(t.host.state.word,null);assert.equal(t.host.state.clues.filter(c=>c.text).length,2);await send(t.host,'guess',{text:'essai'});await send(t.host,'continue');await send(t.host,'entry',{value:'Objet'});await wait(()=>t.host.state.phase==='result');
 }finally{t.close();}});
test('Test Curseur : estimations puis indice du bot et révélation',async()=>{const t=await setup('curseur');try{
 await send(t.host,'start');await send(t.host,'clue',{text:'Un exemple'});await wait(()=>t.host.state.phase==='result');await send(t.host,'continue');await wait(()=>t.host.state.phase==='estimate');assert.ok(t.host.state.clue);assert.equal(t.host.state.target,null);await send(t.host,'entry',{value:50});await wait(()=>t.host.state.phase==='result');
 }finally{t.close();}});
