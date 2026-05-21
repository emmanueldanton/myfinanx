# Contract: POST /api/ai

**Type**: Vercel Serverless Function (Node.js runtime)
**File**: `api/ai.js`
**Date**: 2026-05-21

---

## Endpoint

```
POST /api/ai
Content-Type: application/json
```

---

## Request Body

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Comment réduire mes dépenses alimentaires ?"
    }
  ],
  "context": {
    "month": "2026-05",
    "totalIncomesEUR": 2500.00,
    "totalExpensesEUR": 1200.00,
    "unallocatedEUR": 400.00,
    "budgetItems": [
      { "name": "Loyer", "allocatedEUR": 800.00, "spentEUR": 800.00 },
      { "name": "Courses", "allocatedEUR": 300.00, "spentEUR": 250.00 }
    ],
    "goals": [
      { "name": "Vacances été", "targetEUR": 1500.00, "savedEUR": 450.00, "deadlineDays": 41 }
    ]
  }
}
```

### Champs `messages[]`

| Champ | Type | Requis | Description |
|---|---|---|---|
| `role` | String | Oui | `"user"` \| `"assistant"` — le message `system` est construit côté serveur |
| `content` | String | Oui | Contenu du message (non vide) |

**Contrainte critique** : `messages[]` DOIT contenir l'intégralité de l'historique de la session (tous les échanges user/assistant précédents, dans l'ordre chronologique). Aucun message ne doit être tronqué côté client avant envoi.

### Champ `context`

Données financières du mois courant, construites par `ai.js → buildSystemContext()`. Utilisées par la fonction serverless pour construire le message `system` injecté en tête du tableau `messages` transmis à Groq.

| Champ | Type | Requis |
|---|---|---|
| `month` | String `YYYY-MM` | Oui |
| `totalIncomesEUR` | Float | Oui |
| `totalExpensesEUR` | Float | Oui |
| `unallocatedEUR` | Float | Oui |
| `budgetItems[]` | Array | Oui (peut être vide `[]`) |
| `goals[]` | Array | Oui (peut être vide `[]`) |

---

## Response — Succès (200)

```json
{
  "reply": "Voici 3 pistes pour réduire vos dépenses alimentaires : ...",
  "usage": {
    "prompt_tokens": 312,
    "completion_tokens": 148,
    "total_tokens": 460
  }
}
```

| Champ | Type | Description |
|---|---|---|
| `reply` | String | Réponse textuelle du modèle IA |
| `usage` | Object | Consommation tokens Groq (optionnel, loggé côté serveur) |

---

## Response — Erreurs

| Code HTTP | Code erreur | Déclencheur |
|---|---|---|
| 400 | `INVALID_BODY` | Body manquant, `messages` absent ou vide |
| 405 | `METHOD_NOT_ALLOWED` | Méthode HTTP autre que POST |
| 429 | `RATE_LIMITED` | Groq rate limit atteint |
| 500 | `GROQ_ERROR` | Erreur API Groq (timeout, modèle indisponible) |
| 500 | `INTERNAL_ERROR` | Erreur inattendue dans la fonction |

```json
{
  "error": "GROQ_ERROR",
  "message": "Le conseiller IA est temporairement indisponible. Veuillez réessayer."
}
```

---

## Comportement côté serveur (`api/ai.js`)

```
1. Valider méthode HTTP = POST
2. Parser le body JSON
3. Valider : messages[] non vide, context présent
4. Construire le message système :
   "Tu es MyFinanx, un conseiller financier personnel bienveillant en français.
   Contexte du mois {context.month} :
   - Revenus : {context.totalIncomesEUR} EUR
   - Dépenses : {context.totalExpensesEUR} EUR
   - Reste non alloué : {context.unallocatedEUR} EUR
   - Postes budgétaires : [liste]
   - Objectifs : [liste avec progression]
   Donne des conseils concrets, bienveillants et actionnables en une seule langue : le français."
5. Construire le payload Groq :
   {
     model: "llama-3.3-70b-versatile",
     messages: [systemMessage, ...messages],
     max_tokens: 500,
     temperature: 0.7
   }
6. Appeler l'API Groq avec GROQ_API_KEY (env var)
7. Retourner { reply: choices[0].message.content, usage }
8. En cas d'erreur Groq : retourner 500 + message utilisateur
```

---

## Message système — Greeting dashboard (via `ai.js` côté client)

Le greeting du dashboard est distinct du chat conseiller. Il est appelé directement depuis `ai.js` (côté client) via le même endpoint `/api/ai` avec :

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Génère une salutation contextuelle en une phrase pour {firstName} ({gender}) basée sur sa situation financière de {month}."
    }
  ],
  "context": { ... }
}
```

**Contraintes côté client** :
- Un seul appel par session (flag `sessionStorage.greetingDone`)
- Debounce 3 secondes avant déclenchement
- Invalidation par hash des données financières (`sessionStorage.greetingHash`)

---

## Variables d'environnement

| Variable | Contexte | Description |
|---|---|---|
| `GROQ_API_KEY` | Serveur uniquement | Clé API Groq — jamais exposée au frontend |

---

## Sécurité

- La clé `GROQ_API_KEY` n'est jamais incluse dans le bundle frontend ni dans les headers de réponse.
- La fonction serverless ne retourne aucune donnée financière identifiable — elle ne fait que relayer la réponse textuelle de Groq.
- Aucun logging des messages utilisateur n'est effectué côté serveur (conformité Principe I et II de la constitution).
