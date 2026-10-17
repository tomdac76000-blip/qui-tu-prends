# QUI TU PRENDS ?

Jeu de votes entre 3 et 12 amis, sans compte, compatible téléphone et ordinateur.

**Jouer : https://qui-tu-prends.onrender.com**

Crée un salon, partage son lien, choisis 1 ou 2 amis par vote et lance la partie.

## Fonctionnalités

- 600 questions locales : 400 votes entre potes dans 10 catégories, 110 Oui/Non personnels et 90 tier lists ; modes Normal et Trash.
- Choix du format dans le salon : Potes, Perso, Tier list, ou Mélange des trois.
- Oui/Non : chacun répond pour soi, puis les totaux et les réponses nominatives sont révélés. Les absences restent distinctes des réponses Non.
- Tier list : classe tous les participants, toi compris, de S à D ; plusieurs personnes peuvent partager un rang. Touche un joueur puis un rang, et valide lorsque tout le monde est placé. 60 secondes par manche.
- Révélation des tier lists : moyenne du groupe ou détail de chaque liste validée. S = 4, A = 3, B = 2, C = 1, D = 0 ; moyenne arrondie au plus proche, demi-point vers le rang supérieur. Les listes non validées ne comptent pas.
- 10, 15 ou 20 manches sans répétition ; si le choix de catégories ne fournit pas assez de questions, le salon l’indique avant de démarrer.
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

Menu commun : `/` (Qui tu prends ?), `/trivial`, `/duel`, `/piege`, `/curseur`.
Les nouveaux jeux utilisent le canal Socket.IO `/arcade`, des salons et des jetons distincts. Chaque page crée son propre salon ; partager son lien invite au bon jeu. Une partie ne migre pas automatiquement vers une autre borne.

### Trivial des potes

2 à 6 joueurs. Plateau original de 73 cases, six branches, douze cases relance, six cases camembert. Dé serveur de 1 à 6 ; déplacement exact sans repasser sur une case. Premier joueur déterminé par un lancer initial automatique, égalités départagées. Bonne réponse : rejouer ; mauvaise réponse : joueur suivant connecté. Six camemberts puis arrivée exacte au centre, catégorie choisie par le joueur suivant, question finale. En cas d’échec il faut quitter le centre avant de revenir.

Six thèmes distincts à choisir parmi quinze. Difficulté déterminée par la question tirée, sans réglage dans le salon. Les cinq repères éditoriaux (Découverte à Expert, non calibrés statistiquement) sont mélangés dans chaque catégorie. Catalogue initial de 150 questions : dix par thème. Une catégorie épuisée recommence avec un message explicite, après ses dix questions sans répétition. Les résultats esport sont datés ; aucune question ne dépend du classement actuel. Les séries et mangas peuvent contenir des spoilers.

Réponse libre par défaut : la solution est envoyée uniquement au lecteur (adversaire suivant) après la proposition. Il valide les synonymes ou fautes de frappe. QCM optionnel à quatre choix, ordre mélangé et correction serveur. Pas de minuterie. L’hôte peut passer un tour bloqué ; les joueurs absents sont conservés pour la reconnexion. Reprise du rôle d’hôte disponible si l’hôte se déconnecte.

### Autres jeux

- Duel des arguments : 24 duels, débat oral puis votes secrets. Révélation automatique lorsque tous les joueurs connectés ont voté, ou à la demande de l’hôte. Pas de score individuel puisque les choix sont subjectifs.
- Piège des potes : 80 mots, indices en un mot. Les doublons exacts après normalisation des accents/casse sont retirés ; les synonymes ne sont pas détectés automatiquement. Le devineur ne reçoit jamais le mot avant le résultat. Réponse comparée sans accents/casse/ponctuation ; un point collectif par mot trouvé.
- Curseur : 24 axes, cible secrète de 0 à 100 pour le donneur, estimation individuelle. Barème d’écart : ≤5 = 4 points ; ≤10 = 3 ; ≤20 = 2 ; ≤30 = 1. Donneur : moyenne arrondie des points gagnés. Estimations cachées avant révélation.

Les parties se jouent en discutant en personne ou sur un appel existant ; aucun audio intégré. 5, 10 ou 15 manches pour ces trois jeux. L’hôte peut révéler les réponses déjà reçues ou passer une manche. Fin de partie puis retour au salon avec remise à zéro.

Validation : `npm test` couvre règles de plateau, catalogue, confidentialité, droits, camemberts/finale, correction QCM/libre, reconnexion, doublons d’indices, scores et rotation, ainsi que le jeu d’origine.

Pions circulaires avec six logements de camemberts, déplacement animé sur le trajet serveur, dé à points animé. Animations de cartes, résultats et fin de partie sur tous les jeux ; respect de prefers-reduced-motion.

### Table en relief (17 octobre)
Plateau dessiné en perspective avec bord épais, cases extrudées et pions debout ombrés (rendu SVG 2,5D, sans moteur WebGL). Dé animé, sauts case par case et entrée de la carte question. Historique conservé lors du redémarrage du salon et sur le navigateur : les nouveaux salons Trivial reprennent les questions vues par leur créateur. Après épuisement des dix cartes d'un thème, le paquet repart sans répéter sa dernière carte. L'historique local est limité à cet appareil et n'est pas un compte synchronisé. 17 tests couvrent notamment les transitions de paquet et le redémarrage.
