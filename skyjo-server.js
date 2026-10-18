import {randomBytes,randomInt} from 'node:crypto';
import {createSkyjo,applySkyjo,skyjoView,skyjoBot,newRound,actions} from './skyjo-game.js';

export function installSkyjo(io,{botDelay=850}={}){
 const ns=io.of('/skyjo'),rooms=new Map(),timers=new Map();
 const fail=m=>{throw Error(m);},uid=()=>randomBytes(12).toString('hex');
 const make=(name,bot=false)=>({id:uid(),token:uid()+uid(),name:String(name||'').trim().slice(0,20),bot,sockets:new Set()});
 const online=p=>p.bot||p.sockets.size>0;
 function snapshot(r,p){const data=r.game?skyjoView(r.game,p.id):{phase:'lobby',players:r.players.map(p=>({id:p.id,name:p.name,bot:p.bot,score:0}))};return{...data,code:r.code,me:p.id,host:r.host,demo:r.demo,target:r.target,players:data.players.map(x=>({...x,online:online(r.players.find(p=>p.id===x.id))})),actions};}
 function broadcast(r){r.touched=Date.now();for(const p of r.players)for(const sid of p.sockets)ns.to(sid).emit('state',snapshot(r,p));schedule(r);}
 function schedule(r){clearTimeout(timers.get(r.code));timers.delete(r.code);if(!r.game||!r.players.some(p=>p.sockets.size))return;const choices=r.players.filter(p=>p.bot).map(p=>[p,skyjoBot(skyjoView(r.game,p.id),p.id)]).filter(([,c])=>c);if(!choices.length)return;const[p,c]=choices[0];const timer=setTimeout(()=>{timers.delete(r.code);try{r.game=applySkyjo(r.game,p.id,c);broadcast(r);}catch(e){console.error('Skyjo bot:',e.message);}},botDelay);timer.unref();timers.set(r.code,timer);}
 function detach(socket){const r=rooms.get(socket.data.code),p=r?.players.find(p=>p.id===socket.data.pid);if(p){p.sockets.delete(socket.id);socket.data={};broadcast(r);}}
 ns.on('connection',socket=>{let hits=[];
  function on(event,fn){socket.on(event,(d={},ack)=>{try{const now=Date.now();hits=hits.filter(t=>now-t<10000);if(hits.length>=100)fail('Trop d’actions. Attends quelques secondes.');hits.push(now);if(!d||typeof d!=='object')fail('Action invalide.');const result=fn(d);if(typeof ack==='function')ack({ok:true,...result});}catch(e){if(typeof ack==='function')ack({ok:false,error:e.message});}});}
  const member=()=>{const r=rooms.get(socket.data.code),p=r?.players.find(p=>p.id===socket.data.pid);if(!p)fail('Rejoins un salon.');return[r,p];};
  const host=(r,p)=>{if(r.host!==p.id)fail('Action réservée à l’hôte.');};
  function attach(r,p){detach(socket);socket.data={code:r.code,pid:p.id};p.sockets.add(socket.id);broadcast(r);return{code:r.code,token:p.token};}
  on('create',d=>{if(rooms.size>=200)fail('Serveur complet.');const p=make(d.name||'Toi');if(!p.name)fail('Choisis un pseudo.');let code;do{code='S'+Array.from({length:4},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('');}while(rooms.has(code));const r={code,host:p.id,players:[p],target:100,demo:d.demo===true,game:null,touched:Date.now()};if(r.demo)r.players.push(make('Pixel · bot',true),make('Nova · bot',true));rooms.set(code,r);return attach(r,p);});
  on('join',d=>{const r=rooms.get(String(d.code||'').toUpperCase());if(!r)fail('Salon introuvable.');let p=r.players.find(p=>!p.bot&&p.token===d.token);if(p)return attach(r,p);if(r.demo)fail('Ce salon est réservé au test solo.');if(r.game)fail('La partie est déjà lancée.');if(r.players.length>=8)fail('Le salon est complet.');p=make(d.name);if(!p.name)fail('Choisis un pseudo.');r.players.push(p);return attach(r,p);});
  on('settings',d=>{const[r,p]=member();host(r,p);if(r.game)fail('Les réglages sont verrouillés.');if(![50,100,150].includes(d.target))fail('Choisis 50, 100 ou 150 points.');r.target=d.target;broadcast(r);});
  on('start',()=>{const[r,p]=member();host(r,p);if(r.game)fail('La partie est déjà lancée.');r.players=r.players.filter(online);r.game=createSkyjo(r.players,{target:r.target,demo:r.demo});broadcast(r);});
  on('command',d=>{const[r,p]=member();if(!r.game)fail('La partie n’a pas commencé.');r.game=applySkyjo(r.game,p.id,d);broadcast(r);});
  on('next',()=>{const[r,p]=member();host(r,p);if(r.game?.phase!=='roundEnd')fail('La manche n’est pas terminée.');newRound(r.game);r.game.version++;broadcast(r);});
  on('restart',()=>{const[r,p]=member();host(r,p);if(r.game?.phase!=='finished')fail('La partie n’est pas terminée.');r.game=null;broadcast(r);});
  on('claim',()=>{const[r,p]=member();if(online(r.players.find(p=>p.id===r.host)))fail('L’hôte est connecté.');r.host=p.id;broadcast(r);});
  on('remove',d=>{const[r,p]=member();host(r,p);if(r.game)fail('Uniquement avant la partie.');const q=r.players.find(p=>p.id===d.id);if(!q||online(q)||q.id===p.id)fail('Ce joueur ne peut pas être retiré.');r.players=r.players.filter(p=>p!==q);broadcast(r);});
  on('leave',()=>{const[r,p]=member();detach(socket);if(!r.game&&!p.sockets.size){r.players=r.players.filter(q=>q!==p);if(r.host===p.id)r.host=r.players.find(q=>!q.bot)?.id;broadcast(r);}});
  socket.on('disconnect',()=>detach(socket));
 });
 const cleanup=setInterval(()=>{for(const[code,r]of rooms)if(!r.players.some(p=>p.sockets.size)&&Date.now()-r.touched>3600000){clearTimeout(timers.get(code));timers.delete(code);rooms.delete(code);}},60000);cleanup.unref();
 return{rooms,close(){clearInterval(cleanup);for(const t of timers.values())clearTimeout(t);timers.clear();}};
}
