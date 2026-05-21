# Quickstart: MyFinanx — Guide développeur

**Branch**: `001-myfinanx-pwa` | **Date**: 2026-05-21

---

## Prérequis

- Node.js ≥ 18.x
- npm ≥ 9.x
- Compte Vercel (pour le déploiement et la fonction IA)
- Clé API Groq (https://console.groq.com)

---

## Installation

```bash
# Cloner le dépôt
git clone <repo-url>
cd myfinanx

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local et renseigner GROQ_API_KEY=gsk_...
```

---

## Démarrage local

```bash
npm run dev
```

L'app tourne sur `http://localhost:5173`. La fonction serverless `/api/ai` est émulée via Vercel CLI si installé, ou via `vercel dev` :

```bash
# Option avec Vercel CLI (recommandé pour tester la fonction IA)
npm i -g vercel
vercel dev
# → App sur http://localhost:3000, /api/ai disponible
```

---

## Build de production

```bash
npm run build
# → dist/ : assets statiques + SW versionné automatiquement par Workbox
```

Vérifier le Service Worker généré :
```bash
ls dist/sw.js         # SW Workbox
ls dist/manifest.json # PWA manifest
```

---

## Déploiement Vercel

```bash
# Premier déploiement
vercel

# Déploiement de production
vercel --prod
```

Ajouter la variable d'environnement dans le dashboard Vercel :
- `GROQ_API_KEY` → valeur de votre clé Groq

---

## Structure des fichiers clés

```
index.html          → Point d'entrée SPA — modifier le HTML de navigation ici
vite.config.js      → Configurer vite-plugin-pwa (manifest, SW strategy)
src/main.js         → Init app, routing, breakpoint management
src/store.js        → Toutes les opérations localStorage passent ici
src/currency.js     → Modifier CURRENCIES pour ajouter/retirer une devise
api/ai.js           → Modifier le prompt système et les paramètres Groq ici
```

---

## Ajouter une vue (onglet)

1. Ajouter le HTML dans `index.html` : `<section id="view-newview" class="view">`
2. Ajouter le lien dans `<nav>` : `<a data-view="newview">...`
3. Déclarer la vue dans `main.js → VIEWS = ['dashboard', ..., 'newview']`
4. Créer `src/ui/newview.js` avec la fonction `render(state)`
5. Abonner au store dans `src/ui/index.js` : `store.subscribe('newviewData', render)`

---

## Ajouter une devise

Dans `src/currency.js`, ajouter à `CURRENCIES` :

```js
NZD: { symbol: 'NZ$', decimals: 2, name: 'Dollar néo-zélandais' },
```

S'assurer que `frankfurter.app` supporte la devise (liste : https://frankfurter.app/currencies).

---

## Tester les fonctions pures

Les calculs financiers dans `budget.js`, `transactions.js`, `goals.js` et `currency.js` sont des fonctions pures testables sans navigateur :

```bash
node -e "
import('./src/budget.js').then(({ calcTotalIncomes }) => {
  const budget = { incomes: [{ amountEUR: 2500 }, { amountEUR: 500 }] };
  console.assert(calcTotalIncomes(budget) === 3000, 'FAIL');
  console.log('calcTotalIncomes: OK');
});
"
```

---

## Valider le Constitution Check

Avant toute PR, vérifier manuellement :
- [ ] Aucune nouvelle dépendance npm volumineuse ajoutée
- [ ] Tous les accès `localStorage` passent par `store.js`
- [ ] `font-size: 16px` maintenu dans tous les inputs (inspecter `.fw input`, `select`, `textarea`)
- [ ] Aucune dimension hardcodée en px dans `charts.js`
- [ ] L'historique complet est transmis à `/api/ai` (inspecter le payload réseau)

---

## Variables CSS à ne pas modifier sans mise à jour du plan

```css
/* src/styles/main.css */
--bp-mobile: 768px;    /* breakpoint mobile → tablette */
--bp-tablet: 1200px;   /* breakpoint tablette → desktop */
```

Ces valeurs sont référencées dans `main.js` (matchMedia) ET dans les 3 fichiers layout CSS. Toute modification doit être propagée aux deux endroits.
