/* Small, finite animations shared by every game. No sound or network dependency. */
(()=>{
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 let lastKey=null,lastCode=null,lastRoll=null,lastMotion=null;
 function play(node,frames,options={}){if(!node||reduced()||typeof node.animate!=='function')return;return node.animate(frames,{duration:360,easing:'cubic-bezier(.2,.8,.2,1)',...options});}
 function burst(container){const layer=document.createElement('div');layer.className='pixel-celebration';layer.setAttribute('aria-hidden','true');const colors=['#d8ff74','#87ddff','#f6acdc','#ffdc83'];for(let i=0;i<22;i++){const bit=document.createElement('i');bit.style.background=colors[i%4];bit.style.left=(8+i*4)%96+'%';bit.style.setProperty('--drift',((i%7)-3)*24+'px');bit.style.animationDelay=(i%5)*50+'ms';layer.append(bit);}container.prepend(layer);setTimeout(()=>layer.remove(),1800);}
 function scene(root,o){const newScene=o.key!==lastKey,known=lastCode===o.code,motion=o.motion,oldMotion=lastMotion,oldRoll=lastRoll;lastKey=o.key;lastCode=o.code;lastMotion=motion?.id;lastRoll=o.rollId;if(reduced())return;
  if(known&&motion&&motion.id!==oldMotion){const pawn=root.querySelector(`[data-pawn="${motion.player}"]`),end=o.board?.find(n=>n.id===motion.path.at(-1));if(pawn&&end){const dx=Number(pawn.dataset.x)-end.x,dy=Number(pawn.dataset.y)-end.y;const frames=motion.path.map(id=>o.board.find(n=>n.id===id)).filter(Boolean).map(n=>({transform:`translate(${n.x+dx}px,${n.y+dy}px)`}));if(frames.length>1)play(pawn,frames,{duration:Math.min(1100,frames.length*140),easing:'linear'});}}
  if(known&&o.phase==='move'&&o.rollId!==oldRoll)play(root.querySelector('[data-die]'),[{transform:'rotate(-18deg) scale(.8)'},{transform:'rotate(150deg) translateY(-12px) scale(1.12)',offset:.35},{transform:'rotate(310deg) translateY(-5px)',offset:.75},{transform:'rotate(360deg) scale(1)'}],{duration:700,easing:'cubic-bezier(.2,.7,.3,1)'});
  if(!newScene)return;
  const reveal=['result','results','guess','finished'].includes(o.phase);
  const cards=reveal?root.querySelectorAll('.answer-solution,.results .result,.yesno-tally,.tier-row,.game-results>div,.clue-chip,.clue-display,.answer-players .player'):root.querySelectorAll('.question,.turn-panel h3,.duel-card,.yesno-button,.tier-pool');
  cards.forEach((el,i)=>play(el,[{opacity:0,transform:reveal?'translateY(16px) scale(.94)':'translateY(10px)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:reveal?480:320,delay:Math.min(i*55,350),fill:'backwards'}));
  if(reveal){root.querySelectorAll('.bar div').forEach(el=>play(el,[{transform:'scaleX(0)',transformOrigin:'left'},{transform:'scaleX(1)',transformOrigin:'left'}],{duration:650,easing:'cubic-bezier(.2,.8,.2,1)'}));play(root.querySelector('.axis-marker'),[{opacity:0,transform:'translateX(-50%) scaleY(0)'},{opacity:1,transform:'translateX(-50%) scaleY(1)'}],{duration:650});}
  if(o.phase==='finished'){burst(root);play(root.querySelector('.podium-icon,.arcade-emblem'),[{transform:'scale(.4) rotate(-15deg)'},{transform:'scale(1.2) rotate(7deg)',offset:.65},{transform:'scale(1) rotate(0)'}],{duration:700});}
 }
 document.addEventListener('click',e=>{const button=e.target.closest?.('button');if(button&&!button.disabled)play(button,[{scale:1},{scale:.95,offset:.4},{scale:1}],{duration:180});});
 window.ArcadeFX={scene};
})();
