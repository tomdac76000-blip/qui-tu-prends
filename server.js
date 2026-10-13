import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { randomBytes, randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const questions = JSON.parse(readFileSync(new URL('./questions.json', import.meta.url)));
const categories = [{id:'general',name:'Général',emoji:'🌍'},{id:'noir',name:'Humour noir',emoji:'💀'},{id:'gaming',name:'Gaming',emoji:'🎮'},{id:'lol',name:'League of Legends',emoji:'⚔️'},{id:'valorant',name:'VALORANT',emoji:'🔫'},{id:'rocket',name:'Rocket League',emoji:'🚗'},{id:'anime',name:'Manga / Anime',emoji:'🍥'},{id:'comics',name:'Comics / Super-héros',emoji:'🦸'},{id:'multivers',name:'Multivers',emoji:'🌌'},{id:'roast',name:'Roast entre potes',emoji:'🔥'}];
export function createGameServer({roundMs = 30000} = {}) {
  const app = express(), http = createServer(app), io = new Server(http, {maxHttpBufferSize: 64000});
  const rooms = new Map();
  app.disable('x-powered-by');
  app.get('/health', (_, res) => res.json({ok:true}));
  app.get('/meta',(_,res)=>res.json({categories,total:questions.length}));
  for(const file of ['index.html','app.js','style.css']) app.get(file==='index.html'?'/':'/'+file,(_,res)=>res.sendFile(fileURLToPath(new URL('./'+file,import.meta.url))));
  const fail = message => { throw new Error(message); };
  const clean = (value,max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
  const connected = room => [...room.players.values()].filter(p=>p.sockets.size);
  const host = (room,p) => { if(room.hostId !== p.id) fail('Seul l’hôte peut faire ça.'); };
  function pool(room) {
    const official=questions.filter(q=>room.settings.categories.includes(q.category)&&(room.settings.humor==='trash'||q.level==='normal'));
    const custom=room.custom.map((text,i)=>({id:'custom-'+i,text,category:'custom',level:room.settings.humor}));
    const all=room.settings.source==='custom'?custom:room.settings.source==='mixed'?[...official,...custom]:official;
    const seen=new Set();return all.filter(q=>{const key=q.text.toLocaleLowerCase('fr').replace(/\s+/g,' ').trim();if(seen.has(key))return false;seen.add(key);return true;});
  }
  function snapshot(room,p) {
    const revealed = room.phase === 'results' || room.phase === 'finished';
    const counts = Object.fromEntries([...room.players.keys()].map(id=>[id,0]));
    if(revealed) for(const picks of room.votes.values()) for(const id of picks) counts[id]++;
    return {code:room.code, me:p.id, hostId:room.hostId, phase:room.phase, settings:room.settings, serverNow:Date.now(), available:pool(room).length, customCount:room.custom.length,
      players:[...room.players.values()].map(x=>({id:x.id,name:x.name,emoji:x.emoji,online:!!x.sockets.size,score:x.score})),
      round:room.index+1, total:room.deck.length, question:room.deck[room.index] || null,
      deadline:room.deadline, voted:room.votes.size, voters:room.eligible.length,
      myVote:room.votes.get(p.id)||null, eligible:room.eligible, counts:revealed?counts:null};
  }
  function broadcast(room) { for(const p of room.players.values()) for(const sid of p.sockets) io.to(sid).emit('state', snapshot(room,p)); }
  function reveal(room) {
    if(room.phase!=='voting') return;
    clearTimeout(room.timer); room.phase='results'; room.deadline=null;
    for(const picks of room.votes.values()) for(const id of picks) room.players.get(id).score++;
    broadcast(room);
  }
  function check(room) {
    if(room.phase==='voting' && room.eligible.every(id=>room.votes.has(id)||!room.players.get(id)?.sockets.size)) reveal(room);
  }
  function next(room) {
    if(room.index+1<room.deck.length&&connected(room).length<room.settings.picks+1) fail('Pas assez de joueurs connectés pour la manche suivante.');
    clearTimeout(room.timer);
    room.index++;
    if(room.index>=room.deck.length) {room.phase='finished';room.deadline=null;broadcast(room);return;}
    room.phase='voting';room.votes=new Map();room.eligible=connected(room).map(p=>p.id);
    room.deadline=Date.now()+roundMs;room.timer=setTimeout(()=>reveal(room),roundMs);broadcast(room);
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
    function player(data) {const name=clean(data.name,20);if(!name) fail('Choisis un pseudo.');return {id:randomBytes(8).toString('hex'),token:randomBytes(24).toString('hex'),name,emoji:['😎','👾','🐸','💀','🔥','🦊','🐼','🦄','🤖','👑','🍕','🦖'].includes(data.emoji)?data.emoji:'😎',sockets:new Set(),score:0};}
    on('create',data=>{
      if(rooms.size>=500) fail('Serveur complet, réessaie plus tard.');
      const p=player(data);let code;do {code=Array.from({length:5},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('');}while(rooms.has(code));
      const r={code,players:new Map([[p.id,p]]),hostId:p.id,phase:'lobby',settings:{picks:2,rounds:15,categories:categories.map(c=>c.id),humor:'normal',source:'official'},custom:[],deck:[],index:-1,votes:new Map(),eligible:[],deadline:null,touched:Date.now()};
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
      if(data.custom!==undefined){if(!Array.isArray(data.custom)||data.custom.length>100||data.custom.some(x=>typeof x!=='string'||x.length>280))fail('Maximum 100 questions de 280 caractères.');r.custom=[...new Set(data.custom.map(q=>q.trim()).filter(Boolean))];}
      r.settings={...r.settings,picks:[1,2].includes(data.picks)?data.picks:r.settings.picks,rounds:[10,15,20].includes(data.rounds)?data.rounds:r.settings.rounds};
      if(['normal','trash'].includes(data.humor))r.settings.humor=data.humor;
      if(['official','custom','mixed'].includes(data.source))r.settings.source=data.source;
      if(Array.isArray(data.categories))r.settings.categories=[...new Set(data.categories.filter(id=>categories.some(c=>c.id===id)))];
      broadcast(r);
    });
    on('start',()=>{const [r,p]=member();host(r,p);if(r.phase!=='lobby') fail('Partie déjà lancée.');if(connected(r).length<3) fail('Il faut au moins 3 joueurs connectés.');
      r.deck=pool(r);if(r.deck.length<r.settings.rounds)fail(`Il y a ${r.deck.length} questions disponibles pour ${r.settings.rounds} manches. Ajoute des catégories ou des questions.`);
      for(let i=r.deck.length-1;i>0;i--){const j=randomInt(i+1);[r.deck[i],r.deck[j]]=[r.deck[j],r.deck[i]];}r.deck=r.deck.slice(0,r.settings.rounds);r.index=-1;next(r);
    });
    on('vote',data=>{const [r,p]=member();if(r.phase!=='voting'||Date.now()>r.deadline) fail('Les votes sont terminés.');if(!r.eligible.includes(p.id)) fail('Tu participeras à la prochaine manche.');
      if(r.votes.has(p.id)) fail('Ton vote est déjà enregistré.');
      if(data.round!==r.index+1) fail('Cette manche est terminée.');
      if(!Array.isArray(data.picks)||data.picks.length!==r.settings.picks||new Set(data.picks).size!==r.settings.picks||data.picks.some(id=>id===p.id||!r.eligible.includes(id))) fail(`Sélectionne ${r.settings.picks} autre(s) joueur(s).`);
      r.votes.set(p.id,data.picks);check(r);broadcast(r);
    });
    on('reveal',()=>{const [r,p]=member();host(r,p);reveal(r);});
    on('next',()=>{const [r,p]=member();host(r,p);if(r.phase!=='results') fail('Attends la révélation.');next(r);});
    on('skip',()=>{const [r,p]=member();host(r,p);if(r.phase!=='voting') fail('Aucune question à passer.');next(r);});
    on('restart',()=>{const [r,p]=member();host(r,p);if(r.phase!=='finished') fail('La partie n’est pas terminée.');r.phase='lobby';r.index=-1;r.deck=[];r.votes.clear();r.eligible=[];for(const x of r.players.values())x.score=0;broadcast(r);});
    on('claimHost',()=>{const [r,p]=member();if(r.players.get(r.hostId).sockets.size) fail('L’hôte est encore connecté.');r.hostId=p.id;broadcast(r);});
    on('removeOffline',data=>{const [r,p]=member();host(r,p);if(r.phase!=='lobby')fail('Uniquement avant la partie.');const target=r.players.get(data.id);if(!target||target.sockets.size||target.id===p.id)fail('Ce joueur ne peut pas être retiré.');r.players.delete(data.id);broadcast(r);});
    on('leave',()=>{const [r,p]=member();detach(socket);if(r.phase==='lobby'&&!p.sockets.size){r.players.delete(p.id);if(r.hostId===p.id)r.hostId=connected(r)[0]?.id||r.players.keys().next().value;broadcast(r);}});
    socket.on('disconnect',()=>{clearInterval(rate);detach(socket);});
  });
  const cleanup=setInterval(()=>{for(const [code,r] of rooms)if(!connected(r).length&&Date.now()-r.touched>3600000){clearTimeout(r.timer);rooms.delete(code);}},60000);cleanup.unref();
  return {app,http,io,rooms,close:()=>{clearInterval(cleanup);for(const r of rooms.values())clearTimeout(r.timer);io.close();http.close();}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {const {http}=createGameServer();http.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Qui tu prends ? prêt sur le port '+(process.env.PORT||3000)));}
