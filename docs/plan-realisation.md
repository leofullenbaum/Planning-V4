# Plan de réalisation – Application Planning Atelier

24/10/2026 · Léo

> Copie du document « Plan de réalisation – Application Planning Atelier ». Les 6 phases ci-dessous correspondent aux milestones GitHub du dépôt.

## Objectif et point de départ

L'application doit permettre de planifier les stations V4 sur les 5 emplacements de l'atelier par glisser-déposer, puis d'afficher ce planning en direct sur la TV de l'atelier. Le socle existe déjà (version locale : `index.html`, `server.js`, `data.json`). Le plan ci-dessous vise donc surtout à compléter, recetter et mettre en service, en 6 phases sur environ 9 semaines.

| Brique | État aujourd'hui | Reste à faire |
| --- | --- | --- |
| Serveur local Node.js + sauvegarde quotidienne | Fait | Recette, IP fixe, démarrage auto |
| Gantt glisser-déposer (déplacer, redimensionner, avancement) | Fait | Recette sur jeu de test |
| Décalage en cascade sur un emplacement | Fait | Recette |
| Placement automatique du carnet (par date de livraison) | Fait | Recette |
| Marge et retard par rapport à la livraison | Fait | Recette |
| Gammes méca et élec avec heures par étape | Fait | Valider les heures réelles |
| Vue semaine par personne | Fait | Alerte de surcharge (une personne sur 2 stations) |
| Écran atelier `#atelier` en direct | Fait | Test de lisibilité sur la TV |
| Jours fériés, congés, fermetures | Absent | À ajouter (week-ends seuls exclus) |
| Import des commandes (CSV / Excel) | Absent | À ajouter |
| Détection de chevauchement à l'import | Absent | À ajouter |

Hypothèse retenue : 1 jour = 7 h, une station = 17 jours ouvrés par défaut, 2 mécaniciens et 2 électriciens (réglages actuels).

> Mise à jour du 24/10/2026 : la vue semaine fixe (5 emplacements toujours à la même place, toutes les étapes du jour), les alertes (surcharge, retard, marge faible, chevauchement, station sans ressource) et l'interversion des étapes en glisser-déposer ont été ajoutées. Les vues GANTT et Charge ont été retirées à la demande de Léo.

## Phases, livrables et jalons

La réalisation tient en 6 phases sur 9 semaines, chacune fermée par un jalon : on ne passe à la suivante qu'une fois son livrable obtenu et ses cas de test passés. Semaines comptées à partir du lundi 26/10/2026, pause du 21/12 au 01/01.

| Phase | Semaines | Contenu | Livrable | Jalon |
| --- | --- | --- | --- | --- |
| 0. Cadrage et données | S1 (26/10) | Collecter commandes, gammes, ressources, fériés. Fixer les règles : 7 h/j, 17 j, 5 emplacements | Référentiels remplis, règles de calcul validées | J0 · Données validées |
| 1. Recette du socle existant | S2-S3 (02/11 au 13/11) | Charger le jeu de test, dérouler CT-01 à CT-14. Corriger les écarts (Gantt, cascade, placement auto) | PV de recette du planning, liste des corrections faites | J1 · Planning recetté |
| 2. Ressources et calendrier | S4-S5 (16/11 au 27/11) | Ajouter jours fériés, congés, fermetures (CT-17). Alertes chevauchement et surcharge (CT-15, CT-16) | Version calendrier + alertes, CT-15 à CT-17 passés | J2 · Charge fiable |
| 3. Affichage atelier | S6 (30/11 au 04/12) | Installer la TV, IP fixe, démarrage automatique. Tests TV : lisibilité, temps réel, coupure | TV en service dans l'atelier, CT-12, CT-13, CT-20 passés | J3 · TV validée |
| 4. Pilote en atelier | S7-S8 (07/12 au 18/12) | Planning réel en parallèle de l'outil actuel. Comparer heures prévues et réelles sur 3 stations | Bilan du pilote, heures de gamme corrigées | J4 · Go / no-go pilote |
| 5. Mise en service | S9 (04/01/2027) | Import CSV (CT-18) et sauvegardes (CT-19). Former le planificateur et les équipes | Outil en production, ancien planning arrêté | J5 · Mise en service |

Le vrai point de bascule est J4 : après 2 semaines de pilote en parallèle, on décide d'arrêter ou non l'ancien planning. Les dates supposent un démarrage le lundi 26/10/2026 et une pause pendant les fêtes.

## Données d'entrée nécessaires

Sept référentiels sont à collecter en phase 0 ; les quatre premiers bloquent le démarrage. Toutes les dates sont au format ISO `AAAA-MM-JJ`, les durées en jours ouvrés, les heures en décimal (`24,5`).

