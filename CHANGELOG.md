# Journal des changements

Les changements notables, du plus récent au plus ancien. Ajouter une ligne à chaque livraison à l'atelier.

## 24/10/2026 : vue Semaine plus lisible, équipe à glisser

- Un seul bloc par jour et par station : les étapes du jour se suivent de gauche à droite, largeur selon les heures.
- La colonne du jour est en couleur avec la mention « Aujourd'hui ».
- Bandeau « Équipe » au-dessus du planning : chaque personne avec sa situation du jour (libre, station, absente). On la glisse sur une ligne Méca ou Élec pour l'affecter, d'une station à l'autre pour la déplacer, sur le bandeau ou avec × pour la retirer.
- Jusqu'à 3 personnes par métier sur une station (cases à cocher dans la fiche). Les heures de la gamme sont divisées par le nombre de personnes ; la date de sortie ne change pas d'elle-même.
- Refus clair si la personne n'est pas du bon métier ou s'il y a déjà 3 personnes ; avertissement si elle est déjà sur une autre station à la même période.

## 24/10/2026 : corrections de recette et jours de présence

- Retard compté en jours ouvrés, comme la marge (V4-102 : 2 j au lieu de 4).
- Marge affichée sur chaque barre, dans l'info-bulle, la fiche et la vue Semaine : verte, orange si 2 j ou moins, rouge si retard. Une barre à la fois en retard et en chevauchement affiche les deux.
- Décalage en cascade : déplacer, allonger ou changer la date d'une station pousse les stations suivantes du même emplacement qui la chevaucheraient.
- Poignée sur le bord droit des barres pour changer la durée à la souris.
- Jours de présence de chaque personne : jours travaillés dans la semaine et absences, dans les Réglages et d'un clic dans le tableau « Présence de l'équipe » de la vue Semaine. Nouvelle alerte « personne prévue un jour d'absence », cases rouges dans la vue Semaine, mention sur l'écran atelier.
- Nouveau jeu de données `data/donnees-effectif.json` : les 14 stations du jeu de test avec une équipe fictive de 10 personnes et des présences variées.

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
