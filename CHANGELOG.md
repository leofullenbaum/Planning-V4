# Journal des changements

Les changements notables, du plus récent au plus ancien. Ajouter une ligne à chaque livraison à l'atelier.

## 24/10/2026 : code réorganisé

- `index.html` découpé : styles dans `css/` (6 fichiers), code dans `js/` (15 fichiers), chacun avec un commentaire d'en-tête.
- 122 règles de style qui ne servaient plus (anciennes vues GANTT, Charge, cartes) retirées.
- `server.js` sert maintenant les dossiers `css/` et `js/`.
- Documentation ajoutée : `docs/architecture.md`, `docs/donnees.md`, `docs/ajouter-une-fonctionnalite.md`.
- Aucun changement visible : l'affichage et les calculs sont identiques à la version précédente.

## 24/10/2026 : vue semaine et alertes

- Vue « Semaine » par défaut : les 5 emplacements toujours à la même place, une ligne méca et une ligne élec, toutes les étapes du jour avec leurs heures.
- Interversion des étapes de montage par glisser-déposer, avec décalage de la suite et retour à l'ordre standard.
- Alertes : surcharge (une personne sur 2 tâches), retard sur la livraison, marge faible, chevauchement d'emplacement, station sans élec ou méca, personne sans tâche.
- Vues GANTT et Charge retirées.

## 13-14/10/2026 : version locale

- Serveur local `server.js` et `lancer.bat` : planning partagé sur le réseau de l'entreprise, sauvegarde quotidienne.
- Vues 4 semaines et 3 mois, carnet de commandes, placement automatique, écran atelier `#atelier`.
- Gammes méca et élec avec heures par étape.
