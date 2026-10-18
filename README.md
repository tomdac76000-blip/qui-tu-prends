# QUI TU PRENDS ?

Jeu de votes entre 3 et 12 amis, sans compte, compatible téléphone et ordinateur.

**Jouer : https://qui-tu-prends.onrender.com**

Crée un salon, partage son lien, choisis 1 ou 2 amis par vote et lance la partie.

## Fonctionnalités

- 450 questions réécrites : 320 votes directs entre potes, 80 Oui/Non personnels et 50 tier lists, sans thèmes ; modes Normal et Trash.
- Choix du format dans le salon : Potes, Perso, Tier list, ou Mélange des trois.
- Oui/Non : chacun répond pour soi, puis les totaux et les réponses nominatives sont révélés. Les absences restent distinctes des réponses Non.
- Tier list : classe tous les participants, toi compris, de S à D ; plusieurs personnes peuvent partager un rang. Touche un joueur puis un rang, et valide lorsque tout le monde est placé. 60 secondes par manche.
- Révélation des tier lists : moyenne du groupe ou détail de chaque liste validée. S = 4, A = 3, B = 2, C = 1, D = 0 ; moyenne arrondie au plus proche, demi-point vers le rang supérieur. Les listes non validées ne comptent pas.
- 10, 15 ou 20 manches sans répétition ; si le format choisi ne fournit pas assez de questions, le salon l’indique avant de démarrer.
- Questions privées de l’hôte, conservées dans son navigateur, utilisables seules ou mélangées.
- Votes validés côté serveur, secrets jusqu’à la révélation ; 30 secondes pour Potes/Perso, 60 secondes pour les tier lists.
- Révélation automatique, passage de question, classement, reconnexion et reprise du rôle d’hôte absent.
- Aucun appel à une IA pendant les parties, aucune base de données.

## Lancer et vérifier

Node.js 20 ou plus : `npm ci`, puis `npm start`. Ouvrir http://localhost:3000.
`npm test` lance les vérifications multijoueurs. La route `/health` répond `{"ok":true}`.

## Déploiement

Render : service web Node, branche `main`, build `npm ci`, démarrage `npm start`, contrôle de santé `/health`, offre Free. La variable `PORT` est fournie par Render. Déploiement automatique à chaque mise à jour de `main`.

Les salons sont en mémoire : un redémarrage ou déploiement peut interrompre les parties. L’hôte peut recréer un salon. L’offre gratuite peut s’endormir ; son premier réveil peut prendre environ une minute. Les questions personnalisées restent dans le stockage local du navigateur de l’hôte, et dans la mémoire du salon pendant son existence.

Les pourcentages des votes entre potes représentent la part des choix exprimés, pas la part des joueurs. Pour le Oui/Non, ils portent sur les réponses exprimées. Les scores entre potes sont le nombre de fois où chaque personne a été sélectionnée. Les modes Perso et Tier list ont leur propre bilan et n’ajoutent pas de points à ce classement. Passer une question ne distribue pas de points. Les dossiers privés peuvent utiliser chacun des trois formats.

Interface édition arcade : cadres pixel, sprites CSS, titres rétro et prise en charge des préférences de mouvement réduit.

## Salle d’arcade

Menu commun : `/` (Qui tu prends ?), `/trivial`, `/note`, `/piege`, `/curseur`.
Les nouveaux jeux utilisent le canal Socket.IO `/arcade`, des salons et des jetons distincts. Chaque page crée son propre salon ; partager son lien invite au bon jeu. Une partie ne migre pas automatiquement vers une autre borne.

### Trivial des potes

2 à 6 joueurs. Plateau original de 73 cases, six branches, douze cases relance, six cases camembert. Dé serveur de 1 à 6 ; déplacement exact sans repasser sur une case. Premier joueur déterminé par un lancer initial automatique, égalités départagées. Bonne réponse : rejouer ; mauvaise réponse : joueur suivant connecté. Six camemberts puis arrivée exacte au centre, catégorie choisie par le joueur suivant, question finale. En cas d’échec il faut quitter le centre avant de revenir.

Six thèmes distincts à choisir parmi quinze. Banque de 600 questions, 40 par thème. Cases normales : niveaux 3 ou 4, avec 85 % de tirages du niveau 4 tant que les deux niveaux sont disponibles. Cases camembert et finale : niveau 5 uniquement. Ces niveaux sont des repères éditoriaux, sans calibration statistique. Toute question tirée, même passée, est retirée pour la partie entière. Si un paquet est épuisé, le joueur relance pour viser une autre case : aucune carte ne revient. Un retour au salon après la fin remet les paquets à zéro. Les résultats esport sont datés ; séries et mangas peuvent contenir des spoilers.

Réponse libre par défaut : la solution est envoyée uniquement au lecteur (adversaire suivant) après la proposition. Il valide les synonymes ou fautes de frappe. QCM optionnel à quatre choix, ordre mélangé et correction serveur. Pas de minuterie. L’hôte peut passer un tour bloqué ; les joueurs absents sont conservés pour la reconnexion. Reprise du rôle d’hôte disponible si l’hôte se déconnecte.

### Autres jeux

