# QUI TU PRENDS ?

Jeu de votes entre 3 et 12 amis, sans compte, compatible téléphone et ordinateur.

**Jouer : https://qui-tu-prends.onrender.com**

Crée un salon, partage son lien, choisis 1 ou 2 amis par vote et lance la partie.

## Fonctionnalités

- 200 questions locales dans 10 catégories ; modes Normal et Trash.
- 10, 15 ou 20 manches sans répétition ; si le choix de catégories ne fournit pas assez de questions, le salon l’indique avant de démarrer.
- Questions privées de l’hôte, conservées dans son navigateur, utilisables seules ou mélangées.
- Votes validés côté serveur, secrets jusqu’à la révélation ; 30 secondes par manche.
- Révélation automatique, passage de question, classement, reconnexion et reprise du rôle d’hôte absent.
- Aucun appel à une IA pendant les parties, aucune base de données.

## Lancer et vérifier

Node.js 20 ou plus : `npm ci`, puis `npm start`. Ouvrir http://localhost:3000.
`npm test` lance les vérifications multijoueurs. La route `/health` répond `{"ok":true}`.

## Déploiement

Render : service web Node, branche `main`, build `npm ci`, démarrage `npm start`, contrôle de santé `/health`, offre Free. La variable `PORT` est fournie par Render. Déploiement automatique à chaque mise à jour de `main`.

Les salons sont en mémoire : un redémarrage ou déploiement peut interrompre les parties. L’hôte peut recréer un salon. L’offre gratuite peut s’endormir ; son premier réveil peut prendre environ une minute. Les questions personnalisées restent dans le stockage local du navigateur de l’hôte, et dans la mémoire du salon pendant son existence.

Les pourcentages représentent la part des choix exprimés, pas la part des joueurs. Les scores sont le nombre de fois où chaque personne a été sélectionnée. Passer une question ne distribue pas de points.
