# Architecture

Ce document explique comment l'application est construite, pour pouvoir la reprendre après une pause. Pour l'installer et la lancer, voir le [README](../README.md).

## Vue d'ensemble

```
Navigateur (PC, tablette, TV)                    PC serveur
┌──────────────────────────────┐                ┌───────────────────────────┐
│ index.html + css/ + js/      │  GET /api/events (flux en direct)          │
│                              │ ◀──────────────│ server.js                 │
│ S (état en mémoire)          │  PUT/PATCH/DELETE /api/stations/<id>       │
│ render() redessine la page   │ ──────────────▶│   └─ data/data.json       │
└──────────────────────────────┘                │   └─ data/sauvegardes/    │
                                                └───────────────────────────┘
```

- **Le serveur** (`server.js`, Node.js sans dépendance) garde tout l'état dans `data/data.json`. À chaque modification, il réécrit le fichier, garde une copie du jour dans `data/sauvegardes/` et envoie le nouvel état à tous les navigateurs ouverts.
- **La page** n'a pas de logique côté serveur : tous les calculs (dates de fin, retards, gammes, alertes) sont faits dans le navigateur, à partir des stations et des réglages.
- **Le cycle** est toujours le même : une action de l'utilisateur modifie `S`, envoie la modification au serveur, puis appelle `render()`. Quand le serveur renvoie l'état, `render()` est rappelée sur tous les écrans.

Il n'y a ni framework ni étape de compilation : on modifie un fichier, on recharge la page.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Structure de la page : barre d'outils, carnet, zone de la vue, écran atelier, panneau latéral. Charge les CSS et les JS dans l'ordre. |
| `server.js` | Serveur local : sert la page, `css/` et `js/`, l'API `/api/...` et le flux en direct. |
| `lancer.bat` | Lance `node server.js` sous Windows. |

### Styles (`css/`)

| Fichier | Contenu |
| --- | --- |
| `base.css` | Couleurs du thème clair et sombre (variables `--accent`, `--ink`...), polices, boutons, barre d'outils, puces d'alerte. |
| `carnet.css` | Carnet de commandes (colonne de gauche). |
| `vue-planning.css` | Vues 4 semaines et 3 mois : échelle, lignes d'emplacement, barres. |
| `vue-semaine.css` | Vue Semaine : tableau fixe, étapes du jour. |
| `fiches.css` | Panneaux latéraux et message en bas d'écran. |
| `atelier.css` | Écran atelier pour la TV (toujours en thème clair). |

Pour changer une couleur, ne modifier que les variables au début de `base.css` (et `.atelier` dans `atelier.css` pour la TV).

### Code (`js/`)

Les fichiers sont des scripts classiques qui partagent les mêmes variables globales. **L'ordre de chargement dans `index.html` compte** : un fichier peut utiliser à tout moment les fonctions des fichiers chargés avant lui, et `demarrage.js` doit rester le dernier.

| Fichier | Rôle | À regarder pour... |
| --- | --- | --- |
| `connexion-serveur.js` | Fournit l'objet `db` qui parle à `server.js`. | changer de stockage |
| `outils.js` | Raccourcis (`$`, `esc`), couleurs RAL, état `S`, réglages par défaut `DEF`. | comprendre l'état |
| `calendrier.js` | Dates, jours ouvrés, date de fin et retard d'une station (`info`). | jours fériés, calcul des dates |
| `exemple.js` | Données de démonstration si le serveur ne répond pas. | |
| `enregistrement.js` | `patchS`, `createS`, `deleteS`, `saveCfg` : toutes les écritures. | ajouter un champ |
| `placement-auto.js` | Bouton « Placer automatiquement ». | règles de placement |
| `vue-planning.js` | `render()` et les vues 4 semaines / 3 mois. | point d'entrée de l'affichage |
| `gamme.js` | Ordre des étapes, étape du jour (`stepOf`), heures par étape. | gammes méca / élec |
| `charge-alertes.js` | Charge par personne et alertes du bandeau (`alerts`, `ALERT_DEF`). | ajouter une alerte |
| `vue-atelier.js` | Écran atelier vu de dessus. | affichage TV |
| `glisser-deposer.js` | Déplacer une station ou une commande du carnet. | glisser-déposer des barres |
| `fiches.js` | Fiche d'une station, nouvelle commande, `toast()`. | formulaire station |
| `reglages.js` | Fenêtre Réglages et lecture des gammes saisies. | réglages |
| `vue-semaine.js` | Vue Semaine, interversion des étapes, fiche d'un jour. | vue par défaut |
| `demarrage.js` | Boutons de la barre, mode planning / atelier, chargement des données. | |

Chaque fichier commence par un commentaire qui résume ce qu'il contient et le sens des noms courts.

## Noms courts à connaître

Le code utilise quelques noms très courts, partout :

| Nom | Sens |
| --- | --- |
| `S` | État de l'application (stations, réglages, vue affichée) |
| `s` | Une station (une commande) |
| `role` | `"meca"` ou `"elec"` |
| `r` | Numéro d'emplacement, de 1 à 5 |
| `t0` | Aujourd'hui à minuit |
| `ds` | Une date en texte `AAAA-MM-JJ` |
| `$(id)` | `document.getElementById(id)` |
| `esc(t)` | Protège un texte avant de l'insérer dans la page |
| `P(ds)` / `iso(d)` | Texte → date / date → texte |
| `dd(d)` / `ddy(d)` | Date affichée `02/11` / `02/11/26` |
| `info(s)` | `{ debut, fin, livr, retard }` d'une station |

## Règles de calcul

- Une station reste `duree` jours travaillés (17 par défaut) sur son emplacement, à partir de `debut`. Une entrée saisie un samedi ou un dimanche est calée au lundi.
- Jours travaillés : du lundi au vendredi si « Jours ouvrés seulement » est coché. Les jours fériés ne sont pas encore gérés.
- Retard : nombre de jours calendaires entre la livraison et la sortie, si la sortie est après la livraison. Marge : nombre de jours ouvrés entre la sortie et la livraison (alerte orange à 2 jours ou moins).
- Gamme : les étapes s'enchaînent dans l'ordre, 7 h par jour (`H_JOUR`). L'étape affichée un jour donné est, par priorité : l'étape saisie pour ce jour, l'étape fixée pour la station, puis l'étape calculée par la gamme.

## Version claude.ai

La même page peut être publiée sur claude.ai. Là-bas, la base de données est fournie par claude.ai : il faut publier `index.html` avec les dossiers `css/` et `js/`, mais sans charger `connexion-serveur.js`. Tout le reste du code est identique.
