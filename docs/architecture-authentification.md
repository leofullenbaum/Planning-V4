# Architecture et authentification – Application Planning Atelier

24/10/2026 · Léo

> Document de réflexion. Rien n'est encore codé : il propose trois options, une recommandation et la liste des questions à trancher avant de lancer le développement.

## Le besoin

Aujourd'hui, n'importe quel poste du réseau de l'entreprise qui ouvre `http://ADRESSE:8080` peut tout modifier : il n'y a ni compte, ni mot de passe, ni trace de qui a changé quoi. L'objectif est :

- **une authentification** : il faut se connecter pour modifier le planning ;
- **deux profils** au minimum : le **responsable** et le **chef d'équipe** ;
- **l'écran atelier** (TV) reste affiché en permanence, en lecture seule, sans qu'on ait à s'y connecter chaque matin ;
- **plusieurs personnes en même temps** sans qu'une modification en écrase une autre sans le savoir.

## Ce qui existe (point de départ)

| Brique | Fonctionnement actuel | Conséquence pour l'authentification |
| --- | --- | --- |
| `server.js` | Serveur Node.js sans dépendance, sur un PC de l'atelier | Facile d'y ajouter connexion et contrôle des droits, sans rien installer de plus |
| `data/data.json` | Un seul fichier JSON, sauvegarde atomique + copie quotidienne | Suffisant pour 2 à 10 utilisateurs ; les comptes peuvent vivre dans un fichier à côté |
| API `/api/stations/:id`, `/api/reglages/:id` | PUT / PATCH / DELETE ouverts à tous | C'est ici que le serveur doit vérifier le rôle, pas seulement l'interface |
| `/api/events` (temps réel) | Tous les écrans reçoivent les changements en direct | Doit aussi exiger une session ou un jeton d'écran |
| Accès | Réseau de l'entreprise uniquement | Le choix local / distant est la vraie décision d'architecture |

## Rôles et droits proposés

| Action | Responsable | Chef d'équipe | Écran atelier |
| --- | :-: | :-: | :-: |
| Voir le planning et les alertes | Oui | Oui | Oui |
| Déplacer, créer, modifier, supprimer une station | Oui | Oui | Non |
| Affecter les personnes (méca / élec) | Oui | Oui | Non |
| Modifier les réglages (gammes, heures, ressources, calendrier) | Oui | Non | Non |
| Importer le carnet de commandes | Oui | À décider | Non |
| Gérer les comptes (créer, désactiver, réinitialiser un mot de passe) | Oui | Non | Non |
| Gérer les écrans atelier (créer, révoquer un accès TV) | Oui | Non | Non |
| Consulter l'historique des modifications | Oui | Oui | Non |

Le droit est vérifié **par le serveur** à chaque requête : masquer un bouton dans l'interface ne suffit pas.

## Trois options d'architecture

### Option A · Serveur local actuel + comptes intégrés (recommandée pour démarrer)

On garde le PC de l'atelier, `server.js` et `data.json`, et on ajoute :

- un fichier `data/utilisateurs.json` : nom, identifiant, rôle, mot de passe **haché** (scrypt, inclus dans Node.js) ;
- une page de connexion, une session par cookie sécurisé (`HttpOnly`, `SameSite=Strict`), valable une journée de travail, avec option « rester connecté » sur un poste personnel ;
- un blocage temporaire après 5 essais ratés ;
- pour la TV : un **jeton d'écran** (adresse du type `http://ADRESSE:8080/#atelier?ecran=XXXX`) que le responsable crée et peut révoquer, qui donne seulement la lecture ;
- un **journal** `data/journal.json` : qui a modifié quelle station, quand, avant / après.

| Avantages | Limites |
| --- | --- |
| Aucun coût, aucun abonnement, données qui restent dans l'entreprise | Accessible uniquement depuis le réseau de l'entreprise |
| Peu de code à ajouter, toujours sans dépendance | Le PC serveur doit rester allumé (point unique de panne) |
| Pas de dépendance à internet : la TV marche même si la box tombe | En HTTP simple, le mot de passe circule en clair sur le réseau interne (acceptable en interne, sinon certificat local à installer) |
| Réutilise tout l'existant et le temps réel | Sauvegarde à sortir du PC (clé USB, partage réseau) |

**Coût** : 0 €. **Effort** : environ 1 à 1,5 semaine de développement et de tests.

### Option B · Option A + accès sécurisé depuis l'extérieur

Même serveur que l'option A, mais rendu joignable depuis l'extérieur (téléphone en 4G, domicile du responsable) par un **tunnel** plutôt qu'en ouvrant un port sur la box :

- **Cloudflare Tunnel + Cloudflare Access** : adresse en `https://planning.mondomaine.fr`, connexion par e-mail (code à usage unique) devant l'application, gratuit jusqu'à 50 utilisateurs, nécessite un nom de domaine (environ 10 €/an) ;
- ou **Tailscale** : petit logiciel à installer sur chaque appareil autorisé, gratuit pour un petit usage, pas de domaine, mais chaque téléphone ou PC doit être enrôlé.

