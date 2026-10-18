/* Simulation locale explicite : ces clients utilisent les mêmes règles serveur que les joueurs. */
(function(scope){
 const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const wordClues={};
 const clueRows=`Pikachu|Électricité|Jaune
Mario|Plombier|Moustache
Naruto|Ramen|Hokage
Luffy|Élastique|Chapeau
Shrek|Ogre|Marais
Batman|Gotham|Chauve-souris
Gandalf|Bâton|Balrog
Sonic|Hérisson|Vitesse
Zelda|Hyrule|Princesse
Kirby|Rose|Aspiration
Teemo|Champignon|Sarbacane
Jinx|Roquette|Zaun
Spider-Man|Toile|Araignée
Yoda|Jedi|Vert
Goku|Saiyan|Kamehameha
Bowser|Carapace|Peach
Minecraft|Cubes|Creeper
Tetris|Blocs|Lignes
Pokémon|Capture|Dresseur
Titanic|Iceberg|Paquebot
Avatar|Pandora|Bleu
Matrix|Pilule|Simulation
Dragon|Écailles|Flammes
Pirate|Trésor|Sabre
Ninja|Shuriken|Furtif
Zombie|Mort-vivant|Cerveau
Vampire|Sang|Crocs
Robot|Métal|Automate
Fantôme|Drap|Hanté
Licorne|Corne|Magique
Kebab|Broche|Döner
Pizza|Mozzarella|Naples
Sushi|Riz|Poisson
Chocolat|Cacao|Tablette
Raclette|Fondu|Charcuterie
Croissant|Feuilleté|Viennoiserie
Fromage|Lait|Affinage
Banane|Jaune|Épluchure
Popcorn|Maïs|Cinéma
Pancake|Sirop|Érable
Clavier|Touches|AZERTY
Casque|Écouteurs|Audio
Manette|Joystick|Console
Télécommande|Zapper|Infrarouge
Ascenseur|Étage|Cabine
Parapluie|Pluie|Baleines
Valise|Bagages|Voyage
Horloge|Aiguilles|Cadran
Miroir|Reflet|Glace
Bougie|Mèche|Cire
Volcan|Lave|Cratère
Banquise|Glace|Polaire
Désert|Dunes|Sable
Cascade|Chute|Eau
Planète|Orbite|Terre
Comète|Queue|Halley
Orage|Tonnerre|Éclair
Éclipse|Alignement|Soleil
Océan|Vagues|Marée
Forêt|Arbres|Sous-bois
Bibliothèque|Livres|Silence
Cinéma|Écran|Projection
Musée|Œuvres|Exposition
Piscine|Chlore|Nage
Stade|Tribunes|Match
Hôpital|Soins|Urgences
Château|Donjon|Remparts
Phare|Balise|Maritime
Métro|Rames|Souterrain
Cirque|Chapiteau|Acrobate
Magicien|Illusion|Baguette
Astronaute|Fusée|Scaphandre
Détective|Enquête|Loupe
Pompier|Incendie|Lance
Boulanger|Pain|Pétrin
Dentiste|Carie|Fraise
Cowboy|Lasso|Western
Professeur|Cours|Élèves
Chevalier|Armure|Joute
Samouraï|Katana|Bushido`;
 clueRows.split('\n').forEach(line=>{const[w,...clues]=line.split('|');wordClues[normalize(w)]=clues;});
 const axes=[['Un figurant sans dialogue','Un combattant entraîné','Saitama'],['Une balade dans Animal Crossing','Une partie de Mario Kart','Une finale de tournoi entre potes'],['Du pain sec','Un bon burger','Un menu gastronomique'],['Une bouteille d’eau','Une lampe de bureau','Un caillou connecté'],['Un voleur affamé','Un antagoniste vengeur','Un bourreau sans remords'],['Changer la couleur de ses chaussettes','Courir très vite','Arrêter le temps'],['Pierre-feuille-ciseaux','Les échecs en amateur','Le piano de concert'],['Une comédie romantique','Un thriller policier','Primer'],['Un hamac au bord de la mer','Visiter Rome à pied','Gravir l’Everest'],['Un chaton endormi','Un gros chien inconnu','Un crocodile affamé'],['Garder une maison vide','Serveur un samedi soir','Démineur'],['Des chaussettes trouées','Une bonne boîte de chocolats','Le voyage dont je rêve'],['Un espion silencieux','Spider-Man en combat','Un héros qui hurle toutes ses attaques'],['Quelqu’un qui range tout','Quelqu’un qui oublie parfois la vaisselle','Quelqu’un qui détruit l’appartement'],['La téléportation à volonté','Lire toutes les pensées alentour','Grandir sans pouvoir s’arrêter'],['Un soigneur bénévole','Un mercenaire','Un tyran sadique'],['Perdre contre le champion du monde','Perdre un match serré','Perdre contre un débutant en étant arrogant'],['Mon train est annulé','J’ai confondu les horaires','Un dragon a mangé mon réveil'],['Un carré de chocolat','Une soirée au restaurant','Une île privée'],['Une pépite inconnue','Un classique apprécié','Un objet banal vendu mille fois son prix'],['Un carré','Un portrait simple','Une foule en perspective'],['Une chaussette immobile','Une guêpe près du visage','Un incendie dans la pièce'],['Prendre un parapluie sous la pluie','Partir sans vérifier la météo','Conduire les yeux fermés'],['Un coucher de soleil entre amis','Une blague qui tombe à plat','Un discours avec la braguette ouverte']];
 const examples={film:['Un film illisible et inaudible','Un nanar très mal joué','Une comédie qui ne me fait jamais rire','Un film long et prévisible','Un film moyen pour passer le temps','Une bonne comédie du dimanche','Un très bon film d’aventure','Un film que je recommande à mes amis','Un de mes films préférés','Mon film préféré de tous les temps'],plat:['Un plat brûlé et immangeable','Des pâtes froides sans sauce','Un sandwich détrempé','Un plat trop salé','Un sandwich correct','Une bonne omelette','Un burger bien préparé','Des lasagnes maison réussies','Mon plat favori cuisiné parfaitement','Le meilleur repas de ma vie'],jeu:['Un jeu injouable qui plante au lancement','Un jeu cassé et répétitif','Un jeu mal équilibré sans plaisir','Un jeu vite oublié','Un jeu moyen pour une soirée','Un jeu sympa avec quelques défauts','Un jeu auquel je reviens régulièrement','Un jeu que je conseille à tous mes potes','Un jeu qui fait partie de mes favoris','Mon jeu préféré de tous les temps']};
 function noteReply(question,value){const text=normalize(question),topic=/film|serie|cinema/.test(text)?'film':/plat|repas|manger|nourriture/.test(text)?'plat':/jeu|gaming/.test(text)?'jeu':null;return topic?examples[topic][value-1]:['Très mauvais à mon goût','Plutôt mauvais à mon goût','Moyen à mon goût','Très bon à mon goût','Excellent à mon goût'][Math.min(4,Math.floor((value-1)/2))]+' (réponse simulée)';}
 function action(s,index){const me=s.me,active=s.active===me;
  if(!s.game){if(s.phase!=='voting'||s.myVote||!s.eligible.includes(me))return;const type=s.question?.type;return ['vote',{round:s.round,...(type==='yesno'?{answer:index%2?'no':'yes'}:type==='tier'?{ranking:Object.fromEntries(s.eligible.map((id,i)=>[id,['B','A','S','C','D'][(i+index)%5]]))}:{picks:s.eligible.filter(id=>id!==me).slice(index?s.settings.picks*-1:0,index?undefined:s.settings.picks)})}];}
  if(s.game==='trivial'){
   if(s.phase==='category'&&s.chooseBy===me)return ['category',{cat:index}];
   if(s.phase==='judge'&&s.judge===me)return ['judge',{correct:normalize(s.submitted)===normalize(s.question.answer)}];
   if(!active)return;
   if(s.phase==='roll')return ['roll',{}];
   if(s.phase==='move')return ['move',{id:s.legal[index%s.legal.length]}];
   if(s.phase==='question')return ['answer',{id:s.question.id,answer:s.question.options?.[index%4]||'Je ne sais pas'}];
  }
  if(s.game==='note'){
   if(s.phase==='interview'&&active){const id=s.noteTurns.find(id=>!s.noteQuestions[id]);if(id)return ['ask',{round:s.round,player:id,text:'Donne-moi un plat qui correspond à cette note.'}];}
   if(s.phase==='interview'&&s.noteQuestions[me]&&!s.noteAnswers[me])return ['reply',{round:s.round,text:noteReply(s.noteQuestions[me],s.secretNote)}];
   if(s.phase==='noteGuess'&&active)return ['note-guess',{round:s.round,value:5+index}];
  }
  if(s.game==='piege'){
   if(s.phase==='clues'&&!active&&!s.myEntry)return ['entry',{value:wordClues[normalize(s.word)]?.[index]||['Mystère','Surprise'][index]}];
   if(s.phase==='guess'&&active){const hints=s.clues?.map(c=>normalize(c.text)).filter(Boolean)||[];const match=Object.entries(wordClues).find(([,clues])=>hints.some(h=>clues.some(c=>normalize(c)===h)));return ['guess',{text:match?.[0]||'Mystère'}];}
  }
  if(s.game==='curseur'){
   if(s.phase==='clue'&&active)return ['clue',{text:axes[Number(s.card.id.split('-')[1])]?.[s.target<34?0:s.target<67?1:2]||'Un exemple simulé'}];
   if(s.phase==='estimate'&&!active&&s.myEntry===null)return ['entry',{value:[35,70][index]}];
  }
 }
 let sockets=[],room='',timers=new Set();
 function stop(){for(const timer of timers)clearTimeout(timer);timers.clear();sockets.forEach(s=>s.disconnect());sockets=[];room='';}
 function start(session,game=''){if(!session?.testKey)return stop();const key=game+'|'+session.code;if(room===key)return;stop();room=key;
  for(let index=0;index<2;index++){const bot=io(game?'/arcade':'/',{forceNew:true});sockets.push(bot);let pendingTimer=null,last=null,done=new Set();
   bot.on('connect',()=>{done.clear();bot.emit('join',{game,code:session.code,testKey:session.testKey,botIndex:index},r=>{if(!r?.ok)bot.disconnect();});});
   bot.on('state',s=>{last=s;if(s.phase==='lobby')done.clear();if(pendingTimer){clearTimeout(pendingTimer);timers.delete(pendingTimer);}const next=action(s,index);if(!next)return;const k=[s.phase,s.round,s.usedCount,s.rollId,s.active,JSON.stringify(next)].join('|');if(done.has(k))return;pendingTimer=setTimeout(()=>{timers.delete(pendingTimer);pendingTimer=null;if(last!==s)return;done.add(k);bot.emit(...next,r=>{if(!r?.ok)done.delete(k);});},650+index*250);timers.add(pendingTimer);});
  }
 }
 scope.TestMode={start,stop,action,noteReply};
})(typeof window==='undefined'?globalThis:window);
