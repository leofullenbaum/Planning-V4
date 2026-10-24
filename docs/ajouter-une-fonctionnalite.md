# Modifier ou ajouter une fonctionnalité

Les étapes à suivre pour faire évoluer l'application sans rien casser.

## Tester en local

1. Lancer `lancer.bat` (ou `node server.js`) et ouvrir `http://localhost:8080`.
2. Pour travailler sur le jeu de test sans toucher aux vraies données : arrêter le serveur, mettre `data/data.json` de côté, copier `data/donnees-test.json` sous le nom `data/data.json`, relancer.
3. Après une modification d'un fichier `css/` ou `js/`, il suffit de recharger la page (F5). Après une modification de `server.js`, il faut relancer le serveur.
4. Avant de livrer, dérouler les cas de test du [plan de réalisation](plan-realisation.md#cas-de-test) qui touchent à la modification.

## Travailler avec GitHub

1. Créer une issue qui décrit le besoin, avec un label (`interface`, `alerte`, `bug`...) et la milestone de la phase.
2. Créer une branche pour la modification, faire les changements, ouvrir une pull request qui cite l'issue (« Ferme #12 »).
3. Fusionner dans `main` une fois testé. Pour livrer à l'atelier : télécharger le zip de `main` (ou créer une release) et remplacer les fichiers sur le PC serveur, **sans écraser `data/data.json`** ni `data/sauvegardes/`.

## Où intervenir

| Je veux... | Fichier(s) |
| --- | --- |
| Changer une couleur | Variables au début de `css/base.css` |
| Changer un texte ou un bouton de la barre | `index.html`, puis son action dans `js/demarrage.js` |
| Ajouter un champ à une station | Formulaire dans `js/fiches.js` (`openEdit`), puis l'afficher dans la vue concernée ; le documenter dans [donnees.md](donnees.md) |
| Ajouter un réglage | `DEF` dans `js/outils.js`, le formulaire dans `js/reglages.js`, la lecture dans `js/demarrage.js` |
| Ajouter une alerte | Voir l'exemple ci-dessous |
| Changer le calcul des dates (fériés...) | `isWork()` dans `js/calendrier.js` : toutes les dates passent par elle |
| Changer l'écran de la TV | `js/vue-atelier.js` et `css/atelier.css` |
| Changer la vue Semaine | `js/vue-semaine.js` et `css/vue-semaine.css` |

## Exemple : ajouter une alerte

Toutes les alertes sont calculées dans `js/charge-alertes.js`.

1. Dans `alerts(t0)`, ajouter une liste vide à `A`, par exemple `sansClient: []`, puis la remplir :
   ```js
   for (const s of pl) if (!s.client) A.sansClient.push({ s });
   ```
2. Dans `ALERT_DEF`, ajouter une ligne : la clé, la couleur (`"bad"` rouge, `"warn"` vert pâle, `"orange"`) et le texte de la puce :
   ```js
   ["sansClient", "warn", (n) => `${n} station${n > 1 ? "s" : ""} sans client`],
   ```
3. Dans `openAlerts(k)`, ajouter la ligne de détail dans `item` et un texte d'aide dans `help` :
   ```js
   sansClient: (x) => `${lk(x.s)} : client à renseigner`,
   ```

La puce apparaît alors dans le bandeau, et la liste s'ouvre au clic.

## Règles à garder

- Toujours passer un texte saisi par l'utilisateur dans `esc()` avant de l'insérer dans la page (cas de test CT-14).
- Toujours appeler `guard()` avant une modification, puis `patchS` / `createS` / `deleteS` / `saveCfg`, puis `render()`.
- Ne jamais écrire directement dans `S.stations` sans passer par ces fonctions : la modification ne serait pas enregistrée.
- Un nouveau fichier `js/` s'ajoute dans `index.html` avant `demarrage.js`. Éviter les noms de variables globales déjà utilisés (voir le début de chaque fichier).
