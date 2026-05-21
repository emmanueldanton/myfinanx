---
description: "Task list — MyFinanx PWA"
---

# Tasks: MyFinanx — PWA de Gestion Financière Personnelle

**Input**: Design documents from `specs/001-myfinanx-pwa/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/api-ai.md ✅

> **Note**: L'application existe déjà sous forme monolithique (`myfinanx.html`).
> Les tâches sont organisées en deux grandes phases :
> **Phase A** — Correctifs sur le fichier existant (bugs critiques + conformité spec)
> **Phase B** — Migration vers l'architecture modulaire Vite (plan.md)

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Peut tourner en parallèle (fichiers différents, pas de dépendance)
- **[Story]**: User story concernée (US1–US7)

---

## Phase 1: Setup (Infrastructure partagée)

**Purpose**: Initialiser l'environnement de build Vite et les outils de développement

- [x] T001 Créer `package.json` avec dépendances : `vite`, `vite-plugin-pwa` dans `package.json` à la racine
- [x] T002 Créer `vite.config.js` avec `vite-plugin-pwa` configuré en mode `generateSW`, `manifest.json` référencé, stratégie `CacheFirst` pour assets et `NetworkFirst` pour `/api/*`
- [x] T003 [P] Vérifier et compléter `public/manifest.json` : `name`, `short_name`, `display: standalone`, `start_url`, `icons` 192+512+maskable
- [x] T004 [P] Mettre à jour `vercel.json` : ajouter rewrite `"source": "/(.*)"` → `"/index.html"` pour SPA routing ; supprimer la rewrite `/` → `/myfinanx.html`
- [x] T005 [P] Renommer `myfinanx.html` en `index.html` et mettre à jour toutes les références dans `vercel.json`, `sw.js`, `manifest.json`
- [x] T006 Supprimer `sw.js` manuel — le Service Worker sera généré automatiquement par Vite à chaque build (vite-plugin-pwa)

---

## Phase 2: Foundational — Correctifs bloquants (CRITIQUE)

**Purpose**: Corriger les 4 bugs critiques avant toute autre modification.
**⚠️ CRITIQUE** : Ces corrections doivent être appliquées avant que l'app soit utilisable en production.

**Checkpoint**: Après cette phase, les 4 bugs critiques sont corrigés et l'app est conforme à la spec sur ces points.

### BUG-01 — api/ai.js : historique de conversation ignoré

- [x] T007 Corriger `api/ai.js` : remplacer la signature `{ question, context }` par `{ messages, context }`. Construire le message système depuis `context`, puis transmettre `[systemMessage, ...messages]` à Groq. Retirer la structure à 2 messages actuelles. Fichier : `api/ai.js`
- [x] T008 Corriger `myfinanx.html` : dans la fonction `sendMsg()`, remplacer `body: JSON.stringify({ question:q, context:sys, history })` par `body: JSON.stringify({ messages: [...history, { role:'user', content: q }], context: sys })`. Supprimer le `.slice(-10)` limitant l'historique. Fichier : `myfinanx.html`

### BUG-02 — showPwaPopup() : affiché sur desktop Chrome

- [x] T009 [P] Corriger `showPwaPopup()` dans `myfinanx.html` : ajout de `if (!window.matchMedia('(pointer: coarse)').matches) return;` après les guards standalone. Fichier : `myfinanx.html`

### BUG-03 — importData() : écrasement partiel possible

- [x] T010 [P] Corriger `importData()` dans `myfinanx.html` : validation préalable, écriture atomique dans try/catch avec message d'erreur stockage. Fichier : `myfinanx.html`

### BUG-04 — save() sans gestion QuotaExceededError

- [x] T011 Ajout de `showStorageError()` (toast non-bloquant) + encapsulation de tous les `localStorage.setItem` dans `save()`, `saveAiHistory()`, `setCurrency()`, `setTheme()` avec `catch QuotaExceededError`. Fichier : `myfinanx.html`

---

## Phase 3: User Story 1 — Dashboard & Navigation mensuelle (Priority: P1) 🎯 MVP

**Goal**: Le dashboard affiche tous les KPIs, le donut, les barres, les dernières transactions et les objectifs. La navigation mensuelle fonctionne correctement. Le greeting IA est généré une seule fois par session.

**Independent Test**: Ouvrir l'app avec des données → vérifier les 4 KPIs, le donut, les barres → cliquer mois précédent → vérifier que les objectifs ne rechargent pas.

### Implementation for User Story 1

- [x] T012 [US1] Corriger `fmt()` dans `index.html` : remplacer la logique dynamique `cur.rate >= 100 ? 0 : (cur.rate < 2 ? 2 : 1)` par une lookup table fixe `{ EUR:2, USD:2, GBP:2, CAD:2, MAD:2, XOF:0 }[cur.code] ?? 2`. Fichier : `index.html`
- [x] T013 [US1] Corriger le donut SVG dans `index.html` : retirer les attributs `width="150" height="150"` de `<svg id="donut-svg">`, ajouter un `ResizeObserver` sur `.ov-donut-wrap` qui appelle `resizeDonut(width, height)` avant chaque rendu `renderDonut()`. Fichier : `index.html`
- [x] T014 [US1] Vérifier que `loadMonth()` ne déclenche jamais `loadGoals()` lors de la navigation mensuelle. Dans la fonction de navigation (changement de mois), s'assurer que seules les données budget/dépenses sont rechargées — `D.goals` doit rester inchangé. Fichier : `index.html`
- [x] T015 [P] [US1] Vérifier et corriger le greeting IA : s'assurer que `renderGreeting()` / le debounce 3s est protégé par un flag `sessionStorage.getItem('greetingDone')`. Si le flag est déjà positionné, ne pas relancer l'appel Groq. Fichier : `index.html`
- [x] T016 [P] [US1] Vérifier que les 5 dernières transactions du mois courant sont correctement triées par date décroissante avant affichage dans le dashboard. Fichier : `index.html`

**Checkpoint**: Le dashboard affiche toutes les données correctement, le donut s'adapte au conteneur, le greeting n'est généré qu'une fois par session.

---

## Phase 4: User Story 2 — Gestion du budget mensuel (Priority: P1)

**Goal**: L'utilisateur peut ajouter, modifier, supprimer revenus et postes budgétaires. Les calculs sont corrects en temps réel. La copie automatique du mois précédent fonctionne.

**Independent Test**: Nouveau mois → vérifier la copie auto → ajouter un revenu → vérifier le recalcul immédiat → dépasser le budget → vérifier l'avertissement.

### Implementation for User Story 2

- [x] T017 [US2] Vérifier la fonction de copie du mois précédent (`copyPreviousMonth` ou équivalent) : si le mois courant est vide ET qu'un mois précédent existe, les revenus et postes doivent être copiés automatiquement sans cloner les `id` (générer de nouveaux `id`). Fichier : `index.html`
- [x] T018 [P] [US2] Corriger `fromDisplay()` dans `index.html` : utiliser `Math.round(amount / rate * Math.pow(10, decimals)) / Math.pow(10, decimals)` avec `decimals` issu de la lookup table fixe par devise (même fix que T012). Fichier : `index.html`
- [x] T019 [P] [US2] Vérifier que l'avertissement "budget dépassé" (total alloué > revenus) est affiché de manière non-bloquante (bannière ou badge, pas d'alert/confirm). Fichier : `index.html`

**Checkpoint**: Budget mensuel fonctionnel, calculs corrects, copie automatique opérationnelle.

---

## Phase 5: User Story 3 — Suivi des dépenses et revenus ponctuels (Priority: P1)

**Goal**: Ajout, modification, suppression de transactions. Filtre par catégorie. Graphique de répartition réactif.

**Independent Test**: Ajouter une dépense → vérifier le KPI → ajouter un revenu ponctuel → vérifier qu'il s'additionne sans remplacer les revenus fixes → filtrer → vérifier le filtre.

### Implementation for User Story 3

- [x] T020 [US3] Vérifier que les revenus ponctuels (`type:'income'`) sont bien additionnés aux revenus fixes dans les KPIs (KPI revenus = budget.totalIncomes + totalPunctualIncomes). Ne pas remplacer `D.revenus`. Fichier : `index.html`
- [x] T021 [P] [US3] Vérifier que la modification d'une transaction (`tx-edit-form`) met à jour les KPIs et le graphique de catégories immédiatement après confirmation. Fichier : `index.html`
- [x] T022 [P] [US3] Vérifier que le graphique de catégories (barres dans l'onglet Dépenses) se met à jour à chaque ajout/modification/suppression de transaction. Fichier : `index.html`

**Checkpoint**: Toutes les opérations CRUD sur les transactions fonctionnent et les calculs sont réactifs.

---

## Phase 6: User Story 4 — Objectifs d'épargne (Priority: P2)

**Goal**: CRUD objectifs indépendants du mois. Versements réactifs. Persistance entre sessions.

**Independent Test**: Créer un objectif → naviguer vers un autre mois → revenir → vérifier que l'objectif est intact → effectuer un versement → vérifier la progression.

### Implementation for User Story 4

- [x] T023 [US4] Confirmer que `GOALS_KEY` est indépendant de la clé mensuelle et que `loadGoals()` n'est jamais appelé dans `loadMonth()`. Ajouter un commentaire explicite dans le code si ce n'est pas déjà le cas. Fichier : `index.html`
- [x] T024 [P] [US4] Vérifier que le formulaire d'ajout de versement sur un objectif valide que le montant est > 0 et affiche une erreur inline (pas d'alert) si invalide. Fichier : `index.html`
- [x] T025 [P] [US4] Vérifier que les barres de progression des objectifs dans le dashboard utilisent également ResizeObserver ou des dimensions CSS fluides (pas de px hardcodés). Fichier : `index.html`

**Checkpoint**: Les objectifs persistent correctement, les versements mettent à jour la progression en temps réel.

---

## Phase 7: User Story 5 — Conseiller IA (Priority: P2)

**Goal**: Le chat IA transmet l'intégralité de l'historique à chaque appel. Le contexte financier est injecté automatiquement. L'historique est sauvegardé et rechargé.

**Independent Test**: Envoyer 5 messages → relancer l'app → vérifier que l'historique est restauré → envoyer un 6ème message → inspecter le payload réseau → vérifier que les 5 messages précédents sont dans `messages[]`.

### Implementation for User Story 5

- [x] T026 [US5] Après correction T007 + T008 : tester en inspectant le payload POST `/api/ai` pour confirmer que `messages[]` contient l'intégralité de l'historique (user + assistant alternés) + le message courant. Corriger si nécessaire. Fichier : `api/ai.js` + `index.html`
- [x] T027 [P] [US5] Vérifier que le rôle des messages IA dans `aiHistory` est cohérent : lors de la lecture (`loadAiHistory`), le rôle `'ai'` doit être mappé en `'assistant'` avant transmission à l'API Groq. Fichier : `index.html`
- [x] T028 [P] [US5] Vérifier que le bouton "Effacer la conversation" vide `aiHistory`, supprime `AI_KEY` du localStorage, et réinitialise l'UI du chat (sans rechargement de page). Fichier : `index.html`
- [x] T029 [P] [US5] Ajouter la gestion d'erreur réseau dans `sendMsg()` : si l'API Groq est indisponible (network error ou status 5xx), afficher un message d'erreur dans le chat (pas `alert()`), et réactiver l'input. Fichier : `index.html`

**Checkpoint**: Le conseiller IA transmet l'historique complet, le contexte financier est injecté, l'historique persiste entre sessions.

---

## Phase 8: User Story 6 — Multi-devise, thèmes et personnalisation (Priority: P3)

**Goal**: Les 6 devises fonctionnent avec la précision fixe correcte. Les thèmes persistent. La devise par défaut est correcte.

**Independent Test**: Sélectionner XOF → vérifier 0 décimale → sélectionner MAD → vérifier 2 décimales → changer thème → recharger → vérifier la persistance.

### Implementation for User Story 6

- [x] T030 [US6] Vérifier que `fetchLiveRates()` récupère bien les 5 devises non-EUR depuis `frankfurter.app/latest?base=EUR&symbols=USD,GBP,CAD,MAD` (XOF a un taux fixe 655.96 et n'a pas besoin d'être récupéré — vérifier que le taux XOF dans `CURRENCIES` est bien le taux officiel BCEAO). Fichier : `index.html`
- [x] T031 [P] [US6] Appliquer le fix T012 (précision fixe) à tous les sites d'affichage : revenus rows (`.ra input`), budget rows (`.ba input`), transactions, goals, KPIs. Vérifier via recherche de `toFixed` que tous utilisent la lookup table fixe. Fichier : `index.html`
- [x] T032 [P] [US6] Vérifier que lors du changement de devise, tous les montants affichés se mettent à jour immédiatement via `renderAll()`. Fichier : `index.html`
- [x] T033 [P] [US6] Vérifier que la clé de sauvegarde du thème (`monargent-theme`) et de la devise (`monargent-cur`) sont correctement lues au démarrage dans `init()`. Fichier : `index.html`

**Checkpoint**: Toutes les devises s'affichent avec la précision fixe correcte, les thèmes persistent correctement.

---

## Phase 9: User Story 7 — PWA, export/import et reset (Priority: P3)

**Goal**: L'install prompt s'affiche uniquement sur mobile tactile. L'export/import est fiable. Le reset est sécurisé.

**Independent Test**: Sur desktop Chrome → vérifier que le popup PWA n'apparaît pas → sur mobile → vérifier qu'il apparaît → exporter → réinitialiser → importer → vérifier l'intégrité.

### Implementation for User Story 7

- [x] T034 [US7] Après correction T009 : tester `showPwaPopup()` sur desktop Chrome (pointer:fine) → le popup ne doit pas apparaître. Sur mobile/tablette tactile (pointer:coarse) → le popup doit apparaître après le délai. Fichier : `index.html`
- [x] T035 [P] [US7] Ajouter un flag localStorage `mfx-pwa-popup-dismissed` : si l'utilisateur a cliqué "Plus tard", ne pas réafficher le popup pendant 7 jours. Fichier : `index.html`
- [x] T036 [P] [US7] Après correction T010 : tester `importData()` avec un fichier JSON valide → vérifier l'import complet → tester avec un fichier invalide (JSON malformé, JSON non-objet) → vérifier qu'une erreur s'affiche et que les données existantes sont intactes. Fichier : `index.html`
- [x] T037 [P] [US7] Vérifier que `exportData()` inclut toutes les clés prefixées `monargent` ET `myfinanx` (les deux conventions de nommage coexistent actuellement). Fichier : `index.html`
- [x] T038 [P] [US7] Vérifier que le reset 2 étapes efface bien toutes les clés localStorage (monargent + myfinanx) et sessionStorage, puis recharge correctement. Fichier : `index.html`

**Checkpoint**: PWA install prompt conforme à la spec, export/import fiable et atomique, reset sécurisé.

---

## Phase 10: Architecture Migration — Vers Vite + modules (Post-MVP)

**Purpose**: Migrer depuis le fichier HTML monolithique vers l'architecture modulaire définie dans `plan.md`.
**Dépendance**: Phases 1–9 complètes. Le fichier `index.html` corrigé sert de référence.

- [x] T039 Créer `src/store.js` : extraire toute la logique localStorage de `index.html` avec pattern pub/sub, gestion QuotaExceededError, migration de schéma
- [x] T040 [P] Créer `src/currency.js` : extraire `CURRENCIES`, `toDisplay`, `fromDisplay`, `fetchLiveRates`, lookup table précision fixe
- [x] T041 [P] Créer `src/budget.js` : extraire les fonctions pures de calcul budget (totaux, pourcentages, copie mois précédent)
- [x] T042 [P] Créer `src/transactions.js` : extraire CRUD transactions, catégories, calculs par catégorie
- [x] T043 [P] Créer `src/goals.js` : extraire CRUD objectifs (cycle indépendant)
- [x] T044 [P] Créer `src/ai.js` : extraire chat, historique complet, buildSystemContext, greeting debounce+hash
- [x] T045 [P] Créer `src/theme.js` : extraire setTheme, synchronisation dots
- [x] T046 Créer `src/ui/charts.js` : extraire renderDonut et barres de progression avec ResizeObserver
- [x] T047 [P] Créer `src/ui/index.js` : extraire renderAll, orchestrateur pub/sub
- [x] T048 Créer les fichiers CSS séparés dans `src/styles/` : extraire `layout-mobile.css`, `layout-tablet.css`, `layout-desktop.css`, `components.css`, `themes.css` depuis le `<style>` inline
- [x] T049 Créer `src/main.js` : point d'entrée Vite, import de tous les modules, init, routing, gestion breakpoint actif, source de vérité unique pour la navigation
- [x] T050 Vérifier que le build Vite (`npm run build`) génère `dist/` avec SW auto-versionné et que l'app est fonctionnellement identique à la version monolithique

**Checkpoint**: L'architecture modulaire est en place, le build Vite génère un SW versionné automatiquement.

---

## Phase N: Polish & Cross-cutting Concerns

**Purpose**: Améliorations transversales post-migration

- [ ] TXXX [P] Unifier la navigation en un seul composant HTML (nav + drawer → composant unique transformé par classes CSS breakpoint)
- [ ] TXXX [P] Ajouter `font-size: 16px` explicitement sur `.rn input`, `.ra input`, `.ba input`, `.bn input` pour garantir la conformité iOS même si la règle globale `!important` est retirée
- [ ] TXXX [P] Ajouter `aria-label` sur tous les boutons icon-only (delete, edit, drawer-close) pour accessibilité
- [ ] TXXX [P] Vérifier le contraste WCAG AA du thème `light` sur les textes `var(--muted)` (#737373 sur #ffffff = 4.48:1, juste en-dessous du AA pour les petits textes — vérifier et ajuster si nécessaire)
- [ ] TXXX Valider le quickstart.md : effectuer un `npm install && npm run dev` et vérifier que l'app tourne correctement avec la clé Groq configurée

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Peut commencer immédiatement — pré-requis : avoir Node.js ≥ 18
- **Foundational (Phase 2)**: Indépendante du Setup — corrections directes sur `index.html` et `api/ai.js`
- **User Stories (Phases 3–9)**: Dépendent de la Phase 2 (bugs critiques corrigés d'abord)
  - Phases 3, 4, 5 (P1) : en parallèle une fois Phase 2 terminée
  - Phases 6, 7 (P3) : après Phases 3–5
- **Migration (Phase 10)**: Dépend de toutes les phases précédentes
- **Polish (Phase N)**: Dernière phase

### Parallel Opportunities

- T007 + T009 + T010 + T011 : tous modifient des fonctions différentes — parallélisables
- T012 + T013 + T015 + T016 : parallélisables dans US1
- T039 à T049 (migration modules) : parallélisables par fichier cible

---

## Résumé MVP

**MVP immédiat** (corrections critiques, 1–2 heures) :
1. Phase 2 : corriger BUG-01 (api/ai.js + sendMsg), BUG-02 (showPwaPopup), BUG-03 (importData), BUG-04 (save)
2. T012 : fix précision devise MAD

**MVP complet** (app conforme à la spec) :
- Phases 1–9 complètes

**Architecture cible** :
- Phase 10 (migration Vite + modules)
