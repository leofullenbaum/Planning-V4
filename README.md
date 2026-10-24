# Planning Atelier V4

Planning de production des stations V4 sur les 5 emplacements de l'atelier : vue semaine par glisser-déposer, alertes (surcharge, retard, marge faible, chevauchement) et écran atelier en direct sur la TV.

L'application tourne sur un PC de l'entreprise. Tous les postes du même réseau (PC, tablette, TV de l'atelier) l'ouvrent dans un navigateur, sans compte et sans installation.

## Contenu du dépôt

| Chemin | Rôle |
| --- | --- |
| `index.html` | Structure de la page de l'application |
| `css/` | Styles : thème, vues, fiches, écran atelier |
| `js/` | Code : calendrier, gammes, alertes, vues, glisser-déposer |
| `server.js` | Serveur local Node.js, sans dépendance |
| `lancer.bat` | Lancement en double-clic sous Windows |
| `data/data.json` | Données du planning (stations et réglages) |
| `data/donnees-test.json` | Jeu de test : 14 stations, une par scénario |
| `docs/architecture.md` | Comment l'application est construite, rôle de chaque fichier |
| `docs/donnees.md` | Format de `data.json`, champ par champ |
| `docs/ajouter-une-fonctionnalite.md` | Tester, modifier, livrer ; où intervenir selon le besoin |
| `docs/plan-realisation.md` | Plan de réalisation : 6 phases, données d'entrée, cas de test |
| `CHANGELOG.md` | Ce qui a changé, version par version |

**Pour reprendre le projet après une pause :** lire `CHANGELOG.md` (où on en est), puis `docs/architecture.md` (comment c'est fait), puis les [issues ouvertes](https://github.com/leofullenbaum/Planning-V4/issues) (ce qui reste à faire).

## 1. Installer (une seule fois, sur le PC qui servira de serveur)

- Installer Node.js (version LTS) : https://nodejs.org
- Copier ce dossier (avec `css/`, `js/` et `data/`) sur le PC, par exemple dans `C:\PlanningAtelier` (bouton **Code > Download ZIP** sur GitHub, ou zip d'une release).

## 2. Lancer

- Double-cliquer sur `lancer.bat` (ou `node server.js`).
- La fenêtre affiche les adresses à utiliser, par exemple : `Depuis le réseau : http://192.168.1.20:8080`
- Laisser cette fenêtre ouverte (le PC doit rester allumé).
- Si Windows demande l'autorisation du pare-feu : cocher « Réseaux privés » et autoriser.

## 3. Utiliser

- Planning : ouvrir `http://ADRESSE:8080` sur n'importe quel poste du réseau.
- Écran atelier (TV) : ouvrir `http://ADRESSE:8080/#atelier` puis F11 pour le plein écran.
- Les modifications s'affichent en direct sur tous les écrans.

## 4. Données et sauvegardes

- Toutes les données sont dans `data/data.json`.
- Une copie par jour est gardée dans `data/sauvegardes` (non versionné).
- Pour repartir d'une sauvegarde : arrêter `lancer.bat`, remplacer `data/data.json` par la copie, relancer.
- Pour tester avec le jeu de test : arrêter `lancer.bat`, mettre `data/data.json` de côté, copier `data/donnees-test.json` à sa place sous le nom `data.json`, relancer.

> Le `data.json` du dépôt ne contient que des exemples. Ne pas pousser les vraies données de production si le dépôt devient public.

## 5. Conseils

- Pour que le planning démarre tout seul : mettre un raccourci vers `lancer.bat` dans le dossier Démarrage de Windows (touche Windows + R, taper `shell:startup`).
- Demander au service informatique une adresse IP fixe pour ce PC, pour que l'adresse ne change pas.
- Le planning n'est accessible que depuis le réseau de l'entreprise (pas depuis l'extérieur).

## Organisation du projet

- **Issues** : une par fonctionnalité ou bug, avec les labels `interface`, `alerte`, `bug`.
- **Milestones** : les 6 phases du [plan de réalisation](docs/plan-realisation.md), de « Phase 0 · Cadrage et données » à « Phase 5 · Mise en service ».
- **Branches** : une par fonctionnalité, fusionnée dans `main` par pull request.
- **Releases** : un zip par version livrée à l'atelier.
