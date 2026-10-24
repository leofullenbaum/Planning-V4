# Format des données (`data/data.json`)

Tout le planning tient dans un seul fichier JSON, avec deux parties : `stations` et `reglages`.

```json
{
  "stations": {
    "t12": { "numero": "V4-112", "client": "Client En Cours", "...": "..." }
  },
  "reglages": {
    "general": { "duree": 17, "ouvres": true, "...": "..." }
  }
}
```

Les dates sont toujours en texte `AAAA-MM-JJ`. Un champ vide vaut `""`.

## `stations` : une entrée par commande

La clé (`t12` ci-dessus) est un identifiant technique, créé automatiquement. Le numéro visible est `numero`.

| Champ | Type | Sens | Exemple |
| --- | --- | --- | --- |
| `numero` | texte | Numéro de la station | `"V4-112"` |
| `client` | texte | Client | `"Client En Cours"` |
| `couleur` | texte | Couleur du shelter | `"RAL 7032"` |
| `livraison` | date | Date de livraison promise | `"2026-11-06"` |
| `duree` | nombre | Durée en jours travaillés (sinon la durée standard) | `17` |
| `emplacement` | nombre 1 à 5, ou `""` | Emplacement ; `""` = dans le carnet | `5` |
| `debut` | date ou `""` | Entrée dans l'atelier ; `""` = dans le carnet | `"2026-10-12"` |
| `meca` | texte | Mécanicien affecté | `"David"` |
| `elec` | texte | Électricien affecté | `"Nassim"` |
| `etapeMeca`, `etapeElec` | texte | Étape fixée pour toute la station ; `""` = suit la gamme | `""` |
| `jours` | objet | Étape choisie pour un jour précis, par rôle | `{ "2026-10-26": { "meca": "MECA ODO 2" } }` |
| `ordreMeca`, `ordreElec` | liste ou `""` | Ordre des étapes changé par glisser-déposer ; `""` = ordre standard | `["MECA GAZ 1", "MECA ODO 1", "..."]` |
| `avancement` | nombre 0 à 100, ou `""` | Avancement saisi ; `""` = calculé selon la date | `""` |
| `note` | texte | Consigne pour l'atelier | `"Démarrée"` |

Une station n'est **placée** que si `emplacement` et `debut` sont tous les deux remplis. Sinon elle est dans le carnet de commandes.

## `reglages.general`

| Champ | Type | Sens | Exemple |
| --- | --- | --- | --- |
| `noms` | liste de 5 textes | Nom de chaque emplacement | `["1", "2", "3", "4", "5"]` |
| `duree` | nombre | Durée standard d'une station, en jours | `17` |
| `ouvres` | vrai / faux | Vrai : samedis et dimanches exclus du décompte | `true` |
| `mecas`, `elecs` | listes de textes | Mécaniciens et électriciens | `["Léo", "David"]` |
| `etapesMeca`, `etapesElec` | listes de textes | Gamme : étapes dans l'ordre standard | `["MECA ODO 1", "MECA GAZ 1"]` |
| `heuresMeca`, `heuresElec` | listes de nombres | Durée en heures de chaque étape, même ordre que la gamme | `[11, 7]` |

Prévu, pas encore géré : `feries` (liste de dates non travaillées), voir l'issue « Gérer les jours fériés, congés et fermetures ».

## Jeu de test

`data/donnees-test.json` a exactement ce format. Il contient 14 stations, V4-101 à V4-114, qui couvrent chacune un scénario (retard, marge faible, surcharge, chevauchement, week-end...). La liste des scénarios et les résultats attendus sont dans le [plan de réalisation](plan-realisation.md#jeu-de-données-de-test).
