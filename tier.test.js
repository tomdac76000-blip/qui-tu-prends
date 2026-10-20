import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newBoard,moveCard,newDuel,choose} from './tier-engine.js';
const cards=JSON.parse(readFileSync(new URL('./tier-catalog.json',import.meta.url)));
test('tier: déplacer, réordonner et remettre en réserve sans perdre de carte',()=>{
 let b=newBoard(cards);const [a,c]=cards.map(x=>x.id);b=moveCard(b,a,'S');b=moveCard(b,c,'S',a);assert.deepEqual(b.S,[c,a]);assert.deepEqual(moveCard(b,a,'S',a),b);b=moveCard(b,a,'pool');assert.equal(b.S.length,1);assert.equal(new Set(Object.values(b).flat()).size,64);assert.equal(Object.values(b).flat().length,64);assert.deepEqual(moveCard(b,'absent','S'),b);
});
for(const size of [16,32,64])test(`duel ${size}: exactement ${size-1} matchs, aucun éliminé ne revient, reprise JSON`,()=>{
 let d=newDuel(cards.map(x=>x.id),size);const played=new Set(),eliminated=new Set();while(!d.winner){const [a,b]=d.round.slice(d.index,d.index+2);assert.ok(!eliminated.has(a)&&!eliminated.has(b));assert.ok(!played.has([a,b].sort().join('|')));played.add([a,b].sort().join('|'));eliminated.add(b);d=choose(JSON.parse(JSON.stringify(d)),a);}assert.equal(d.history.length,size-1);assert.equal(eliminated.size,size-1);assert.ok(!eliminated.has(d.winner));assert.throws(()=>choose(d,d.winner));
});
test('duel: refus des tailles impossibles et des choix hors duel',()=>{assert.throws(()=>newDuel(cards.map(x=>x.id),128));assert.throws(()=>newDuel(['a'],16));const d=newDuel(cards.map(x=>x.id),16);assert.throws(()=>choose(d,'missing'));assert.equal(d.history.length,0);});
test('catalogue: 64 images et les trois repères demandés',()=>{assert.equal(cards.length,64);assert.equal(new Set(cards.map(x=>x.id)).size,64);for(const c of cards){assert.ok(c.arc?.length);assert.ok(Buffer.from(c.image.split(',')[1],'base64').length>1000);}assert.equal(cards.find(x=>x.name==='One Piece').arc,'East Blue');assert.equal(cards.find(x=>x.name==='Naruto').arc,'Zabuza / Pays des Vagues');assert.equal(cards.find(x=>x.name==='Bleach').arc,'Soul Society');assert.equal(cards.find(x=>x.name==='Yu-Gi-Oh!').source,'https://anilist.co/manga/30054');assert.equal(cards.find(x=>x.name==='Kuroko’s Basket').source,'https://anilist.co/manga/41652');});
