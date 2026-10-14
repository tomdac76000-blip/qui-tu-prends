# QUI TU PRENDS ?

Jeu de votes entre 3 et 12 amis, sans compte, compatible téléphone et ordinateur.

**Jouer : https://qui-tu-prends.onrender.com**

Crée un salon, partage son lien, choisis 1 ou 2 amis par vote et lance la partie.

## Fonctionnalités

- 270 questions locales : 200 votes entre potes dans 10 catégories, 40 Oui/Non personnels et 30 tier lists ; modes Normal et Trash.
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
