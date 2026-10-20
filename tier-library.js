export const listInfo={
 arcs:{title:'Les meilleurs premiers arcs',mode:'tier',description:'Premiers arcs dans l’ordre de publication. Exceptions demandées : East Blue, Zabuza et Soul Society. Les ouvertures sans arc clairement nommé sont identifiées comme telles.'},
 endings:{title:'Les pires fins de manga / anime',mode:'duel',description:'À chaque duel, garde la pire fin selon toi. Une seule carte par œuvre, manga et anime regroupés. À vous de décider lesquelles ont les pires fins, sans résumé qui dévoile l’intrigue.'}
};
export const storageFor=list=>(list==='endings'?'arcade-tier-duel-v3-':'arcade-tier-duel-v2-')+list;
export function buildLibraries(arcs,endings){const byId=new Map(arcs.map(x=>[x.id,x]));return {arcs,endings:endings.map(x=>{const cover=byId.get(x.coverId);if(!x.image&&!cover?.image)throw Error('Couverture manquante');return {...x,image:x.image||cover.image};})};}
