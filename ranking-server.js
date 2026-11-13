import {readFileSync} from 'node:fs';
const bank=JSON.parse(readFileSync(new URL('./ranking-content.json',import.meta.url)));
export const rankingCharacters=bank.characters;
import {randomBytes,randomInt} from 'node:crypto';
const id=()=>randomBytes(18).toString('hex'),fail=m=>{throw Error(m)},clean=(s,n)=>typeof s==='string'?s.trim().slice(0,n):'';
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
export function installRanking(io){const ns=io.of('/ranking'),rooms=new Map(),online=p=>p.sockets.size>0;

 const card=c=>c?{id:c.id,name:c.name,universe:c.universe,image:'/ranking/image/'+c.id}:null;
 const turn=r=>r.players[r.turnIndex%r.players.length]?.id;
 function view(r,p){return {code:r.code,me:p.id,host:r.host,phase:r.phase,revision:r.revision,size:r.size,index:r.index,turn:turn(r),current:r.phase==='place'?card(r.deck[r.index]):null,board:r.board.map(card),swaps:r.swaps,history:r.history,players:r.players.map(x=>({id:x.id,name:x.name,online:online(x)}))}}
 function emit(r){r.touched=Date.now();for(const p of r.players)for(const sid of p.sockets)ns.to(sid).emit('state',view(r,p))}
 function detach(s){const r=rooms.get(s.data.rankingCode),p=r?.players.find(p=>p.id===s.data.rankingId);if(p){p.sockets.delete(s.id);if(!r.players.some(x=>x.id===r.host&&online(x)))r.host=r.players.find(online)?.id||r.host;emit(r)}delete s.data.rankingCode;delete s.data.rankingId}
 ns.on('connection',s=>{let hits=[];const on=(e,fn)=>s.on(e,(d={},ack)=>{try{hits=hits.filter(t=>Date.now()-t<10000);if(hits.length>=80)fail('Attends quelques secondes.');hits.push(Date.now());if(!d||typeof d!=='object')fail('Action invalide.');const v=fn(d);if(typeof ack==='function')ack({ok:true,...v})}catch(e){if(typeof ack==='function')ack({ok:false,error:e.message})}});
 const member=()=>{const r=rooms.get(s.data.rankingCode),p=r?.players.find(p=>p.id===s.data.rankingId);if(!p)fail('Rejoins un salon.');return[r,p]},host=(r,p)=>{if(r.host!==p.id)fail('Réservé à l’hôte.')},phase=(r,v)=>{if(r.phase!==v)fail('Cette étape est terminée.')},fresh=(r,d)=>{if(r.revision!==d.revision)fail('L’étape a changé.')};
 const make=name=>({id:id(),token:id(),name:clean(name,20)||'Joueur',sockets:new Set()});
 function attach(r,p){if(s.data.rankingCode)detach(s);s.data.rankingCode=r.code;s.data.rankingId=p.id;p.sockets.add(s.id);if(!r.players.some(x=>x.id===r.host&&online(x)))r.host=p.id;emit(r);return{code:r.code,token:p.token}}
 on('create',d=>{if(rooms.size>=200)fail('Serveur complet.');const p=make(d.name);let code;do{code='W'+randomBytes(3).toString('hex').slice(0,4).toUpperCase()}while(rooms.has(code));const r={code,host:p.id,players:[p],phase:'lobby',revision:0,size:50,index:0,turnIndex:0,deck:[],board:[],swaps:0,history:[],touched:Date.now()};rooms.set(code,r);return attach(r,p)});
 on('join',d=>{const r=rooms.get(clean(d.code,5).toUpperCase());if(!r)fail('Salon introuvable.');const p=r.players.find(x=>x.token===d.token);if(p)return attach(r,p);phase(r,'lobby');if(r.players.length>=12)fail('Salon complet.');const x=make(d.name);r.players.push(x);return attach(r,x)});

 const actor=(r,p)=>{if(turn(r)!==p.id)fail('C’est le tour d’un autre joueur.')};
 on('settings',d=>{const[r,p]=member();host(r,p);phase(r,'lobby');if(![10,25,50].includes(d.size))fail('Taille invalide.');r.size=d.size;emit(r)});
 on('start',()=>{const[r,p]=member();host(r,p);phase(r,'lobby');if(r.players.some(x=>!online(x)))fail('Tous les joueurs doivent être connectés.');r.deck=shuffle(bank.characters).slice(0,r.size);r.board=Array(r.size).fill(null);r.index=0;r.turnIndex=0;r.swaps=0;r.history=[];r.phase='draw';r.revision++;emit(r)});
 on('draw',d=>{const[r,p]=member();actor(r,p);phase(r,'draw');fresh(r,d);r.phase='place';r.revision++;emit(r)});
 on('place',d=>{const[r,p]=member();actor(r,p);phase(r,'place');fresh(r,d);if(!Number.isInteger(d.slot)||d.slot<0||d.slot>=r.size||r.board[d.slot])fail('Choisis une place libre.');const c=r.deck[r.index];r.board[d.slot]=c;r.history.push({type:'place',player:p.id,name:c.name,slot:d.slot+1});r.index++;r.turnIndex++;r.phase=r.index===r.size?'swap':'draw';r.revision++;emit(r)});
 on('swap',d=>{const[r,p]=member();actor(r,p);phase(r,'swap');fresh(r,d);if(![d.a,d.b].every(n=>Number.isInteger(n)&&n>=0&&n<r.size)||d.a===d.b||r.swaps>=5)fail('Choisis deux places différentes.');r.history.push({type:'swap',player:p.id,a:d.a+1,b:d.b+1});[r.board[d.a],r.board[d.b]]=[r.board[d.b],r.board[d.a]];r.swaps++;r.turnIndex++;if(r.swaps===5)r.phase='finished';r.revision++;emit(r)});
 on('finish',d=>{const[r,p]=member();host(r,p);phase(r,'swap');fresh(r,d);r.phase='finished';r.revision++;emit(r)});
 on('skipAbsent',d=>{const[r,p]=member();host(r,p);fresh(r,d);if(!['draw','place','swap'].includes(r.phase))fail('Action indisponible.');if(online(r.players.find(p=>p.id===turn(r))))fail('Le joueur est connecté.');const next=r.players.map((_,i)=>(r.turnIndex+i+1)%r.players.length).find(i=>online(r.players[i]));if(next===undefined)fail('Personne n’est connecté.');r.turnIndex=next;r.revision++;emit(r)});
 on('restart',()=>{const[r,p]=member();host(r,p);phase(r,'finished');r.phase='lobby';r.deck=[];r.board=[];r.history=[];r.index=0;r.turnIndex=0;r.swaps=0;r.revision++;emit(r)});
 on('remove',d=>{const[r,p]=member();host(r,p);phase(r,'lobby');const target=r.players.find(x=>x.id===d.target);if(!target||online(target)||target===p)fail('Seul un absent peut être retiré.');r.players=r.players.filter(x=>x!==target);emit(r)});
 on('leave',()=>{const[r,p]=member();detach(s);if(r.phase==='lobby'&&!online(p)){r.players=r.players.filter(x=>x!==p);emit(r)}});s.on('disconnect',()=>detach(s));
 });const timer=setInterval(()=>{for(const[code,r]of rooms)if(!r.players.some(online)&&Date.now()-r.touched>3600000)rooms.delete(code)},60000);timer.unref();return{rooms,close:()=>clearInterval(timer)};
}
