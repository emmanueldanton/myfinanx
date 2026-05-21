# Research: MyFinanx PWA

**Branch**: `001-myfinanx-pwa` | **Date**: 2026-05-21
**Status**: Complet — aucun NEEDS CLARIFICATION (toutes décisions fournies par l'utilisateur)

---

## Décision 1 — Stack technique principale

**Decision**: Vanilla JavaScript (ES2023) + Vite 5.x comme bundler. Pas de framework JS.

**Rationale**: Contrainte constitutionnelle (Principe VII). Vanilla JS garantit une taille de bundle minimale, un chargement PWA rapide sur réseau mobile et une absence de risque de migration framework. Vite offre HMR, tree-shaking et intégration native avec vite-plugin-pwa.

**Alternatives considered**:
- React / Vue / Svelte → rejetés (framework lourd, incompatible avec Principe VII)
- HTML/CSS/JS pur sans Vite → rejeté (pas d'optimisation build, pas de PWA plugin automatisé)

---

## Décision 2 — Service Worker et cache versioning

**Decision**: `vite-plugin-pwa` avec Workbox (`generateSW` mode). Cache versionné automatiquement à chaque build Vite via un hash de contenu injecté dans le SW.

**Rationale**: Élimine tout versionnage manuel (exigence spec FR-037). Workbox gère la stratégie `CacheFirst` pour assets statiques et `NetworkFirst` pour les appels API. `vite-plugin-pwa` intègre le manifest et le SW sans configuration complexe.

**Alternatives considered**:
- SW écrit manuellement → rejeté (versionnage manuel interdit par spec)
- Workbox CLI sans Vite → rejeté (pas d'intégration build automatique)

---

## Décision 3 — Store centralisé pub/sub

**Decision**: Store maison (< 50 lignes) dans `store.js` : objet state en mémoire + Map de listeners par clé. Les composants s'abonnent via `store.subscribe(key, fn)`. Les mutations passent par `store.set(key, value)` qui persiste en localStorage et notifie les abonnés.

**Rationale**: Contrainte constitutionnelle (Gouvernance Technique). Évite les re-renders en cascade. Pas de Redux/Zustand (trop lourd). Pattern minimaliste adapté à une app mono-utilisateur sans concurrence.

**Alternatives considered**:
- Redux Toolkit → rejeté (dépendance lourde, Principe VII)
- Context API / Signal → rejeté (lié à un framework)
- Variables globales sans pub/sub → rejeté (pas de gestion des re-renders)

---

## Décision 4 — Graphiques : SVG natif + ResizeObserver

**Decision**: Donut chart et barres de progression implémentés en SVG natif. Dimensions calculées via `ResizeObserver` sur le conteneur parent. Aucune dimension hardcodée en px (exigence spec FR-002, FR-017).

**Rationale**: Contrainte constitutionnelle (Principe VII : micro-bibliothèque < 10 kB ou SVG natif). SVG natif = 0 dépendance. ResizeObserver = réactivité aux changements de layout (redimensionnement fenêtre, changement breakpoint, sidebar ouverte/fermée).

**Alternatives considered**:
- Chart.js → rejeté (trop lourd, ~60 kB gzippé)
- D3.js complet → rejeté (trop lourd, ~80 kB gzippé)
- Dimensions CSS `%` sans ResizeObserver → rejeté (ne gère pas les cas d'initialisation à 0px)

---

## Décision 5 — Endpoint IA : Vercel serverless + Groq

**Decision**: Fonction serverless `api/ai.js` sur Vercel. Modèle : `llama-3.3-70b-versatile` via API Groq. L'historique `messages[]` complet est transmis à chaque appel (exigence spec FR-024). La clé `GROQ_API_KEY` est injectée via variable d'environnement Vercel (jamais exposée au frontend).

**Rationale**: Protection de la clé API (obligatoire). Groq est un provider rapide et économique compatible OpenAI SDK format. La fonction proxy ajoute le contexte financier système avant de relayer vers Groq.

**Alternatives considered**:
- Appel direct Groq depuis le frontend → rejeté (expose la clé API)
- OpenAI GPT-4 → rejeté (coût plus élevé, délai plus long)
- Cloudflare Workers → rejeté (Vercel déjà sélectionné pour le déploiement)

---

## Décision 6 — Multi-devise : précision fixe et pivot EUR

**Decision**: Module `currency.js` avec constante `CURRENCIES` définissant la précision d'affichage par devise :

```
EUR: 2, USD: 2, GBP: 2, CAD: 2, MAD: 2, XOF: 0
```

`fromDisplay(amount, currency)` → converti en EUR, arrondi avec `Math.round(amount / rate * 10^precision) / 10^precision` pour éviter les erreurs de virgule flottante.
`toDisplay(amountEUR, currency)` → converti depuis EUR avec la même précision.

**Rationale**: Exigence spec (FR-028, FR-029) : précision fixe par devise, aucune erreur d'arrondi tolérée. XOF (Franc CFA) n'a pas de centimes → 0 décimale. `Math.round` avec puissance de 10 évite les erreurs IEEE 754.

**Alternatives considered**:
- `toFixed()` seul → rejeté (ne résout pas les erreurs d'arrondi virgule flottante)
- Bibliothèque `decimal.js` → rejeté (dépendance externe, Principe VII)

---

## Décision 7 — Navigation : composant unique + CSS classes

**Decision**: Un seul élément `<nav>` dans `index.html`. Les classes CSS `nav--mobile`, `nav--tablet`, `nav--desktop` sont appliquées par `main.js` via `matchMedia`. Les `@media` queries dans chaque fichier CSS transforment visuellement le composant. L'état actif est géré par une variable `currentView` dans `main.js` (source de vérité unique) propagée via `store.set('currentView', view)`.

**Rationale**: Exigence spec (FR-042, FR-043) : pas de duplication HTML, source de vérité unique pour l'onglet actif. Simplifie les transitions et évite toute désynchronisation entre mobile/tablette/desktop.

**Alternatives considered**:
- 3 composants `<nav>` séparés masqués par display:none → rejeté (duplication HTML, désynchronisation possible)
- Navigation pilotée par URL hash → rejeté (complexité inutile pour une SPA simple)

---

## Décision 8 — Greeting IA : debounce + hash invalidation

**Decision**: `ai.js` expose `maybeRefreshGreeting(financialData)`. À chaque appel :
1. Calcul d'un hash simple (somme des montants clés) sur `financialData`.
2. Comparaison avec `sessionStorage.getItem('greetingHash')`.
3. Si hash identique → pas d'appel API.
4. Si hash différent → debounce 3s → appel Groq → mise à jour greeting → stockage du nouveau hash.
5. Le flag `sessionStorage.getItem('greetingDone')` empêche tout re-déclenchement dans la même session, même si le hash change.

**Rationale**: Exigence spec (FR-006, SC-010) : greeting généré une seule fois par session, non redéclenché par les recalculs. `sessionStorage` (pas `localStorage`) garantit le reset à chaque fermeture d'onglet.

**Alternatives considered**:
- Re-génération à chaque navigation de mois → rejeté (trop d'appels API, spec interdit)
- Cache dans localStorage → rejeté (persiste entre sessions, comportement indésirable)

---

## Décision 9 — Prompt d'installation PWA

**Decision**: Écoute de l'événement `beforeinstallprompt`. Affichage de `showPwaPopup()` uniquement si `window.matchMedia('(pointer: coarse)').matches === true` (appareil tactile = mobile/tablette).

**Rationale**: Exigence spec (FR-038) : le popup ne s'affiche jamais sur desktop Chrome. `pointer: coarse` est le signal le plus fiable pour distinguer mobile de desktop (user-agent peut être truqué, `maxTouchPoints > 0` est moins précis sur certains laptops).

**Alternatives considered**:
- Détection user-agent → rejeté (falsifiable, non standardisé)
- `maxTouchPoints > 0` → rejeté (certains laptops avec écran tactile déclencheraient le popup)

---

## Décision 10 — Déploiement Vercel

**Decision**: `vercel.json` avec rewrite `/*` → `index.html` (SPA routing) + déclaration de la fonction `api/ai.js`. Variables d'environnement Vercel pour `GROQ_API_KEY`. Build command : `vite build`.

**Rationale**: Vercel est le seul hébergeur mentionné. Son support natif des fonctions serverless JS et du déploiement statique correspond parfaitement à l'architecture MyFinanx.

**Alternatives considered**: Aucune (décision utilisateur).
