import {test} from 'node:test';
import assert from 'node:assert/strict';
import {io as client} from 'socket.io-client';
import {createGameServer} from './server.js';

test('partie à trois : choix 1/2, confidentialité, droits, doublons, reconnexion et résultats',async()=>{
 const game=createGameServer();await new Promise(r=>game.http.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+game.http.address().port, sockets=[];
 const connect=async()=>{const s=client(url,{forceNew:true});sockets.push(s);s.on('state',v=>s.state=v);await new Promise(r=>s.on('connect',r));return s;};
 const send=(s,e,d={})=>new Promise(r=>s.emit(e,d,r));
 try{
 const a=await connect(),b=await connect(),c=await connect();
 const created=await send(a,'create',{name:'Alice',emoji:'🐸'});assert.equal(created.ok,true);
 await send(b,'join',{code:created.code,name:'Bob'});const cj=await send(c,'join',{code:created.code,name:'Chris'});
 assert.equal((await send(b,'settings',{picks:1})).ok,false);
 await send(a,'settings',{picks:1,rounds:10,format:'friends'});assert.equal((await send(a,'start')).ok,true);
 await new Promise(r=>setTimeout(r,30));const ids=[a,b,c].map(s=>s.state.me);
 assert.equal((await send(a,'vote',{round:1,picks:[ids[0]]})).ok,false);
 assert.equal((await send(a,'vote',{round:1,picks:[ids[1],ids[2]]})).ok,false);
 assert.equal((await send(a,'vote',{round:1,picks:[ids[1]]})).ok,true);
 assert.equal((await send(a,'vote',{round:1,picks:[ids[2]]})).ok,false);
 await new Promise(r=>setTimeout(r,20));assert.equal(b.state.counts,null);assert.equal(b.state.myVote,null);
 await send(b,'vote',{round:1,picks:[ids[2]]});await send(c,'vote',{round:1,picks:[ids[1]]});
 await new Promise(r=>setTimeout(r,20));assert.equal(a.state.phase,'results');assert.equal(a.state.counts[ids[1]],2);
 c.disconnect();const d=await connect();await send(d,'join',{code:created.code,token:cj.token});assert.equal(d.state.me,ids[2]);
 assert.equal((await send(b,'next')).ok,false);assert.equal((await send(a,'next')).ok,true);
 assert.equal((await send(a,'vote',{round:1,picks:[ids[1]]})).ok,false);
 const seen=new Set([a.state.question.id]);for(let i=0;i<9;i++){await send(a,'reveal');await send(a,'next');if(a.state.phase==='voting'){assert.ok(!seen.has(a.state.question.id));seen.add(a.state.question.id);}}
 assert.equal(a.state.phase,'finished');await send(a,'restart');await send(a,'settings',{picks:2});await send(a,'start');
 assert.equal((await send(a,'vote',{round:1,picks:[ids[1],ids[1]]})).ok,false);
 assert.equal((await send(a,'vote',{round:1,picks:[ids[1],ids[2]]})).ok,true);
 }finally{sockets.forEach(s=>s.disconnect());game.close();}
});
test('la minuterie révèle même sans votes',async()=>{
 const game=createGameServer({roundMs:120,tierMs:120});await new Promise(r=>game.http.listen(0,'127.0.0.1',r));const sockets=[];
 const send=(s,e,d={})=>new Promise(r=>s.emit(e,d,r));
 try{for(let i=0;i<3;i++){const s=client('http://127.0.0.1:'+game.http.address().port,{forceNew:true});s.on('state',v=>s.state=v);await new Promise(r=>s.on('connect',r));sockets.push(s);}
 const [a,b,c]=sockets;const {code}=await send(a,'create',{name:'A'});await send(b,'join',{code,name:'B'});await send(c,'join',{code,name:'C'});await send(a,'start');await new Promise(r=>setTimeout(r,220));assert.equal(a.state.phase,'results');
 }finally{sockets.forEach(s=>s.disconnect());game.close();}
});
test('catégories, Trash et questions privées ne sortent pas de leur salon',async()=>{
 const game=createGameServer();await new Promise(r=>game.http.listen(0,'127.0.0.1',r));const sockets=[];
 const send=(s,e,d={})=>new Promise(r=>s.emit(e,d,r));
 async function connect(){const s=client('http://127.0.0.1:'+game.http.address().port,{forceNew:true});sockets.push(s);s.on('state',v=>s.state=v);await new Promise(r=>s.on('connect',r));return s;}
 try{const a=await connect(),b=await connect(),c=await connect(),other=await connect();const {code}=await send(a,'create',{name:'A'});await send(b,'join',{code,name:'B'});await send(c,'join',{code,name:'C'});await send(other,'create',{name:'Autre salon'});
 await send(a,'settings',{categories:['anime'],humor:'normal',rounds:20,format:'friends'});assert.equal((await send(a,'start')).ok,false);
 await send(a,'settings',{humor:'trash'});assert.equal((await send(a,'start')).ok,true);assert.equal(a.state.question.category,'anime');
 const custom=Array.from({length:10},(_,i)=>'Dossier confidentiel '+i+' ?');assert.equal((await send(other,'settings',{custom,source:'custom',rounds:10})).ok,true);
 assert.equal(JSON.stringify(a.state).includes('Dossier confidentiel'),false);
 assert.equal((await send(b,'settings',{custom})).ok,false);
 const room=game.rooms.get(code);assert.equal(room.deck.length,20);assert.equal(new Set(room.deck.map(q=>q.text)).size,20);assert.ok(room.deck.some(q=>q.level==='trash'));
 }finally{sockets.forEach(s=>s.disconnect());game.close();}
});