| Référentiel | Champs | Format | Exemple | Fournisseur | Bloquant |
| --- | --- | --- | --- | --- | --- |
| Emplacements | numéro 1 à 5, nom affiché | entier + texte | `1` « Emplacement 1 » | Chef d'atelier | Oui |
| Commandes (stations) | numéro, client, couleur, date de livraison, durée si différente | texte, texte, RAL, date, entier | `V4-101`, Client Nominal, `RAL 7032`, `2026-12-04`, `17` | ADV / commercial | Oui |
| Planification | emplacement, date de début | entier 1-5, date | `1`, `2026-11-02` | Planificateur (dans l'outil) | Non, saisi dans l'outil |
| Gamme méca | étapes ordonnées + heures | une ligne `Nom ; 11h` ou `Nom ; 1,5j` | `MECA ODO 1 ; 11h` | Méthodes | Oui |
| Gamme élec | étapes ordonnées + heures | idem | `TEST ELEC ; 28h` | Méthodes | Oui |
| Ressources | mécaniciens, électriciens (nom court) | une ligne par personne | Léo, David / Kylian, Nassim | Chef d'atelier | Oui |
| Calendrier | jours ouvrés, h/jour, fériés, fermetures, congés | booléen, 7, liste de dates | `2026-11-11`, `2026-12-25` | RH | Non (à créer) |

**Contrôles à l'entrée.** Numéro unique ; livraison renseignée (sinon pas de marge calculée) ; durée entre 1 et 60 j ; un emplacement ne porte qu'une station à la fois ; une personne n'est affectée qu'à une station par jour.

**Format d'import proposé (phase 5).** CSV UTF-8, séparateur `;`, une ligne par commande :

```csv
numero;client;couleur;livraison;duree;emplacement;debut;meca;elec;note
V4-105;Client Carnet Urgent;RAL 7032;2026-12-18;17;;;;;
V4-101;Client Nominal;RAL 7032;2026-12-04;17;1;2026-11-02;Léo;Kylian;
```

**Format de stockage.** `data.json` garde sa structure actuelle : `stations` (une entrée par commande, avec `jours` pour l'étape réalisée un jour donné) et `reglages.general` (durée, jours ouvrés, noms, gammes, heures). Les fériés s'ajouteraient dans `reglages.general.feries`.

## Jeu de données de test

Le fichier [`data/donnees-test.json`](../data/donnees-test.json) contient 14 stations (V4-101 à V4-114) qui couvrent chacune un scénario. Il a exactement le format de `data.json` : pour l'utiliser, arrêter `lancer.bat`, mettre le vrai `data/data.json` de côté, copier le fichier de test à sa place sous le nom `data.json`, relancer. Fin et marge ci-dessous sont calculées avec les règles actuelles (17 j ouvrés, week-ends exclus, marge en jours ouvrés).

| N° | Empl. | Début | Fin attendue | Livraison | Marge attendue | Scénario |
| --- | --- | --- | --- | --- | --- | --- |
| V4-101 | 1 | 2026-11-02 | 2026-11-24 | 2026-12-04 | +8 j | Nominal |
| V4-102 | 2 | 2026-11-02 | 2026-11-24 | 2026-11-20 | -2 j | Retard (rouge) |
| V4-103 | 3 | 2026-11-02 | 2026-11-24 | 2026-11-26 | +2 j | Marge faible (orange) |
| V4-104 | 1 | 2026-11-26 | 2026-12-18 | 2027-01-08 | +15 j | Suit V4-101 : test de cascade |
| V4-105 | - | - | - | 2026-12-18 | - | Carnet, placement auto en 1er |
| V4-106 | - | - | - | 2027-01-29 | - | Carnet, placement auto en 2e |
| V4-107 | 5 | 2026-11-09 | 2026-12-01 | 2026-12-18 | +13 j | Aucune ressource affectée |
| V4-108 | 3 | saisi 2026-11-28 (samedi) | 2026-12-22 | 2027-01-15 | +18 j | Début calculé au lundi 30/11 |
| V4-109 | 2 | 2026-11-23 | 2026-12-04 | 2026-12-11 | +5 j | Durée 10 j, chevauche V4-102 les 23-24/11 |
| V4-110 | 4 | 2026-11-02 | 2026-11-24 | 2026-12-11 | +13 j | Léo et Kylian déjà sur V4-101 : surcharge |
| V4-111 | 4 | 2026-12-14 | 2027-01-05 | 2027-01-22 | +13 j | Traverse le 25/12 et le 01/01 |
| V4-112 | 5 | 2026-10-12 | 2026-11-03 | 2026-11-06 | +3 j | En cours, étape réalisée saisie le 26/10 |
| V4-113 | 3 | 2027-01-04 | 2027-01-26 | 2027-02-05 | +8 j | Nom très long, accents, balises HTML |
| V4-114 | 2 | 2026-12-14 | 2027-01-05 | aucune | aucune | Sans date de livraison |

Les réglages du fichier reprennent ceux d'aujourd'hui (gammes méca 68 h et élec 98,5 h, Léo, David, Kylian, Nassim), avec la durée standard ramenée à 17 j.

## Cas de test

20 cas à dérouler sur le jeu de test ; les cas CT-01 à CT-14 recettent l'existant (jalon J1 et J3), CT-15 à CT-20 valident les ajouts. Recharger le jeu de test avant chaque cas qui modifie les données ; les résultats de placement auto supposent un test lancé avant le 30/10/2026.

| ID | Fonction | Action | Résultat attendu |
| --- | --- | --- | --- |
| CT-01 | Chargement | Lancer `lancer.bat` avec le jeu de test, ouvrir le planning | 12 barres sur 5 emplacements, 2 commandes dans le carnet (V4-105, V4-106) |
| CT-02 | Calcul de fin | Lire la fiche V4-101 | Fin 24/11/2026, marge +8 j |
| CT-03 | Retard | Lire V4-102 | Marge -2 j affichée en rouge |
| CT-04 | Marge faible | Lire V4-103 | Marge +2 j affichée en orange |
| CT-05 | Glisser-déposer | Déplacer V4-110 de l'emplacement 4 à l'emplacement 5 au 02/12 | Barre déplacée, `emplacement` = 5 et `debut` = 2026-12-02 dans `data.json` |
| CT-06 | Cascade | Reculer V4-101 de 2 jours ouvrés (début 04/11) | V4-101 finit le 26/11, V4-104 est poussée au 27/11 |
| CT-07 | Redimensionner | Étirer V4-109 de 10 à 12 j | Fin au 08/12/2026, marge +3 j |
| CT-08 | Week-end | Ouvrir V4-108 (saisie un samedi) | Barre démarre le lundi 30/11, finit le 22/12 |
| CT-09 | Placement auto | Cliquer « Placement automatique » | V4-105 placée en 1er sur l'emplacement 5 au 02/12, fin 24/12, signalée en retard (-4 j) ; V4-106 placée ensuite, sans retard |
| CT-10 | Sans ressource | Afficher V4-107 en vue semaine | Station visible, aucune personne affectée, pas d'erreur |
| CT-11 | Sans livraison | Lire V4-114 | Aucune marge affichée, pas d'erreur |
| CT-12 | Écran atelier | Ouvrir `/#atelier` sur la TV en F11 | Lisible à 3 m ; V4-112 montre son avancement et l'étape du jour |
| CT-13 | Temps réel | Modifier V4-101 sur le PC, regarder la TV | La TV se met à jour en moins de 2 s sans recharger |
| CT-14 | Sécurité texte | Afficher V4-113 sur le planning et la TV | Les balises s'affichent comme du texte, aucune alerte ne s'ouvre, le nom long est tronqué proprement |
| CT-15 | Chevauchement | Ouvrir le planning avec V4-109 et V4-102 | Conflit signalé sur l'emplacement 2 les 23-24/11 |
| CT-16 | Surcharge | Vue semaine du 02/11 | Léo et Kylian signalés sur 2 stations (V4-101, V4-110) |
| CT-17 | Jours fériés | Ajouter 2026-12-25 et 2027-01-01 en fériés, ouvrir V4-111 | Fin décalée du 05/01 au 07/01/2027 (à développer) |
| CT-18 | Import CSV | Importer le CSV d'exemple | 2 commandes créées ; un numéro déjà existant est refusé avec un message (à développer) |
| CT-19 | Sauvegarde | Modifier une station, regarder le dossier `data/sauvegardes` | Fichier du jour créé ou mis à jour ; restauration conforme après remplacement de `data.json` |
| CT-20 | Coupure serveur | Fermer `lancer.bat` pendant que la TV est ouverte, puis relancer | La TV signale la perte de connexion puis se reconnecte seule, aucune donnée perdue |

## Risques et prochaines étapes

| Risque | Effet | Parade |
| --- | --- | --- |
| Heures de gamme non réalistes | Dates de fin fausses, perte de confiance de l'atelier | Comparer sur 3 stations réelles en pilote, corriger les heures |
| PC serveur éteint ou IP qui change | TV et postes sans planning | IP fixe, `lancer.bat` au démarrage, sauvegarde quotidienne déjà en place |
| Deux personnes modifient la même station | La dernière modification écrase l'autre | Un seul planificateur désigné, les autres en lecture |
| Fériés et congés non gérés | Fins trop tôt en mai et en décembre | Phase 2, avant le pilote |
| Double saisie avec l'outil actuel | Abandon pendant le pilote | Pilote limité à 4 semaines, critères de bascule fixés au jalon J4 |

- [ ] Collecter les référentiels de la phase 0 (commandes, gammes, ressources, fériés)
- [ ] Dérouler CT-01 à CT-14 sur le jeu de test
- [ ] Choisir et installer la TV de l'atelier, tester CT-12
