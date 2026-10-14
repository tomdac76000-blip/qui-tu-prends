import {test} from 'node:test';
import assert from 'node:assert/strict';
import {io} from 'socket.io-client';
import {createGameServer} from './server.js';

const pause=()=>new Promise(r=>setTimeout(r,25));
async function setup(){const game=createGameServer();await new Promise(r=>game.http.listen(0,'127.0.0.1',r));const clients=[];const url='http://127.0.0.1:'+game.http.address().port;
 const send=(s,e,d={})=>new Promise((r,j)=>s.timeout(3000).emit(e,d,(err,v)=>err?j(err):r(v)));
 async function connect(){const s=io(url,{forceNew:true});clients.push(s);s.on('state',v=>s.state=v);await new Promise((r,j)=>{s.once('connect',r);s.once('connect_error',j)});return s;}
 const a=await connect(),b=await connect(),c=await connect();const {code}=await send(a,'create',{name:'A'});await send(b,'join',{code,name:'B'});const session=await send(c,'join',{code,name:'C'});await pause();
 return {a,b,c,code,session,send,connect,game,close(){clients.forEach(s=>s.disconnect());game.close();}};
}
test('Oui/Non : secret, révélation nominative, absence distincte, reconnexion',async()=>{const t=await setup();const {a,b,c,send}=t;try{
 await send(a,'settings',{format:'personal',rounds:10});assert.equal((await send(a,'start')).ok,true);await pause();assert.equal(a.state.question.type,'yesno');
 assert.equal((await send(a,'vote',{round:1,answer:'maybe'})).ok,false);await send(a,'vote',{round:1,answer:'yes'});await pause();assert.equal(b.state.counts,null);assert.equal(b.state.answers,null);assert.equal(b.state.myVote,null);assert.equal(a.state.myVote,'yes');assert.equal(b.state.players.find(p=>p.id===a.state.me).yesCount,0);
 assert.equal((await send(a,'vote',{round:1,answer:'no'})).ok,false);await send(b,'vote',{round:1,answer:'no'});await send(a,'reveal');await pause();assert.deepEqual(a.state.counts,{yes:1,no:1,unanswered:1});assert.equal(a.state.answers[a.state.me],'yes');assert.equal(a.state.answers[b.state.me],'no');assert.equal(a.state.answers[c.state.me],undefined);assert.ok(a.state.players.every(p=>p.score===0));
 await send(a,'next');assert.equal((await send(a,'vote',{round:1,answer:'yes'})).ok,false);await send(c,'vote',{round:2,answer:'no'});const cid=c.state.me;c.disconnect();const d=await t.connect();await send(d,'join',{code:t.code,token:t.session.token});assert.equal(d.state.me,cid);assert.equal(d.state.myVote,'no');
 await send(a,'vote',{round:2,answer:'yes'});await send(b,'vote',{round:2,answer:'yes'});await pause();assert.equal(a.state.phase,'results');assert.deepEqual(a.state.counts,{yes:2,no:1,unanswered:0});
 }finally{t.close();}});
test('Tier list : tous les joueurs dont soi, secret, moyenne, détail et reconnexion',async()=>{const t=await setup();const {a,b,c,send}=t;try{
 await send(a,'settings',{format:'tier',rounds:10});assert.equal((await send(a,'start')).ok,true);await pause();assert.equal(a.state.question.type,'tier');assert.equal(a.state.durationMs,60000);const ids=[a,b,c].map(s=>s.state.me),ranking=Object.fromEntries(ids.map(id=>[id,'S']));
 assert.equal((await send(a,'vote',{round:1,ranking:{[ids[1]]:'A',[ids[2]]:'B'}})).ok,false);
 assert.equal((await send(a,'vote',{round:1,ranking:{...ranking,[ids[0]]:'X'}})).ok,false);
 assert.equal((await send(a,'vote',{round:1,ranking:{...ranking,outsider:'A'}})).ok,false);
 assert.equal((await send(a,'vote',{round:1,ranking})).ok,true);await pause();assert.equal(b.state.tierResults,null);assert.equal(b.state.tierLists,null);assert.equal(b.state.myVote,null);assert.deepEqual(a.state.myVote,ranking);assert.ok(b.state.players.every(p=>p.tierRatings===0));
 assert.equal((await send(a,'vote',{round:1,ranking})).ok,false);await send(b,'vote',{round:1,ranking:Object.fromEntries(ids.map(id=>[id,'D']))});
 await send(c,'vote',{round:1,ranking:Object.fromEntries(ids.map(id=>[id,'B']))});await pause();assert.equal(a.state.phase,'results');for(const id of ids)assert.deepEqual(a.state.tierResults[id],{average:2,rank:'B',ratings:3});assert.deepEqual(a.state.tierLists[ids[0]],ranking);assert.ok(a.state.players.every(p=>p.score===0));
 await send(a,'next');assert.equal((await send(a,'vote',{round:1,ranking})).ok,false);await send(c,'vote',{round:2,ranking});c.disconnect();const d=await t.connect();await send(d,'join',{code:t.code,token:t.session.token});assert.deepEqual(d.state.myVote,ranking);await send(a,'reveal');await pause();for(const id of ids)assert.equal(a.state.tierResults[id].rank,'S');
 }finally{t.close();}});
test('Mélange garantit les trois formats ; dossiers privés typés et validation',async()=>{const t=await setup();const{a,send}=t;try{
 await send(a,'settings',{format:'mixed',rounds:10});await send(a,'start');const deck=t.game.rooms.get(t.code).deck;assert.deepEqual(new Set(deck.map(q=>q.type||'friends')),new Set(['friends','yesno','tier']));assert.equal(new Set(deck.map(q=>q.id)).size,10);
 for(let i=0;i<10;i++)assert.equal((await send(a,'skip')).ok,true);assert.equal(a.state.phase,'finished');await send(a,'restart');assert.deepEqual(a.state.played,{friends:0,personal:0,tier:0});
 assert.equal((await send(a,'settings',{custom:[{text:'Test',type:'invalid'}]})).ok,false);
 await send(a,'settings',{format:'tier',source:'custom',custom:Array.from({length:10},(_,i)=>({type:'tier',text:'Classe les potes '+i+' ?'}))});assert.equal((await send(a,'start')).ok,true);assert.equal(a.state.question.type,'tier');assert.equal(a.state.question.category,'custom');
 }finally{t.close();}});
