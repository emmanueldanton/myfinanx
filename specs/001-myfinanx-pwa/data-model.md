# Data Model: MyFinanx

**Branch**: `001-myfinanx-pwa` | **Date**: 2026-05-21
**Storage**: `localStorage` (source de vérité unique)
**Pivot**: Tous les montants monétaires sont stockés en EUR (Float, arrondi à la précision de la devise source).

---

## Clés localStorage

| Clé | Type | Description |
|---|---|---|
| `mfx_prefs` | Object | Préférences utilisateur |
| `mfx_budget_{YYYY-MM}` | Object | Budget d'un mois donné |
| `mfx_transactions_{YYYY-MM}` | Array | Transactions d'un mois donné |
| `mfx_goals` | Array | Tous les objectifs d'épargne |
| `mfx_ai_history` | Array | Historique de conversation IA |
| `mfx_rates_cache` | Object | Cache taux de change |
| `mfx_tutorial_done` | Boolean | Tutoriel complété/ignoré |
| `mfx_last_reminder` | String | Date ISO du dernier rappel in-app |

---

## Schémas des entités

### Préférences utilisateur — `mfx_prefs`

```json
{
  "firstName": "Marie",
  "gender": "female",
  "currency": "EUR",
  "theme": "blue",
  "onboardingDone": false
}
```

| Champ | Type | Valeurs | Requis |
|---|---|---|---|
| `firstName` | String | Texte libre (non vide) | Oui |
| `gender` | String | `"male"` \| `"female"` \| `"neutral"` | Oui |
| `currency` | String | `"EUR"` \| `"USD"` \| `"GBP"` \| `"CAD"` \| `"XOF"` \| `"MAD"` | Oui |
| `theme` | String | `"blue"` \| `"violet"` \| `"light"` | Oui |
| `onboardingDone` | Boolean | `true` \| `false` | Oui |

---

### Budget mensuel — `mfx_budget_{YYYY-MM}`

```json
{
  "month": "2026-05",
  "incomes": [
    { "id": "inc_1716297600000", "name": "Salaire", "amountEUR": 2500.00 }
  ],
  "budgetItems": [
    { "id": "bi_1716297600001", "name": "Loyer", "allocatedEUR": 800.00, "category": "Logement" },
    { "id": "bi_1716297600002", "name": "Courses", "allocatedEUR": 300.00, "category": "Alimentation" }
  ]
}
```

**Income**

| Champ | Type | Contraintes |
|---|---|---|
| `id` | String | `"inc_" + Date.now()` — unique |
| `name` | String | Non vide |
| `amountEUR` | Float | > 0, arrondi selon précision devise de saisie |

**BudgetItem**

| Champ | Type | Contraintes |
|---|---|---|
| `id` | String | `"bi_" + Date.now()` — unique |
| `name` | String | Non vide |
| `allocatedEUR` | Float | > 0, arrondi selon précision devise de saisie |
| `category` | String | Valeur de `CATEGORIES` ou personnalisée |

**Calculs dérivés** (fonctions pures dans `budget.js`, jamais stockés) :
- `totalIncomes = sum(incomes[].amountEUR)`
- `totalAllocated = sum(budgetItems[].allocatedEUR)`
- `unallocated = totalIncomes - totalAllocated`
- `percentagePerItem = budgetItem.allocatedEUR / totalIncomes * 100`

---

### Transactions — `mfx_transactions_{YYYY-MM}`

```json
[
  {
    "id": "tx_1716297600003",
    "description": "Restaurant midi",
    "category": "Alimentation",
    "amountEUR": 18.50,
    "date": "2026-05-21",
    "type": "expense"
  },
  {
    "id": "tx_1716297600004",
    "description": "Vente objet",
    "category": "Autre",
    "amountEUR": 50.00,
    "date": "2026-05-21",
    "type": "income"
  }
]
```

| Champ | Type | Contraintes |
|---|---|---|
| `id` | String | `"tx_" + Date.now()` — unique |
| `description` | String | Non vide |
| `category` | String | Valeur de `CATEGORIES` ou personnalisée |
| `amountEUR` | Float | > 0 |
| `date` | String | ISO 8601 `YYYY-MM-DD` |
| `type` | String | `"expense"` \| `"income"` |

**Calculs dérivés** (fonctions pures dans `transactions.js`) :
- `totalExpenses = sum(transactions.filter(t => t.type === 'expense')[].amountEUR)`
- `totalPunctualIncomes = sum(transactions.filter(t => t.type === 'income')[].amountEUR)`
- `byCategory = groupBy(transactions, 'category')`

**Impact sur les KPIs dashboard** :
- `KPI_revenues = budget.totalIncomes + totalPunctualIncomes`
- `KPI_expenses = totalExpenses`
- `KPI_available = KPI_revenues - KPI_expenses`
- `KPI_unallocated = budget.unallocated`

