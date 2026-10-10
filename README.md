# MyFinanx

PWA de gestion de budget personnel, en français : revenus, dépenses, objectifs d'épargne, conseils et scan de tickets par IA. Les données restent dans le navigateur de l'utilisateur.

## Lancer en local

```bash
npm install
npm run dev      # interface seule (les routes /api ne tournent pas sous Vite)
npm test         # tests Vitest
npm run build    # build de production dans dist/
```

Pour tester aussi les routes `/api`, utiliser `vercel dev` avec les variables ci-dessous.

## Variables d'environnement (Vercel)

| Nom | Rôle |
|---|---|
| `GROQ_API_KEY` | Conseiller IA, répartition du budget, scan de tickets |
| `ONESIGNAL_REST_API_KEY` | Notifications push |
| `ALLOWED_ORIGINS` | Optionnel : domaines supplémentaires autorisés à appeler `/api` (séparés par des virgules) |

## Modèles IA (Groq)

- Texte : `openai/gpt-oss-120b`, puis `openai/gpt-oss-20b` et `qwen/qwen3.8-27b` en secours.
- Vision (photos, PDF scannés) : `qwen/qwen3.8-27b`.

La liste est dans `api/_lib/groq.js`. Groq retire régulièrement des modèles : en cas de panne de l'IA, vérifier https://console.groq.com/docs/deprecations.