| Avantages | Limites |
| --- | --- |
| Accès partout, en HTTPS, sans toucher au pare-feu de l'entreprise | Dépend d'un service externe et d'internet pour l'accès distant (l'atelier, lui, continue en local) |
| Double protection : le tunnel filtre, puis l'application vérifie le rôle | Le PC serveur reste un point unique de panne |
| S'ajoute plus tard à l'option A sans rien réécrire | À valider avec le service informatique (politique sur les tunnels) |

**Coût** : 0 à 10 €/an. **Effort** : option A + environ 1 jour de mise en place.

### Option C · Application hébergée dans le cloud

On sort l'application du PC : base de données et authentification gérées (par exemple **Supabase** : base PostgreSQL, comptes, temps réel), page hébergée sur un service web.

| Avantages | Limites |
| --- | --- |
| Plus de PC serveur à garder allumé, sauvegardes gérées par l'hébergeur | Réécriture de la couche données (`server.js` remplacé, `index.html` adapté) |
| Accès partout, gestion des comptes et mots de passe oubliés intégrée | Abonnement : 0 € en offre gratuite (mise en veille si inactif), environ 25 €/mois pour une offre fiable |
| Passe facilement à plus d'utilisateurs ou à plusieurs ateliers | Sans internet, la TV et le planning ne fonctionnent plus |
| | Données hébergées hors de l'entreprise (vérifier les règles internes, choisir un hébergement en Europe) |

**Coût** : 0 à 25 €/mois. **Effort** : environ 3 à 4 semaines.

### Comparaison rapide

| Critère | A · Local + comptes | B · Local + tunnel | C · Cloud |
| --- | :-: | :-: | :-: |
| Coût | 0 € | 0 à 10 €/an | 0 à 25 €/mois |
| Effort | ~1,5 sem. | ~1,5 sem. + 1 j | ~3 à 4 sem. |
| Accès hors entreprise | Non | Oui | Oui |
| Fonctionne sans internet | Oui | Oui (en interne) | Non |
| PC serveur à maintenir | Oui | Oui | Non |
| Réécriture de l'existant | Faible | Faible | Importante |

## Recommandation

**Commencer par l'option A**, en la construisant pour pouvoir ajouter l'option B ensuite si le responsable a besoin d'accéder au planning hors de l'entreprise. C'est la plus rapide, elle ne coûte rien, elle garde l'atelier indépendant d'internet et elle ne remet pas en cause le travail déjà fait. L'option C ne se justifie que si on ne veut plus de PC serveur ou si l'outil doit servir à plusieurs sites.

L'authentification peut s'insérer dans le plan de réalisation entre la phase 2 (ressources et calendrier) et la phase 3 (affichage atelier), puisque la TV aura besoin de son jeton d'écran au moment de son installation.

## Travail à plusieurs en même temps

Aujourd'hui, si deux personnes déplacent la même station au même moment, la dernière enregistrée gagne sans que l'autre le sache. Proposition, valable pour les trois options :

1. **Numéro de version par station** : chaque modification envoie la version qu'elle a lue ; si la station a changé entre-temps, le serveur refuse et l'interface affiche « modifiée par Marc il y a 10 s, rechargée ».
2. **Nom de l'auteur** sur chaque modification, affiché dans l'historique et dans l'infobulle de la station.
3. **Temps réel conservé** : les autres écrans voient la modification en direct, comme aujourd'hui.

Pour 2 à 5 personnes, cela suffit largement ; pas besoin de verrouillage ni d'édition collaborative complexe.

## Plan de mise en œuvre (option A)

| Étape | Contenu | Test de validation |
| --- | --- | --- |
| 1. Comptes | `utilisateurs.json`, hachage des mots de passe, création du premier compte responsable au premier lancement | Mot de passe jamais stocké en clair |
| 2. Connexion | Page de connexion, session par cookie, déconnexion, blocage après 5 échecs | Sans session, l'API répond 401 |
| 3. Droits | Contrôle du rôle sur chaque route de l'API, interface adaptée au rôle | Un chef d'équipe ne peut pas modifier les réglages, même en appelant l'API directement |
| 4. Écran atelier | Jetons d'écran créés et révoqués par le responsable | La TV affiche le planning, ne peut rien modifier ; un jeton révoqué coupe l'affichage |
| 5. Versions et journal | Numéro de version, refus en cas de conflit, journal des modifications | Deux modifications simultanées : la seconde est refusée avec un message clair |
| 6. Administration | Écran de gestion des comptes et des écrans pour le responsable | Créer, désactiver un compte, réinitialiser un mot de passe |

## Questions à trancher

1. **Accès depuis l'extérieur** : le responsable ou le chef d'équipe doivent-ils consulter ou modifier le planning hors de l'entreprise (téléphone, domicile) ? Si oui, option B ; sinon, option A suffit.
2. **Nombre d'utilisateurs** : une seule personne par rôle, ou plusieurs chefs d'équipe ?
3. **Comptes nominatifs ou partagés** : un compte par personne (recommandé, pour savoir qui a modifié quoi) ou un compte par rôle ?
4. **Validation** : le chef d'équipe modifie-t-il directement le planning, ou propose-t-il des changements que le responsable valide ? La validation est possible mais ajoute environ une semaine de travail.
5. **Droits du chef d'équipe** : peut-il supprimer une station ou importer le carnet de commandes ?
6. **Écran atelier** : confirmer qu'il s'affiche sans connexion, avec un jeton d'écran révocable.
7. **Le PC serveur** : est-il dédié, allumé en permanence, avec une IP fixe ? Le service informatique accepte-t-il un tunnel (option B) ou un hébergement externe (option C) ?
8. **Historique** : combien de temps garder le journal des modifications (par exemple 12 mois) ?
