---
description: "Task list — Migration onglet par onglet : monolithe → architecture modulaire src/"
---

# Tasks: MyFinanx — Migration modulaire (onglet par onglet)

**Input**: Design documents from `specs/001-myfinanx-pwa/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | `index.html` (monolithe corrigé, fonctionnel)

> **Principe de la migration** : l'app reste déployable et fonctionnelle à chaque phase.
> Chaque phase = un module `src/ui/*.js` créé + son code retiré de l'inline `<script>` de `index.html`.
> Les fonctions exposées sur `window.*` maintiennent la compatibilité avec les `onclick` HTML existants.
>
> **Format des données** :
> - Monolithe stocke sous `monargent_YYYY_MM` : `{ revenus:[{id,name,amount}], budget:[{id,name,amount}], expenses:[{id,date,type,desc,cat,amount}] }` + `monargent_goals:[{id,name,target,saved,deadline,color}]`
> - Modules utilisent `mfx_budget:{incomes:[{id,name,amountEUR}], budgetItems:[{id,name,allocatedEUR}]}`, `mfx_transactions:[{id,date,type,description,category,amountEUR}]`, `mfx_goals:[{id,name,targetEUR,savedEUR,deadline,color}]`
> - `src/data-bridge.js` assure la conversion bidirectionnelle sans perte de données.

## Format: `[ID] [P?] [Story?] Description`

---

## Phase 1: Foundation (Prérequis bloquants pour toutes les phases)

**Purpose** : Mettre en place le pont de données entre le format monolithe et le format modulaire, transformer `src/main.js` en vrai orchestrateur, extraire la navigation.

**Checkpoint** : L'app se charge, la navigation fonctionne, les données du mois courant sont disponibles dans le store modulaire — sans toucher à l'UI des onglets.

- [X] T001 Créer `src/utils.js` : exporter `uid()`, `esc(s)`, `todayISO()`, `fmtDate(iso)`, `catIco(cat, size)`, `parseAmt(str)`, ainsi que les constantes `MONTHS`, `CAT_ICONS`, `CAT_COLORS`, `CATS_E`, `CATS_I`, `COLS` — extraits de `index.html` lignes ~2579-2640 et ~3873-3896
- [X] T002 Créer `src/data-bridge.js` : fonctions de conversion bidirectionnelle entre le format localStorage monolithe et le format mfx_* du store modulaire. Exporter : `bridgeLoad(Y, M)` (lit `monargent_${Y}_${MM}` → peuple `mfx_budget` + `mfx_transactions` dans le store), `bridgeSave(Y, M)` (lit le store → écrit `monargent_${Y}_${MM}`), `bridgeLoadGoals()` (lit `monargent_goals` → peuple `mfx_goals`), `bridgeSaveGoals()` (lit le store → écrit `monargent_goals`), `bridgeLoadPrefs()` (lit `monargent-theme`, `monargent-cur`, `monargent-username`, `monargent-usergender`). Mappings : `amount→amountEUR`, `amount→allocatedEUR`, `desc→description`, `cat→category`, `target→targetEUR`, `saved→savedEUR`. Fichier : `src/data-bridge.js`
- [X] T003 Créer `src/ui/navigation.js` : extraire `goTab(id)`, `goTabMobile(id)`, `syncBnavActive(id)`, `openPlusPanel()`, `closePlusPanel()` de `index.html` (lignes ~3009-3057). Ajouter `initNavigation()` qui attache les event listeners. Exposer toutes les fonctions sur `window` (ex: `window.goTab = goTab`). Fichier : `src/ui/navigation.js`
- [X] T004 Réécrire `src/main.js` comme vrai orchestrateur : (1) importer et appliquer le thème via `loadTheme()`, (2) importer et appliquer la devise via `setActiveCurrency()`, (3) init `Y`, `M` = date courante, (4) appeler `bridgeLoad(Y, M)` et `bridgeLoadGoals()` pour peupler le store, (5) importer et appeler `initNavigation()`, (6) exposer `window.changeMonth(d)` qui recalcule Y/M, recharge via bridge et notifie le store, (7) `subscribeAll` → `renderAll`. Fichier : `src/main.js`
- [X] T005 Supprimer de l'inline `<script>` de `index.html` : les fonctions `goTab`, `goTabMobile`, `syncBnavActive`, `openPlusPanel`, `closePlusPanel`, `changeMonth`, et les variables globales `Y`, `M`, `D` (remplacées par le store). Vérifier que la navigation fonctionne toujours via `window.goTab`. Fichier : `index.html`

---

## Phase 2: User Story 1 — Dashboard (Priority: P1) 🎯

**Goal** : Les KPIs, le donut, les barres de progression, les 5 dernières transactions et les objectifs sont rendus par les modules `src/ui/`. Le code correspondant est retiré du monolithe.

**Independent Test** : Supprimer `recalc`, `renderRecentTxs`, `renderBudgetLines` du inline script → vérifier que le dashboard s'affiche correctement via les modules.

### Implementation for User Story 1

- [X] T006 [P] [US1] Mettre à jour `src/ui/index.js` `renderAll(state)` : adapter les accès aux champs de `state` pour utiliser les noms modulaires (`amountEUR`, `allocatedEUR`, `description`, `category`, `targetEUR`, `savedEUR`). Ajouter `month` et `year` dans le state passé par `subscribeAll`. Fichier : `src/ui/index.js`
- [X] T007 [P] [US1] Mettre à jour `src/ui/charts.js` : vérifier que `renderBudgetProgressBars` lit bien `b.allocatedEUR` (et non `b.amount`), et que `renderDonut` reçoit des valeurs en EUR calculées depuis le state modulaire. Fichier : `src/ui/charts.js`
- [X] T008 [US1] Créer `src/ui/dashboard.js` : `renderKPIs(state)` (met à jour les 4 cartes KPI via setText), `renderMonthLabel(Y, M)` (met à jour le label du mois dans le header), `initDashboard()` (appelle `initDonutResizeObserver` depuis `src/ui/charts.js`). Exposer sur window. Fichier : `src/ui/dashboard.js`
- [X] T009 [US1] Nettoyer `index.html` des doublons dashboard — 3 sous-étapes :
  - **A — Inliner `loadMonth()`** : remplacer l'appel `renderAll()` (monolithe) dans `loadMonth()` par les appels directs `document.getElementById('ml').textContent=…; renderRevRows(); renderBudRows(); renderExpenses(); renderGoals(); recalc();` puis supprimer la fonction `renderAll()` monolithe (~lignes 2709+2962–2970). Les onglets Budget/Dépenses/Objectifs continuent de fonctionner.
  - **B — Modifier `recalc()`** : retirer les blocs que la couche modulaire gère déjà — hero cards (`ov-rev`, `ov-dep`, `ov-rest`, `ov-na` + sous-labels), appel `renderDonut()`, appel `renderBudgetLines()`, bloc `ov-cards` (revenue cards), appel `renderRecentTxs()`, blocs progress bar (`ov-pct-b`, `ov-pct-l`, `ov-all`). **Garder** : budget footer (`rev-tot`, `bud-tot`, `bud-reste`, `.bp3`), tracker KPIs (`tr-b`, `updateTracker()`), alertes (`bud-al`, `ov-al`), `scheduleAiGreeting()`.
  - **C — Supprimer fonctions standalone** : `_lastDonutArgs`, `_donutObserver`, `initDonutResizeObserver()` (+ son appel dans `init()` ligne ~2948), `renderDonut()` (~48 lignes), `renderBudgetLines()` (~28 lignes), `renderRecentTxs()` (~32 lignes).
  - **Vérification** : build OK, dashboard affiche KPIs/donut/budget lines/recent txs via modules — pas de double rendu. Fichier : `index.html`

**Checkpoint** : Dashboard entièrement rendu par les modules src/ui/. Aucune régression sur les 4 KPIs, donut, barres et transactions récentes.

---

## Phase 3: User Story 2 — Budget (Priority: P1)

**Goal** : L'onglet Budget (revenus + postes) est entièrement géré par `src/ui/budget-ui.js`.

**Independent Test** : Ajouter un revenu → vérifier que `renderRevRows` est appelé depuis le module et que `bridgeSave` persiste en localStorage.

### Implementation for User Story 2

- [X] T010 [US2] Créer `src/ui/budget-ui.js` : `renderRevRows(state)`, `renderBudRows(state)`, `addRev()`, `delRev(id)`, `addBud()`, `delBud(id)`, `updateBudIcon(id, name)`. Chaque mutation appelle `store.set('mfx_budget', ...)` puis `bridgeSave(Y, M)`. Exposer sur window. Fichier : `src/ui/budget-ui.js`
- [X] T011 [US2] Mettre à jour `src/main.js` : importer `src/ui/budget-ui.js`, appeler `renderRevRows` et `renderBudRows` depuis `subscribeAll`. Fichier : `src/main.js`
- [X] T012 [US2] Supprimer de l'inline `<script>` de `index.html` : `renderRevRows`, `renderBudRows`, `delRev`, `addRev`, `addBud`, `delBud`, `updateBudIcon`. Vérifier CRUD budget fonctionnel. Fichier : `index.html`

**Checkpoint** : Onglet Budget entièrement géré par les modules. Copie auto du mois précédent fonctionnelle.

---

## Phase 4: User Story 3 — Dépenses (Priority: P1)

**Goal** : L'onglet Dépenses (liste transactions + graphique catégories) est géré par `src/ui/transactions-ui.js`.

**Independent Test** : Ajouter une dépense → filtrer par catégorie → modifier → supprimer → vérifier que tout fonctionne depuis le module.

### Implementation for User Story 3

- [X] T013 [US3] Créer `src/ui/transactions-ui.js` : `renderExpenses(state)`, `renderCatBk(expenses)`, `updateTracker(state)`, `addTx()`, `delTx(id)`, `openEditTx(id)`, `closeEditTx(id)`, `saveEditTx(id)`, `setTxType(t)`, `updateCatSel()`. Chaque mutation appelle `store.set('mfx_transactions', ...)` puis `bridgeSave(Y, M)`. Exposer sur window. Fichier : `src/ui/transactions-ui.js`
- [X] T014 [US3] Mettre à jour `src/main.js` : importer `src/ui/transactions-ui.js`, brancher sur `subscribeAll`. Fichier : `src/main.js`
- [X] T015 [US3] Supprimer de l'inline `<script>` de `index.html` : `renderExpenses`, `renderCatBk`, `updateTracker`, `addTx`, `delTx`, `openEditTx`, `closeEditTx`, `saveEditTx`, `setTxType`, `updateCatSel`. Vérifier CRUD transactions fonctionnel. Fichier : `index.html`

**Checkpoint** : Onglet Dépenses entièrement modulaire. Filtres, édition et graphique catégories opérationnels.

---

## Phase 5: User Story 4 — Objectifs (Priority: P2)

**Goal** : L'onglet Objectifs est géré par `src/ui/goals-ui.js`, indépendamment du cycle mensuel.

**Independent Test** : Créer un objectif → naviguer vers un autre mois → revenir → vérifier que l'objectif est intact et que `bridgeLoadGoals` n'est pas ré-appelé lors de la navigation.

### Implementation for User Story 4

- [X] T016 [US4] Créer `src/ui/goals-ui.js` : `renderGoals(state)`, `buildGoalCard(g, prefix)`, `addGoal()`, `delGoal(id)`, `addToGoal(id, prefix)` (valide montant > 0, erreur inline), `toggleEditGoal(id, prefix)`, `saveEditGoal(id, prefix)`, `selC(el)`. Chaque mutation appelle `store.set('mfx_goals', ...)` puis `bridgeSaveGoals()`. Exposer sur window. Fichier : `src/ui/goals-ui.js`
- [X] T017 [US4] Mettre à jour `src/main.js` : importer `src/ui/goals-ui.js`. Les objectifs sont chargés UNE SEULE FOIS via `bridgeLoadGoals()` dans `init()`, jamais lors de `changeMonth()`. Fichier : `src/main.js`
- [X] T018 [US4] Supprimer de l'inline `<script>` de `index.html` : `renderGoals`, `buildGoalCard`, `addGoal`, `delGoal`, `addToGoal`, `toggleEditGoal`, `saveEditGoal`, `selC`. Vérifier indépendance objectifs/mois. Fichier : `index.html`

**Checkpoint** : Objectifs persistants, versements réactifs, indépendants du cycle mensuel.

---

## Phase 6: User Story 5 — Conseiller IA (Priority: P2)

**Goal** : L'onglet Conseiller IA est géré par `src/ui/ai-chat-ui.js`, avec l'intégralité de l'historique transmis à chaque appel.

**Independent Test** : Envoyer 5 messages → recharger → vérifier que l'historique est restauré → inspecter le payload réseau → vérifier que `messages[]` contient tous les échanges précédents.

### Implementation for User Story 5

- [X] T019 [US5] Créer `src/ui/ai-chat-ui.js` : `renderAiMsg(role, text)`, `loadAiHistory()` (lit `monargent_ai_chat`, restaure l'UI), `saveAiHistory()` (écrit `monargent_ai_chat`), `clearAiHistory()`, `sendAI()` (construit `messages[]` complet incluant l'historique, sans limite, rôle `'ai'` → `'assistant'`), `typeWriter(el, text, speed)`. Exposer sur window. Fichier : `src/ui/ai-chat-ui.js`
- [X] T020 [US5] Mettre à jour `src/main.js` : importer `src/ui/ai-chat-ui.js`, appeler `loadAiHistory()` lors de l'init. Fichier : `src/main.js`
- [X] T021 [US5] Supprimer de l'inline `<script>` de `index.html` : `renderAiMsg`, `loadAiHistory`, `saveAiHistory`, `clearAiHistory`, `sendAI`, `typeWriter`, `AI_WELCOME`, `BOT_AV_SVG`. Vérifier que le chat IA fonctionne. Fichier : `index.html`

**Checkpoint** : Chat IA fonctionnel, historique complet transmis, persistance entre sessions.

---

## Phase 7: User Story 6 — Salutation IA & Rappels (Priority: P2)

**Goal** : Le greeting contextuel du dashboard et les rappels in-app sont extraits en modules dédiés.

### Implementation for User Story 6

- [X] T022 [P] [US6] Créer `src/ui/greeting.js` : `renderGreeting(state)` (affiche le prénom + accord genré), `scheduleAiGreeting(state)` (une seule fois par session via `sessionStorage.greetingDone`, debounce 3s, invalidation par hash des données financières), `greetDataHash(state)`, `fetchAiGreetingSub(state)` (appel POST `/api/ai` avec context financier structuré). Exposer sur window. Fichier : `src/ui/greeting.js`
- [X] T023 [P] [US6] Créer `src/ui/reminders.js` : `checkReminder(state)` (1 fois/jour max, `monargent-reminder-seen`), `showReminder(type, txt)`, `closeReminder()`. Exposer sur window. Fichier : `src/ui/reminders.js`
- [X] T024 [US6] Mettre à jour `src/main.js` : importer greeting.js et reminders.js, les appeler depuis subscribeAll après renderAll. Fichier : `src/main.js`
- [X] T025 [US6] Supprimer de l'inline `<script>` de `index.html` : `renderGreeting`, `scheduleAiGreeting`, `greetDataHash`, `fetchAiGreetingSub`, `greetFinancialSub`, `checkReminder`, `showReminder`, `closeReminder`, `GREETING_CACHE_KEY`, `_greetAiTimer`. Vérifier greeting et rappels opérationnels. Fichier : `index.html`

**Checkpoint** : Greeting généré une seule fois par session, rappels affichés une fois par jour.

---

## Phase 8: User Story 7 — Réglages, Données & PWA (Priority: P3)

**Goal** : Devise, thème, export/import/reset et PWA popup sont gérés par des modules dédiés.

### Implementation for User Story 7

- [X] T026 [P] [US7] Créer `src/ui/settings-ui.js` : `toggleCurDrop()`, `setCurrency(code)` (met à jour `activeCur`, appelle `bridgeSave`, `renderAll`), `showGenderPick()`, `editGreetName()`, `toggleDrawer(open)`, `applyRates(rates)` (met à jour les taux dans CURRENCIES). Exposer sur window. Fichier : `src/ui/settings-ui.js`
- [X] T027 [P] [US7] Créer `src/ui/data-management-ui.js` : `exportData()`, `importData(file)` (atomique, valide les préfixes `monargent`, `myfinanx`, `mfx`), `openResetModal()`, `closeResetModal()`, `resetStep2()`, `confirmReset()` (efface toutes les clés + sessionStorage + recharge). `showStorageError()` (toast non-bloquant pour `QuotaExceededError`). Exposer sur window. Fichier : `src/ui/data-management-ui.js`
- [X] T028 [P] [US7] Créer `src/ui/pwa-ui.js` : `showPwaPopup()` (uniquement si `pointer:coarse`, pas en standalone, cooldown 7 jours via `mfx-pwa-popup-dismissed`), `closePwaPopup()`, `pwaOverlayClick(e)`, `pwaTab(os)`. Exposer sur window. Fichier : `src/ui/pwa-ui.js`
- [X] T029 [US7] Mettre à jour `src/main.js` : importer settings-ui, data-management-ui, pwa-ui. Appeler `showPwaPopup()` dans init avec délai. Fichier : `src/main.js`
- [X] T030 [US7] Supprimer de l'inline `<script>` de `index.html` : `toggleCurDrop`, `setCurrency`, `applyRates`, `showGenderPick`, `editGreetName`, `toggleDrawer`, `exportData`, `importData`, `openResetModal`, `closeResetModal`, `resetStep2`, `confirmReset`, `showStorageError`, `showPwaPopup`, `closePwaPopup`, `pwaOverlayClick`, `pwaTab`, `save`, `loadGoals`, `loadMonth`, `findPreviousMonthData`, `defaultData`, `key`, ainsi que les constantes `GOALS_KEY`, `AI_KEY`, `USER_KEY`, `GENDER_KEY`, `CURRENCIES`, `THEMES`, `CURRENCY_DECIMALS`, `MONTHS` et les fonctions `fmt`, `fmtInput`, `fromDisplay`, `toDisplay`, `getCur`, `parseAmt`. Vérifier toutes les fonctionnalités. Fichier : `index.html`

**Checkpoint** : Export/import fonctionnel, reset efface correctement tout y compris `myfinanx-tuto-done`, devise et thème persistés.

---

## Phase 9: Tutoriel — Réécriture propre (Priority: P1)

**Goal** : Le tutoriel est réécrit proprement dans `src/ui/tutorial.js` avec touch targets ≥ 44px, CSS responsive, keyboard nav, safe area iOS. L'ancien onboarding (`ob-overlay`) est supprimé.

**Independent Test** : Supprimer `myfinanx-tuto-done` → recharger → le tutoriel s'affiche automatiquement → naviguer toutes les 6 slides → fermer → recharger → ne s'affiche plus → cliquer `?` → s'ouvre → faire un reset → recharger → s'affiche à nouveau.

### Implementation for User Story — Tutorial

- [X] T031 Créer `src/styles/tutorial.css` : styles `.tuto-overlay`, `.tuto-card`, `.tuto-prog`, `.tuto-slide`, `.tuto-ico`, `.tuto-title`, `.tuto-body`, `.tuto-dots`, `.tuto-dot` (touch target ≥ 44px via `padding: 18px 10px; box-sizing: content-box`), `.tuto-skip` (min-height: 44px), `.tuto-next` (min-height: 44px). Ajouter `@media (max-width: 480px)` qui réduit le padding `.tuto-card` à `20px 16px 16px` et ajoute `padding-bottom: max(16px, env(safe-area-inset-bottom))`. Z-index: 2000 pour passer au-dessus de toute navigation. Importer dans `src/main.js`. Fichier : `src/styles/tutorial.css`
- [X] T032 Créer `src/ui/tutorial.js` : `openTuto(idx = 0)`, `closeTuto()` (sauvegarde `myfinanx-tuto-done`, retire event listener clavier), `tutoNext()`, `tutoGo(idx)`, `_tutoRender()` (met à jour slides, dots, boutons Suivant/Passer/C'est parti), `_tutoKey(e)` (←→ Enter Escape), `tutoBackdrop(e)`, `maybeShowTuto()` (vérifie `myfinanx-tuto-done`, déclenche après 600ms). Constantes `TUTO_KEY = 'myfinanx-tuto-done'`, `TUTO_TOTAL = 6`. Exposer toutes les fonctions sur window. Fichier : `src/ui/tutorial.js`
- [X] T033 Mettre à jour `src/main.js` : importer `src/styles/tutorial.css` et `src/ui/tutorial.js`, appeler `maybeShowTuto()` dans init. Fichier : `src/main.js`
- [X] T034 Supprimer de l'inline `<script>` de `index.html` : `openTuto`, `closeTuto`, `tutoNext`, `tutoGo`, `_tutoKey`, `_tutoRender`, `tutoBackdrop`, `maybeShowTuto`, `TUTO_KEY`, `TUTO_TOTAL`, `_tutoIdx`, ainsi que les fonctions de l'ancien onboarding : `openTutorial`, `closeTutorial`, `showOnboarding`, `obNext`, `launchConfetti`, `obStep`, `OB_TOTAL`. Fichier : `index.html`
- [X] T035 Supprimer de `index.html` : le HTML de l'ancien onboarding (`<div class="pwa-overlay" id="ob-overlay">` et tout son contenu — 7 étapes ob-s0 à ob-s6). Supprimer aussi tous les styles CSS `.ob-*`. Conserver uniquement le HTML du nouveau tutoriel (`<div class="tuto-overlay" id="tuto-overlay">`) et retirer ses styles inline (déjà dans tutorial.css). Fichier : `index.html`

**Checkpoint** : Tutoriel propre, responsive, touch-compliant, sans duplication de code.

---

## Phase 10: Finalisation — Nettoyage complet

**Purpose** : Retirer le `<script>` inline résiduel et les styles inline de `index.html`. L'app tourne entièrement depuis `src/`.

- [X] T036 Retirer le bloc `<style>` inline de `index.html` (CSS now in `src/styles/*.css`). Vérifier que Vite injecte bien les CSS via `src/main.js`. Fichier : `index.html`
- [X] T037 Retirer tout code résiduel du bloc `<script>` inline de `index.html` : fonctions utilitaires (`uid`, `esc`, `setText`, `setText2`, `todayISO`, `fmtDate`), constantes (`CAT_ICONS`, `CAT_COLORS`, `CATS_E`, `CATS_I`, `COLS`, `catIco`), état global (`txType`, `gColor`), init(), tout le reste non encore retiré. Fichier : `index.html`
- [X] T038 [P] Supprimer `<script>` et style liés à l'ancien onboarding dans index.html (si pas déjà fait en T035). Supprimer `showOnboarding`, le code confetti (`launchConfetti`), `AD_SEEN_KEY`, `loadAd`, `showAd`, `closeAd` s'ils existent encore. Fichier : `index.html`
- [X] T039 Vérifier `npm run build` : le build doit réussir sans erreur, générer `dist/sw.js` versionné automatiquement, et les assets bundlés doivent inclure tous les modules src/. Fichier : `vite.config.js` + root
- [X] T040 [P] Mettre à jour `src/styles/main.css` : ajouter les variables CSS globales manquantes (`--r2`, `--r3`, `--fh` si pas encore présentes), vérifier que `font-size: 16px !important` couvre tous les inputs y compris dans `.fw`, `.rn`, `.ra`, `.bn`, `.ba`. Fichier : `src/styles/main.css`

**Checkpoint** : `index.html` ne contient plus que du HTML pur. `src/main.js` est le seul point d'entrée JavaScript. Le build Vite réussit.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundation)** : Prérequis absolu — bloque toutes les autres phases
- **Phases 2–8 (User Stories)** : Dépendent de Phase 1. Peuvent être exécutées dans l'ordre mais l'app reste fonctionnelle à chaque étape
- **Phase 9 (Tutorial)** : Peut démarrer après Phase 1 — indépendante des autres onglets. Recommandé après Phase 7 (reset doit effacer `myfinanx-tuto-done`)
- **Phase 10 (Finalisation)** : Après toutes les phases précédentes

### Parallel Opportunities

- T001 + T003 : parallélisables (fichiers différents)
- T006 + T007 : parallélisables
- T022 + T023 : parallélisables
- T026 + T027 + T028 : parallélisables
- T031 + T032 : parallélisables

---

## Résumé MVP

**Priorité immédiate** (app modulaire fonctionnelle) :
1. Phase 1 : Foundation (T001–T005) — bloquant
2. Phase 2 : Dashboard (T006–T009)
3. Phase 9 : Tutoriel (T031–T035) — l'urgence initiale

**Complet** : Phases 3–8 + Phase 10