- La Note secrète : 3 à 12 joueurs. Une note commune de 1 à 10, cachée au solo. Il pose une seule question à chaque autre joueur, chacun donne une seule réponse adaptée à la note. Une proposition finale après toutes les réponses ; un point si elle est exacte. Le rôle solo tourne. Questions et réponses visibles dans le salon, chiffre jamais envoyé au solo avant le résultat. Reconnexion et passage par l’hôte si un joueur est absent.
- Piège des potes : 80 mots, indices en un mot. Les doublons exacts après normalisation des accents/casse sont retirés ; les synonymes ne sont pas détectés automatiquement. Le devineur ne reçoit jamais le mot avant le résultat. Réponse comparée sans accents/casse/ponctuation ; un point collectif par mot trouvé.
- Curseur : 24 axes, cible secrète de 0 à 100 pour le donneur, estimation individuelle. Barème d’écart : ≤5 = 4 points ; ≤10 = 3 ; ≤20 = 2 ; ≤30 = 1. Donneur : moyenne arrondie des points gagnés. Estimations cachées avant révélation.

Les parties se jouent en discutant en personne ou sur un appel existant ; aucun audio intégré. 5, 10 ou 15 manches pour ces trois jeux. L’hôte peut passer une manche ; la révélation anticipée est disponible pour Piège et Curseur. Fin de partie puis retour au salon avec remise à zéro.

Validation : `npm test` couvre règles de plateau, catalogue, confidentialité, droits, camemberts/finale, correction QCM/libre, reconnexion, doublons d’indices, scores et rotation, ainsi que le jeu d’origine.

Pions circulaires avec six logements de camemberts, déplacement animé sur le trajet serveur, dé à points animé. Animations de cartes, résultats et fin de partie sur tous les jeux ; respect de prefers-reduced-motion.

### Table en relief (17 octobre)
Plateau dessiné en perspective avec bord épais, cases extrudées et pions debout ombrés (rendu SVG 2,5D). Cases espacées. Dé animé, sauts case par case et entrée de la carte question. 18 tests couvrent les règles, la confidentialité, la rotation, les paquets épuisés et la suppression du Duel.

## Mode test solo
Sur chacune des cinq pages, « Tester seul avec 2 bots » crée un salon isolé avec Pixel et Nova. Pas de pseudo obligatoire. Les deux joueurs simulés votent, donnent des exemples préécrits et jouent leur tour automatiquement via les mêmes règles serveur. Le test reste distinct des salons entre amis ; aucune IA ne produit les réponses. Le créateur garde le contrôle du lancement et des manches suivantes.

Au Trivial, le joueur humain commence en QCM par défaut et dispose des raccourcis « Tester une case ★ » et « Tester la finale ». Ces raccourcis sont refusés par le serveur dans une partie normale. En réponse libre, un bot lecteur accepte uniquement la correspondance normalisée avec la solution. Dans La Note secrète, les réponses préécrites couvrent films, plats et jeux vidéo ; les autres questions reçoivent une appréciation générique signalée comme simulée. La reconnexion réutilise les deux mêmes bots et les quitter ferme leurs connexions.

24 tests couvrent désormais aussi le mode solo des cinq jeux, l'isolation de ses salons, la reconnexion et les raccourcis.

## Skyjo Action — adaptation maison

Page `/skyjo`, entrée dans le menu commun, namespace Socket.IO `/skyjo` séparé.
2 à 8 joueurs, salons privés, reconnexion par jeton et mode solo avec deux bots.
12 cartes par joueur, 120 cartes de jeu (dont 15 étoiles), 27 cartes Action / 9 effets.
Limite de partie 50, 100 (par défaut) ou 150 points. Derniers tours, malus du
finisseur, bonus étoiles et historique des manches calculés côté serveur.

Les cartes cachées, pioches et observations privées sont filtrées avant envoi.
Chaque commande inclut une version et est appliquée sur une copie : une action
invalide ne modifie pas la partie. Les bots utilisent exclusivement les vues
filtrées, jamais les cartes secrètes. Les joueurs absents peuvent se reconnecter ;
une partie attend le joueur dont c'est le tour. L'hôte absent peut être remplacé.

Automatisations indiquées dans l'aide : colonnes avant lignes, étoiles utilisées
automatiquement pour les lignes chiffrées, lignes d'étoiles conservées et bonus
optimal sans double comptage. Défausse des lignes dans l'ordre des cases.
Météorites cible uniquement les grilles. Seconde chance ne reprend pas une autre
Seconde chance. Graphismes et explications originaux, adaptation non officielle.
Référence : https://cdn.shopify.com/s/files/1/0019/1696/0881/files/SKYJO_ACTION.pdf?v=1739260284

Validation : 34 tests, dont règles Skyjo, secrets, attaques/défense, scores,
15 parties autonomes complètes et connexion/reconnexion réelle à trois joueurs.

## Quiz Mix — /quiz

Quiz simultané de 2 à 12 joueurs, avec test solo et deux participants simulés. 525 questions réparties entre cinq univers, dont 392 issues du catalogue Trivial et 133 entrées propres au quiz. Huit formats : classique, indices progressifs, lien commun, ordre, liste, estimation, double réponse et réponse rare. Choix de 10, 20 ou 30 questions, correction commune toutes les cinq questions, rectification des scores par l’hôte.

Aucun bonus de rapidité ni départage au temps. Les bonnes réponses aux indices progressifs valent toujours deux points, quel que soit le nombre d’indices affichés. Le chrono limite uniquement la durée de la manche. Les ex aequo partagent la victoire. Les réponses et solutions restent côté serveur jusqu’à la correction. Aucun doublon dans une partie ; priorité aux questions absentes de l’historique local de l’hôte.

Les épreuves de reconnaissance de lieux sur images ne sont pas incluses dans cette version. Les réponses textuelles utilisent une normalisation et des alias prévus, avec correction manuelle possible. Les salons restent en mémoire et disparaissent au redémarrage du serveur.