---

### Objectifs d'épargne — `mfx_goals`

```json
[
  {
    "id": "goal_1716297600005",
    "name": "Vacances été",
    "targetEUR": 1500.00,
    "savedEUR": 450.00,
    "deadline": "2026-07-01",
    "color": "#3B82F6",
    "createdAt": "2026-01-15"
  }
]
```

| Champ | Type | Contraintes |
|---|---|---|
| `id` | String | `"goal_" + Date.now()` — unique |
| `name` | String | Non vide |
| `targetEUR` | Float | > 0 |
| `savedEUR` | Float | ≥ 0, ≤ `targetEUR` recommandé (non bloquant) |
| `deadline` | String | ISO 8601 `YYYY-MM-DD` (optionnel) |
| `color` | String | Couleur hex `#RRGGBB` |
| `createdAt` | String | ISO 8601 `YYYY-MM-DD` |

**Calculs dérivés** (fonctions pures dans `goals.js`) :
- `progressPercent = savedEUR / targetEUR * 100`
- `remaining = targetEUR - savedEUR`

**Contrainte critique** : La clé `mfx_goals` est chargée et sauvegardée indépendamment des clés `mfx_budget_*` et `mfx_transactions_*`. Un changement de mois dans `main.js` ne déclenche jamais `goals.load()` ou `goals.save()`.

---

### Historique conversation IA — `mfx_ai_history`

```json
[
  { "role": "system", "content": "Tu es un conseiller financier..." },
  { "role": "user", "content": "Comment réduire mes dépenses alimentaires ?" },
  { "role": "assistant", "content": "Voici 3 pistes concrètes..." }
]
```

| Champ | Type | Valeurs |
|---|---|---|
| `role` | String | `"system"` \| `"user"` \| `"assistant"` |
| `content` | String | Texte du message |

**Contrainte** : L'intégralité du tableau `mfx_ai_history` est transmise à l'API Groq à chaque nouvel appel. Le message système (`role: "system"`) est reconstruit dynamiquement à partir des données financières du mois courant avant chaque appel — il n'est pas stocké de manière permanente.

---

### Cache taux de change — `mfx_rates_cache`

```json
{
  "base": "EUR",
  "timestamp": 1716297600000,
  "rates": {
    "USD": 1.0823,
    "GBP": 0.8521,
    "CAD": 1.4762,
    "XOF": 655.957,
    "MAD": 10.8641
  }
}
```

| Champ | Type | Description |
|---|---|---|
| `base` | String | Toujours `"EUR"` |
| `timestamp` | Number | `Date.now()` au moment du chargement |
| `rates` | Object | Taux EUR→devise pour les 5 devises non-EUR |

**Validité** : `Date.now() - timestamp < 24 * 60 * 60 * 1000`. Si expiré ou absent → appel `frankfurter.app/latest?from=EUR&to=USD,GBP,CAD,XOF,MAD`. En cas d'échec réseau → fallback : affichage en EUR + avertissement visible.

---

### Précision par devise — constante `CURRENCIES` dans `currency.js`

```js
export const CURRENCIES = {
  EUR: { symbol: '€', decimals: 2 },
  USD: { symbol: '$', decimals: 2 },
  GBP: { symbol: '£', decimals: 2 },
  CAD: { symbol: 'CA$', decimals: 2 },
  XOF: { symbol: 'CFA', decimals: 0 },
  MAD: { symbol: 'MAD', decimals: 2 },
};
```

**Règle d'arrondi** (sans erreur IEEE 754) :
```js
function round(value, decimals) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
```

---

## État dérivé — non stocké

Les valeurs suivantes sont calculées à la volée par des fonctions pures et ne sont jamais persistées :

| Valeur | Module | Fonction |
|---|---|---|
| Total revenus du mois | `budget.js` | `calcTotalIncomes(budget)` |
| Total alloué | `budget.js` | `calcTotalAllocated(budget)` |
| Reste non alloué | `budget.js` | `calcUnallocated(budget)` |
| % par poste | `budget.js` | `calcItemPercent(item, budget)` |
| Total dépenses réelles | `transactions.js` | `calcTotalExpenses(transactions)` |
| Total revenus ponctuels | `transactions.js` | `calcTotalPunctualIncomes(transactions)` |
| Répartition par catégorie | `transactions.js` | `calcByCategory(transactions)` |
| Progression objectif | `goals.js` | `calcProgress(goal)` |
| KPIs dashboard | `main.js` / `ui/index.js` | Composition des fonctions ci-dessus |

---

## Migrations de schéma

La fonction `store.migrate()` (appelée au démarrage dans `main.js`) compare `mfx_prefs.schemaVersion` (si absent → `"1.0"`) avec la version courante et applique les transformations nécessaires de manière non-destructive.

| Version | Changement |
|---|---|
| 1.0 | Schéma initial |
