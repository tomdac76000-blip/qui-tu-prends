import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { randomBytes, randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installArcade } from './arcade-server.js';

const questions = JSON.parse(readFileSync(new URL('./questions.json', import.meta.url)));
const categories = [];
export function createGameServer({roundMs = 30000, tierMs = 60000} = {}) {
  const app = express(), http = createServer(app), io = new Server(http, {maxHttpBufferSize: 64000});
  const rooms = new Map();
  const arcade=installArcade(io);
  app.get('/arcade-meta',(_,res)=>res.json(arcade.meta));
  for(const page of ['trivial','note','piege','curseur']) app.get('/'+page,(_,res)=>res.sendFile(fileURLToPath(new URL('./arcade.html',import.meta.url))));
  for(const file of ['arcade.js','arcade.css','nav.js','effects.js'])app.get('/'+file,(_,res)=>res.sendFile(fileURLToPath(new URL('./'+file,import.meta.url))));
  app.disable('x-powered-by');
  app.get('/health', (_, res) => res.json({ok:true}));
  app.get('/meta',(_,res)=>res.json({categories,total:questions.length}));
  for(const file of ['index.html','app.js','style.css']) app.get(file==='index.html'?'/':'/'+file,(_,res)=>res.sendFile(fileURLToPath(new URL('./'+file,import.meta.url))));
  const fail = message => { throw new Error(message); };
  const clean = (value,max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
  const connected = room => [...room.players.values()].filter(p=>p.sockets.size);
  const host = (room,p) => { if(room.hostId !== p.id) fail('Seul l’hôte peut faire ça.'); };
  const personal = question => question?.type==='yesno';
  const tier = question => question?.type==='tier';
  const kind = question => personal(question)?'personal':tier(question)?'tier':'friends';
  const ranks=['D','C','B','A','S'];
  function pool(room) {
    const official=questions.filter(q=>q.level===room.settings.humor);
    const custom=room.custom.map((q,i)=>({id:'custom-'+i,...q,category:'custom',level:room.settings.humor}));
    const all=room.settings.source==='custom'?custom:room.settings.source==='mixed'?[...official,...custom]:official;
    const seen=new Set();return all.filter(q=>{if(room.settings.format!=='mixed'&&kind(q)!==room.settings.format)return false;const key=q.text.toLocaleLowerCase('fr').replace(/\s+/g,' ').trim();if(seen.has(key))return false;seen.add(key);return true;});
  }
  function snapshot(room,p) {
    const revealed = room.phase === 'results' || room.phase === 'finished';
    const isPersonal=personal(room.deck[room.index]), counts=isPersonal?{yes:0,no:0,unanswered:room.eligible.length-room.votes.size}:Object.fromEntries([...room.players.keys()].map(id=>[id,0]));
    const isTier=tier(room.deck[room.index]);
    let tierResults=null;
    if(revealed&&isTier){tierResults={};for(const id of room.eligible){const values=[...room.votes.values()].map(v=>ranks.indexOf(v[id]));const average=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;tierResults[id]={average,rank:average===null?null:ranks[Math.round(average)],ratings:values.length};}}
    if(revealed) for(const vote of room.votes.values()) {if(isPersonal)counts[vote]++;else if(Array.isArray(vote))for(const id of vote)counts[id]++;}
    return {code:room.code, me:p.id, hostId:room.hostId, phase:room.phase, settings:room.settings, serverNow:Date.now(), available:pool(room).length, customCount:room.custom.length, played:room.played,
      players:[...room.players.values()].map(x=>({id:x.id,name:x.name,emoji:x.emoji,online:!!x.sockets.size,score:x.score,yesCount:x.yesCount,noCount:x.noCount,tierSum:x.tierSum,tierRatings:x.tierRatings})),
      round:room.index+1, total:room.deck.length, question:room.deck[room.index] || null,
      deadline:room.deadline, durationMs:room.durationMs, voted:room.votes.size, voters:room.eligible.length,tierResults,tierLists:revealed&&isTier?Object.fromEntries(room.votes):null,
      myVote:room.votes.get(p.id)||null, eligible:room.eligible, counts:revealed?counts:null, answers:revealed&&isPersonal?Object.fromEntries(room.votes):null};
  }
  function broadcast(room) { for(const p of room.players.values()) for(const sid of p.sockets) io.to(sid).emit('state', snapshot(room,p)); }
  function reveal(room) {
    if(room.phase!=='voting') return;
    clearTimeout(room.timer); room.phase='results'; room.deadline=null;
    if(personal(room.deck[room.index])){room.played.personal++;for(const [id,answer] of room.votes)room.players.get(id)[answer==='yes'?'yesCount':'noCount']++;}
    else if(tier(room.deck[room.index])){room.played.tier++;for(const vote of room.votes.values())for(const [id,rank]of Object.entries(vote)){const p=room.players.get(id);p.tierSum+=ranks.indexOf(rank);p.tierRatings++;}}
    else{room.played.friends++;for(const picks of room.votes.values())for(const id of picks)room.players.get(id).score++;}
    broadcast(room);
  }
  function check(room) {
    if(room.phase==='voting' && room.eligible.every(id=>room.votes.has(id)||!room.players.get(id)?.sockets.size)) reveal(room);
  }
  function next(room) {
    if(room.index+1<room.deck.length&&connected(room).length<(kind(room.deck[room.index+1])==='friends'?room.settings.picks+1:1)) fail('Pas assez de joueurs connectés pour la manche suivante.');
    clearTimeout(room.timer);
    room.index++;
    if(room.index>=room.deck.length) {room.phase='finished';room.deadline=null;broadcast(room);return;}
    room.phase='voting';room.votes=new Map();room.eligible=connected(room).map(p=>p.id);
    room.durationMs=tier(room.deck[room.index])?tierMs:roundMs;room.deadline=Date.now()+room.durationMs;room.timer=setTimeout(()=>reveal(room),room.durationMs);broadcast(room);
  }
  function detach(socket) {
    const room=rooms.get(socket.data.code), p=room?.players.get(socket.data.playerId);
    if(!p) return; p.sockets.delete(socket.id);room.touched=Date.now();
    socket.leave(room.code); socket.data={};check(room);broadcast(room);
  }
  io.on('connection', socket=>{
    let hits=0;const rate=setInterval(()=>hits=0,10000);rate.unref();
    function on(event, fn) { socket.on(event,(data={},ack=()=>{})=>{try{
      if(++hits>60) fail('Doucement ! Réessaie dans quelques secondes.');
      const result=fn(data);if(typeof ack==='function') ack({ok:true,...result});
    }catch(e){if(typeof ack==='function') ack({ok:false,error:e.message});}}); }
    function member() {const r=rooms.get(socket.data.code),p=r?.players.get(socket.data.playerId);if(!r||!p) fail('Rejoins d’abord un salon.');return [r,p];}
    function attach(room,p) {detach(socket);socket.data={code:room.code,playerId:p.id};socket.join(room.code);p.sockets.add(socket.id);room.touched=Date.now();broadcast(room);return {token:p.token,code:room.code};}
    function player(data) {const name=clean(data.name,20);if(!name) fail('Choisis un pseudo.');return {id:randomBytes(8).toString('hex'),token:randomBytes(24).toString('hex'),name,emoji:['😎','👾','🐸','💀','🔥','🦊','🐼','🦄','🤖','👑','🍕','🦖'].includes(data.emoji)?data.emoji:'😎',sockets:new Set(),score:0,yesCount:0,noCount:0,tierSum:0,tierRatings:0};}
    on('create',data=>{
      if(rooms.size>=500) fail('Serveur complet, réessaie plus tard.');
      const p=player(data);let code;do {code=Array.from({length:5},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('');}while(rooms.has(code));
      const r={code,players:new Map([[p.id,p]]),hostId:p.id,phase:'lobby',settings:{picks:2,rounds:15,humor:'normal',source:'official',format:'mixed'},played:{friends:0,personal:0,tier:0},custom:[],deck:[],index:-1,votes:new Map(),eligible:[],deadline:null,touched:Date.now()};
      rooms.set(code,r);return attach(r,p);
    });
    on('join',data=>{
      const r=rooms.get(clean(data.code,5).toUpperCase());if(!r) fail('Salon introuvable. Vérifie le code.');
      const known=[...r.players.values()].find(p=>p.token===data.token);
      if(known) return attach(r,known);
      if(r.phase!=='lobby') fail('La partie a déjà commencé. Attends la prochaine.');
      if(r.players.size>=12) fail('Ce salon est complet (12 joueurs).');
      const p=player(data);r.players.set(p.id,p);if(!r.hostId)r.hostId=p.id;return attach(r,p);
    });
    on('settings',data=>{const [r,p]=member();host(r,p);if(r.phase!=='lobby') fail('La partie a commencé.');
      if(data.custom!==undefined){if(!Array.isArray(data.custom)||data.custom.length>100)fail('Maximum 100 questions de 280 caractères.');const normalized=data.custom.map(q=>typeof q==='string'?{text:q,type:'friends'}:q);if(normalized.some(q=>!q||typeof q.text!=='string'||q.text.length>280||!['friends','yesno','tier'].includes(q.type)))fail('Question invalide : texte et type de réponse requis.');const seen=new Set();r.custom=normalized.filter(q=>{const text=q.text.trim();if(!text||seen.has(text))return false;seen.add(text);return true;}).map(q=>({text:q.text.trim(),type:q.type}));}
      r.settings={...r.settings,picks:[1,2].includes(data.picks)?data.picks:r.settings.picks,rounds:[10,15,20].includes(data.rounds)?data.rounds:r.settings.rounds};
      if(['normal','trash'].includes(data.humor))r.settings.humor=data.humor;
      if(['official','custom','mixed'].includes(data.source))r.settings.source=data.source;
      if(['friends','personal','tier','mixed'].includes(data.format))r.settings.format=data.format;
      broadcast(r);
    });
    on('start',()=>{const [r,p]=member();host(r,p);if(r.phase!=='lobby') fail('Partie déjà lancée.');if(connected(r).length<3) fail('Il faut au moins 3 joueurs connectés.');
      r.deck=pool(r);if(r.deck.length<r.settings.rounds)fail(`Il y a ${r.deck.length} questions disponibles pour ${r.settings.rounds} manches. Ajoute des catégories ou des questions.`);
      for(let i=r.deck.length-1;i>0;i--){const j=randomInt(i+1);[r.deck[i],r.deck[j]]=[r.deck[j],r.deck[i]];}const reserve=[...r.deck];r.deck=r.deck.slice(0,r.settings.rounds);
      if(r.settings.format==='mixed')for(const type of ['friends','personal','tier'])if(!r.deck.some(q=>kind(q)===type)){const q=reserve.find(q=>kind(q)===type);if(q){const index=r.deck.findIndex(x=>r.deck.filter(y=>kind(y)===kind(x)).length>1);r.deck[index]=q;}}
      r.index=-1;next(r);
    });
    on('vote',data=>{const [r,p]=member();if(r.phase!=='voting'||Date.now()>r.deadline) fail('Les votes sont terminés.');if(!r.eligible.includes(p.id)) fail('Tu participeras à la prochaine manche.');
      if(r.votes.has(p.id)) fail('Ton vote est déjà enregistré.');
      if(data.round!==r.index+1) fail('Cette manche est terminée.');
      if(personal(r.deck[r.index])){if(!['yes','no'].includes(data.answer))fail('Réponds Oui ou Non pour toi-même.');r.votes.set(p.id,data.answer);}
      else if(tier(r.deck[r.index])){const v=data.ranking;if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==r.eligible.length||r.eligible.some(id=>!Object.hasOwn(v,id)||!ranks.includes(v[id])))fail('Classe chaque joueur, toi compris, de S à D.');r.votes.set(p.id,Object.fromEntries(r.eligible.map(id=>[id,v[id]])));}
      else{if(!Array.isArray(data.picks)||data.picks.length!==r.settings.picks||new Set(data.picks).size!==r.settings.picks||data.picks.some(id=>id===p.id||!r.eligible.includes(id))) fail(`Sélectionne ${r.settings.picks} autre(s) joueur(s).`);r.votes.set(p.id,data.picks);}
      check(r);broadcast(r);
    });
    on('reveal',()=>{const [r,p]=member();host(r,p);reveal(r);});
    on('next',()=>{const [r,p]=member();host(r,p);if(r.phase!=='results') fail('Attends la révélation.');next(r);});
    on('skip',()=>{const [r,p]=member();host(r,p);if(r.phase!=='voting') fail('Aucune question à passer.');next(r);});
    on('restart',()=>{const [r,p]=member();host(r,p);if(r.phase!=='finished') fail('La partie n’est pas terminée.');r.phase='lobby';r.index=-1;r.deck=[];r.votes.clear();r.eligible=[];r.played={friends:0,personal:0,tier:0};for(const x of r.players.values()){x.score=0;x.yesCount=0;x.noCount=0;x.tierSum=0;x.tierRatings=0;}broadcast(r);});
    on('claimHost',()=>{const [r,p]=member();if(r.players.get(r.hostId).sockets.size) fail('L’hôte est encore connecté.');r.hostId=p.id;broadcast(r);});
    on('removeOffline',data=>{const [r,p]=member();host(r,p);if(r.phase!=='lobby')fail('Uniquement avant la partie.');const target=r.players.get(data.id);if(!target||target.sockets.size||target.id===p.id)fail('Ce joueur ne peut pas être retiré.');r.players.delete(data.id);broadcast(r);});
    on('leave',()=>{const [r,p]=member();detach(socket);if(r.phase==='lobby'&&!p.sockets.size){r.players.delete(p.id);if(r.hostId===p.id)r.hostId=connected(r)[0]?.id||r.players.keys().next().value;broadcast(r);}});
    socket.on('disconnect',()=>{clearInterval(rate);detach(socket);});
  });
  const cleanup=setInterval(()=>{for(const [code,r] of rooms)if(!connected(r).length&&Date.now()-r.touched>3600000){clearTimeout(r.timer);rooms.delete(code);}},60000);cleanup.unref();
  return {app,http,io,rooms,arcade,close:()=>{arcade.close();clearInterval(cleanup);for(const r of rooms.values())clearTimeout(r.timer);io.close();http.close();}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {const {http}=createGameServer();http.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Qui tu prends ? prêt sur le port '+(process.env.PORT||3000)));}

