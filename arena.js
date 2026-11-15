const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const atmosphere=document.createElement('div');
atmosphere.className='rk-atmosphere';atmosphere.setAttribute('aria-hidden','true');
atmosphere.innerHTML=Array.from({length:18},(_,i)=>`<i style="--x:${i*6}%;--speed:${7+i%5}s;--delay:-${i}s"></i>`).join('');
document.body.prepend(atmosphere);
let toastTimer;
export function arenaHome(){document.body.classList.remove('rk-in-game','rk-menu-open');document.querySelector('.rk-theatre')?.remove();document.querySelector('.arena-toast')?.remove();}
export function arenaRender(state,title){
 document.body.classList.toggle('rk-in-game',state.phase!=='lobby');
 document.body.classList.toggle('arena-master',state.master===state.me);
 const identities=document.querySelector('.arena-identities');if(identities){identities.open=true;document.querySelector('.uc-game')?.append(identities);}
 const room=document.querySelector('.uc-room');
 if(room){const menu=document.createElement('button');menu.className='ghost';menu.textContent='☰ Jeux';menu.setAttribute('aria-expanded',String(document.body.classList.contains('rk-menu-open')));menu.onclick=()=>{document.body.classList.toggle('rk-menu-open');menu.setAttribute('aria-expanded',String(document.body.classList.contains('rk-menu-open')));};const label=document.createElement('span');label.className='arena-title';label.textContent=title;room.prepend(menu,label);}
 document.querySelectorAll('.mc-roster').forEach(el=>{for(let i=el.children.length;i<5;i++){const slot=document.createElement('figure');slot.className='arena-empty';slot.textContent=String(i+1).padStart(2,'0');slot.setAttribute('aria-label','Place libre');el.append(slot);}});
 document.querySelectorAll('.uc-players>span').forEach((el,i)=>el.classList.toggle('arena-active',state.players[i]?.id===state.turn));
 if(!reduced())document.querySelectorAll('.uc-portrait:not(.mc-hidden)').forEach(card=>{card.onpointermove=e=>{const r=card.getBoundingClientRect();card.style.setProperty('--tilt-x',((e.clientX-r.left)/r.width-.5)*8+'deg');card.style.setProperty('--tilt-y',-((e.clientY-r.top)/r.height-.5)*6+'deg');};card.onpointerleave=()=>{card.style.setProperty('--tilt-x','0deg');card.style.setProperty('--tilt-y','0deg');};});
}
export function arenaToast(text){
 clearTimeout(toastTimer);document.querySelector('.arena-toast')?.remove();
 const el=document.createElement('div');el.className='arena-toast';el.setAttribute('role','status');el.textContent=text;document.body.append(el);toastTimer=setTimeout(()=>el.remove(),4200);
}
export function arenaReveal(source,caption,title,subtitle){
 if(!source||source.classList.contains('mc-hidden'))return;
 document.querySelector('.rk-theatre')?.remove();
 const focus=document.activeElement,d=document.createElement('dialog');d.className='rk-theatre';d.setAttribute('aria-label',caption);
 const orbit=document.createElement('div');orbit.className='rk-orbit';orbit.setAttribute('aria-hidden','true');d.append(orbit);
 const add=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;el.textContent=text;d.append(el);return el;};
 add('p','rk-announcement',caption);const card=add('div','rk-hero-card','');card.append(source.cloneNode(true));
 add('h2','rk-hero-title',title);add('p','rk-hero-universe',subtitle||'');
 const close=()=>{d.close();d.remove();window.scrollTo({top:0,behavior:'instant'});if(focus?.isConnected)focus.focus({preventScroll:true});};
 add('button','primary','Continuer →').onclick=close;add('button','rk-exit','Fermer ✕').onclick=close;
 d.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(d);d.showModal();
}
export function arenaTransition(previous,next,game){
 if(!previous||previous.code!==next.code||previous.revision===next.revision)return;
 document.querySelector('.rk-theatre')?.remove();
 if(previous.phase==='lobby'&&next.phase!=='lobby')window.scrollTo({top:0,behavior:'instant'});
 if(game==='mercato'){
  if(next.phase==='result'&&previous.phase!=='result'){
   arenaReveal(document.querySelector('.mc-auction>.uc-portrait'),'CARTE RÉVÉLÉE',next.current?.name||'',next.result.team===null?'Personnage écarté':`${next.result.team===0?'Équipe bleue':'Équipe rose'} · ${next.result.price} crédits`);
   document.querySelectorAll('.mc-roster figure:not(.arena-empty):last-of-type').forEach(el=>el.classList.add('arena-awarded'));
  }else if(next.phase==='auction'&&previous.round!==next.round){document.querySelector('.mc-auction>.uc-portrait')?.classList.add('arena-card-enter');}
  if(next.bid!==previous.bid&&next.phase==='auction')document.querySelector('.mc-auction>div:last-child>h2')?.classList.add('arena-money-pulse');
 }else if(next.history.length>previous.history.length){
  const changed=next.players.filter(p=>p.score>(previous.players.find(x=>x.id===p.id)?.score??p.score));
  if(changed.length){arenaToast(changed.map(p=>`${p.name} +${p.score-previous.players.find(x=>x.id===p.id).score}`).join('  ·  '));document.querySelectorAll('.uc-players>span').forEach((el,i)=>{if(changed.some(p=>p.id===next.players[i]?.id))el.classList.add('arena-awarded');});}
 }
 if(next.phase==='finished'&&previous.phase!=='finished')document.querySelector('.uc-result')?.classList.add('arena-awarded');
}
