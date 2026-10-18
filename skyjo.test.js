import {test} from 'node:test';
import assert from 'node:assert/strict';
import {io} from 'socket.io-client';
import {createSkyjo,applySkyjo,skyjoView,skyjoBot,clearLines,starBonus,newRound,actions} from './skyjo-game.js';
import {createGameServer} from './server.js';
const players=['a','b','c'].map(id=>({id,name:id}));
const move=(s,id,c)=>applySkyjo(s,id,{...c,version:s.version});
const fixture=()=>{const s=createSkyjo(players);s.phase='turn';s.active='a';s.turn=10;for(const p of s.players){p.grid=Array.from({length:12},(_,i)=>({v:i,up:i<2}));p.ready=true;}return s;};
const give=(s,type,id='a')=>{s.players.find(p=>p.id===id).hand.push({id:type,type,ready:0});return type;};
const play=(s,type)=>move(s,'a',{type:'play',id:give(s,type)});

test('Skyjo : 120 cartes de jeu, 27 actions, secrets et deux cartes initiales',()=>{
 let s=createSkyjo(players);assert.equal(s.deck.length+37,120);assert.equal(s.actionDeck.length+5,27);const v=skyjoView(s,'a');assert.ok(v.players.every(p=>p.grid.every(c=>c.v===null)));assert.equal(v.deck,undefined);
 for(const p of s.players)for(let i=0;i<2;i++){s=move(s,p.id,{type:'open',index:i});while(s.phase==='bonus')s=move(s,s.bonuses[0],{type:'passBonus'});}
 assert.equal(s.phase,'turn');assert.equal(s.players.find(p=>p.id===s.active).grid.filter(c=>c.up).length,2);
 const max=Math.max(...s.players.map(p=>p.grid.filter(c=>c.up).reduce((n,c)=>n+(typeof c.v==='number'?c.v:0),0)));assert.equal(s.players.find(p=>p.id===s.active).grid.filter(c=>c.up).reduce((n,c)=>n+(typeof c.v==='number'?c.v:0),0),max);
});
test('Skyjo : validation atomique, carte piochée privée et échange obligatoire',()=>{
 let s=fixture();const before=structuredClone(s);assert.throws(()=>move(s,'b',{type:'draw',source:'deck'}));assert.deepEqual(s,before);s=move(s,'a',{type:'draw',source:'deck'});assert.equal(skyjoView(s,'b').pending,null);assert.equal(skyjoView(s,'a').pending.cards.length,1);assert.throws(()=>applySkyjo(s,'a',{type:'replace',index:0,version:s.version-1}));s=fixture();s=move(s,'a',{type:'draw',source:'discard'});assert.throws(()=>move(s,'a',{type:'discardDraw'}));assert.throws(()=>move(s,'a',{type:'replace',index:99}));s=move(s,'a',{type:'replace',index:2});assert.ok(['turn','bonus'].includes(s.phase));
});
test('Skyjo : étoiles, bonus de départ et lignes supprimées',()=>{
 let s=createSkyjo(players);s.players[0].grid[0]={v:'star',up:false};s=move(s,'a',{type:'open',index:0});assert.equal(s.phase,'bonus');assert.equal(s.bonuses[0],'a');s=move(s,'a',{type:'bonus',index:0});assert.equal(s.players[0].hand.length,1);assert.equal(s.phase,'setup');assert.equal(s.players[0].opened,1);
 const p=s.players[0];p.grid=Array(12).fill(null);for(const[i,v]of [[0,7],[4,'star'],[8,7]])p.grid[i]={v,up:true};clearLines(s,p);assert.ok(p.grid.every(c=>c===null));assert.equal(starBonus(Array.from({length:12},()=>({v:'star',up:true}))),45);
});
test('Skyjo : permutation, faces et protection des échanges',()=>{
 let s=play(fixture(),'swap');s=move(s,'a',{type:'resolve',targets:[{player:'a',index:0},{player:'a',index:5}],faces:[true,false]});assert.equal(s.players[0].grid[0].v,5);assert.equal(s.players[0].grid[5].up,false);
 s=fixture();give(s,'shield','b');s=play(s,'trade');s=move(s,'a',{type:'resolve',targets:[{player:'a',index:0},{player:'b',index:7}],faces:[true,true]});assert.equal(s.players[0].grid[0].v,0);assert.equal(s.players[1].grid[7].v,7);assert.equal(s.players[1].hand.length,0);assert.ok(s.actionDiscard.some(a=>a.type==='shield'));
});
test('Skyjo : double tour, bouclier joué et triple pioche',()=>{
 let s=play(fixture(),'double');assert.equal(s.active,'a');assert.equal(s.extra,1);s=move(s,'a',{type:'draw',source:'deck'});s=move(s,'a',{type:'discardDraw'});s=move(s,'a',{type:'flip',index:2});assert.equal(s.active,'a');assert.equal(s.extra,0);s=play(fixture(),'shield');assert.equal(s.active,'a');assert.equal(s.extra,0);
 s=play(fixture(),'triple');assert.equal(s.pending.cards.length,3);assert.equal(skyjoView(s,'b').pending,null);const cards=structuredClone(s.pending.cards);s=move(s,'a',{type:'chooseTriple',index:1,order:[2,0]});assert.equal(s.pending.cards[0].v,cards[1].v);assert.equal(s.discard.at(-1).v,cards[0].v);assert.equal(s.phase,'held');assert.throws(()=>move(s,'a',{type:'discardDraw'}));
});
test('Skyjo : observation privée, réactivation et vol retardé',()=>{
 let s=play(fixture(),'peek');s=move(s,'a',{type:'resolve',player:'b',line:3});assert.equal(s.peek.cells.length,3);assert.equal(skyjoView(s,'b').peek,null);assert.equal(skyjoView(s,'a').players[1].grid[4].v,null);s=move(s,'a',{type:'done'});assert.equal(s.peek,null);
 s=fixture();s.actionDiscard.push({id:'used-shield',type:'shield'});s=play(s,'recycle');s=move(s,'a',{type:'recycle',id:'used-shield'});assert.equal(s.phase,'turn');assert.equal(s.active,'a');
 s=fixture();give(s,'double','b');s=play(s,'steal');s=move(s,'a',{type:'resolve',player:'b',id:'double'});assert.equal(s.active,'a');assert.equal(s.players[1].hand.length,0);assert.equal(skyjoView(s,'a').players[0].hand[0].playable,false);assert.throws(()=>move(s,'a',{type:'play',id:'double'}));
});
test('Skyjo : météorites, cibles uniques et bouclier',()=>{
 let s=fixture();give(s,'shield','b');s.deck=Array.from({length:20},()=>({v:-2,up:false}));s=play(s,'meteor');const targets=players.map(p=>({player:p.id,index:7}));assert.throws(()=>move(s,'a',{type:'resolve',targets:[targets[0],targets[0],targets[2]]}));s=move(s,'a',{type:'resolve',targets});assert.equal(s.players[0].grid[7].v,-2);assert.equal(s.players[1].grid[7].v,7);assert.equal(s.players[2].grid[7].v,-2);
});
test('Skyjo : dernier tour, interdiction des actions et score doublé',()=>{
 let s=fixture();s.target=50;s.players[0].grid=Array.from({length:12},(_,i)=>({v:i+1,up:i!==11}));s.players[1].grid=Array.from({length:12},()=>({v:0,up:false}));s.players[2].grid=Array.from({length:12},()=>({v:0,up:false}));give(s,'shield','b');s.phase='flip';s=move(s,'a',{type:'flip',index:11});assert.equal(s.finisher,'a');assert.equal(s.finalLeft,2);assert.throws(()=>move(s,'b',{type:'play',id:'shield'}));for(const id of ['b','c']){s=move(s,id,{type:'draw',source:'deck'});s=move(s,id,{type:'discardDraw'});s=move(s,id,{type:'flip',index:0});}
 assert.equal(s.phase,'finished');assert.equal(s.result[0].doubled,true);assert.equal(s.result[0].points,156);assert.equal(s.result[1].actions,10);assert.deepEqual(s.winners,['c']);assert.ok(s.players.every(p=>p.grid.every(c=>!c||c.up)));
});
test('Skyjo : 15 parties autonomes terminent sans secret ni blocage',()=>{
 for(let game=0;game<15;game++){let s=createSkyjo(players,{target:50}),steps=0;while(s.phase!=='finished'&&steps++<10000){if(s.phase==='roundEnd'){newRound(s);s.version++;continue;}let handled=false;for(const p of s.players){const c=skyjoBot(skyjoView(s,p.id),p.id);if(c){s=applySkyjo(s,p.id,c);handled=true;break;}}assert.ok(handled,'Progression en phase '+s.phase);}assert.equal(s.phase,'finished');assert.ok(steps<10000);}
});
test('Skyjo public contract : salon solo, bots, reconnexion, secrets et droits',async()=>{
 const server=createGameServer();await new Promise(r=>server.http.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.http.address().port,sockets=[];
 const connect=()=>{const s=io(url+'/skyjo',{forceNew:true});sockets.push(s);s.on('state',v=>s.state=v);return s;};
 const wait=async fn=>{for(let i=0;i<200&&!fn();i++)await new Promise(r=>setTimeout(r,25));assert.ok(fn());};
 const send=(s,e,d={})=>new Promise(resolve=>s.emit(e,d,resolve));
 try{const a=connect(),b=connect();await wait(()=>a.connected&&b.connected);const made=await send(a,'create',{name:'Hôte',demo:true});assert.equal(a.state.players.length,3);assert.equal((await send(b,'join',{code:made.code,name:'Intrus'})).ok,false);assert.equal((await send(a,'start')).ok,true);await wait(()=>a.state.players.filter(p=>p.bot).every(p=>p.ready)||a.state.phase==='bonus');
  for(let i=0;i<2;i++){while(a.state.phase==='bonus'){if(a.state.bonusPlayer===a.state.me)await send(a,'command',{type:'passBonus',version:a.state.version});else await new Promise(r=>setTimeout(r,100));}assert.equal((await send(a,'command',{type:'open',index:i,version:a.state.version})).ok,true);}
  while(a.state.phase==='bonus'){if(a.state.bonusPlayer===a.state.me)await send(a,'command',{type:'passBonus',version:a.state.version});else await new Promise(r=>setTimeout(r,100));}await wait(()=>a.state.phase==='turn');assert.equal(a.state.active,a.state.me);const self=a.state.me;a.disconnect();assert.equal((await send(b,'join',{code:made.code,token:made.token})).ok,true);assert.equal(b.state.me,self);assert.equal(b.state.players.length,3);assert.ok(b.state.players.every(p=>p.grid.filter(c=>c&&!c.up).every(c=>c.v===null)));assert.equal((await send(b,'next')).ok,false);assert.equal((await fetch(url+'/skyjo')).status,200);
 }finally{sockets.forEach(s=>s.disconnect());server.close();}
});
