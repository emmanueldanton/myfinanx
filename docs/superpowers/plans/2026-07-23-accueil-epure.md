# Accueil épuré (style Sleek) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The visual-polish task (Task 5) invokes the `impeccable` skill per the user's explicit request.

**Goal:** Refondre l'écran d'accueil de MyFinanx en une vue épurée « app bancaire » calquée sur la référence Sleek — grand chiffre « Reste disponible », 3 actions rapides, 2 cartes résumé, transactions récentes — et adapter la navbar (Accueil · Dépenses · Budget · Objectifs · Conseils IA).

**Architecture:** L'app se rend via des modules ES sous `src/`. Les valeurs affichées existent déjà comme calculs purs (`availableEUR`, `totalRevenueEUR`, `totalExpensesEUR`, `calcTotalAllocated`, `getRecent`). Le rendu de l'accueil migre du bloc « overview » de `src/ui/index.js` vers `src/ui/dashboard.js` (`renderDashboard`). Le markup de `#page-overview` et de la navbar est réécrit dans `index.html`. La police passe à Plus Jakarta Sans via variables CSS. Le raffinement visuel final est piloté par le skill `impeccable`.

**Tech Stack:** Vanilla JS (ES2023), Vite 5, CSS variables (3 thèmes), déploiement Vercel.

## Global Constraints

- **Aucun framework de test** dans ce projet. Vérification d'une tâche = pas d'erreur console + contrôle navigateur (Playwright) : rendu, navigation, thèmes, comparaison à la référence Sleek.
- **Décisions de design validées** (verbatim) : Héros = **Reste disponible** = `(revenus mois + revenus ponctuels) − dépenses réelles`. Actions rapides = **Ajouter dépense · Revenu · Objectif**. « Plus »/réglages = **dans l'en-tête**, pas dans la navbar. Navbar = **Accueil · Dépenses · Budget · Objectifs · Conseils IA**.
- **Police** : **Plus Jakarta Sans** partout (poids 400;500;600;700;800), via `--fh`/`--fb`.
- **3 thèmes** (blue, violet, light) préservés — aucune couleur codée en dur, tout via variables CSS de `src/styles/themes.css`.
- **Contraintes constitutionnelles** : `font-size ≥ 16px`, touch targets ≥ 44px, multi-devise via `fmt()`/`toDisplay()`, rendu ciblé via store pub/sub, données 100 % locales.
- **Périmètre** : Accueil + navbar uniquement. Budget/Dépenses/Objectifs inchangés (cycles suivants) — mais ils doivent continuer à fonctionner (leurs pages et rendus restent intacts).
- **Branche** : `feat/accueil-epure` (déjà créée, contient le spec).
- **Une commit atomique par tâche.**

## File Structure

- `index.html` — réécrire le markup de `#page-overview` (L330–446) ; réécrire `.bottom-nav` (L886–913) ; ajouter le bouton réglages + mois dans l'en-tête de l'accueil ; mettre à jour le `<link>` Google Fonts (L88–92).
- `src/styles/main.css` — `--fh`/`--fb` = Plus Jakarta Sans (L8–9).
- `src/ui/dashboard.js` — **nouveau rôle** : `renderDashboard(state)` (calculs héros/delta/budget restant/objectif/récents + peinture DOM).
- `src/ui/index.js` — `renderAll()` délègue l'accueil à `renderDashboard` ; retirer le rendu overview désormais mort (cartes KPI, donut, budget-bars, ov-cards, ov-goals).
- `src/data-bridge.js` — ajouter `getPreviousMonthAvailableEUR(Y, M)` (lecture read-only du mois précédent).
- `src/ui/navigation.js` — adapter navbar (retrait mapping `ai→plus`, `ai` devient un onglet), bouton réglages ouvre le panneau Plus existant.
- `src/styles/components.css` (+ `layout-mobile.css`) — styles de l'accueil épuré (raffinés en Task 5 via `impeccable`).

---

## Task 1: Police Plus Jakarta Sans

**Files:**
- Modify: `index.html` (L88–92, `<link>` Google Fonts)
- Modify: `src/styles/main.css` (L8–9, variables police)

**Interfaces:**
- Consumes: rien.
- Produces: `--fh` et `--fb` = `'Plus Jakarta Sans'` — toute la typo de l'app en hérite.

- [ ] **Step 1: Remplacer le `<link>` Google Fonts dans `index.html`**

Remplacer les lignes L88–92 (preconnect + stylesheet + noscript) par :
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" media="print" onload="this.media='all'" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap"></noscript>
```

- [ ] **Step 2: Mettre à jour les variables police dans `src/styles/main.css`**

Remplacer les lignes 8–9 :
```css
  --fh: 'Plus Jakarta Sans', system-ui, sans-serif;
  --fb: 'Plus Jakarta Sans', system-ui, sans-serif;
```

- [ ] **Step 3: Vérifier au navigateur**

Run: `npm run dev`. Charger l'app. Expected : toute l'app rend en Plus Jakarta Sans (vérifier `getComputedStyle(document.body).fontFamily` contient « Plus Jakarta Sans »), aucune erreur console, aucune régression de mise en page grossière.

- [ ] **Step 4: Commit**

```bash
git add index.html src/styles/main.css
git commit -m "feat: switch app font to Plus Jakarta Sans"
```

---

## Task 2: Markup de l'accueil épuré

**Files:**
- Modify: `index.html` — remplacer le contenu de `#page-overview` (L330–446) par la nouvelle structure. Conserver la balise ouvrante `<div id="page-overview" class="page active">` et la fermante `</div>`.

**Interfaces:**
- Consumes: sera peuplé par `renderDashboard` (Task 4) via les IDs ci-dessous.
- Produces: conteneurs/IDs stables : `#dash-avatar`, `#dash-hello`, `#dash-settings-btn`, `#dash-month`, `#dash-hero-val`, `#dash-hero-delta`, `#dash-budget-rest`, `#dash-budget-gauge`, `#dash-budget-sub`, `#dash-goal-card`, `#dash-recent`.

- [ ] **Step 1: Remplacer le contenu interne de `#page-overview`**

Remplacer tout ce qui est ENTRE `<div id="page-overview" class="page active">` et son `</div>` fermant (actuellement greeting, ov-hero, ov-mid, sources de revenus, récents, objectifs) par :

```html
  <!-- EN-TÊTE ACCUEIL -->
  <header class="dash-head">
    <div class="dash-head-l">
      <div class="dash-avatar" id="dash-avatar"></div>
      <div class="dash-hello" id="dash-hello">Compte principal</div>
    </div>
    <div class="dash-head-r">
      <button class="dash-month" id="dash-month" onclick="openMonthNav()" aria-label="Changer de mois"></button>
      <button class="dash-icon-btn" id="dash-settings-btn" onclick="openPlusPanel()" aria-label="Réglages">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </button>
    </div>
  </header>

  <!-- HÉROS : RESTE DISPONIBLE -->
  <section class="dash-hero">
    <div class="dash-hero-lbl">Reste disponible</div>
    <div class="dash-hero-val" id="dash-hero-val">0</div>
    <div class="dash-hero-delta" id="dash-hero-delta"></div>
  </section>

  <!-- ACTIONS RAPIDES -->
  <section class="dash-actions">
    <button class="dash-act dash-act-primary" onclick="openTxForm('expense')">
      <span class="dash-act-ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
      <span class="dash-act-lbl">Ajouter</span>
    </button>
    <button class="dash-act" onclick="openTxForm('income')">
      <span class="dash-act-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></span>
      <span class="dash-act-lbl">Revenu</span>
    </button>
    <button class="dash-act" onclick="openGoalForm()">
      <span class="dash-act-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span>
      <span class="dash-act-lbl">Objectif</span>
    </button>
  </section>

  <!-- CARTES RÉSUMÉ (scroll horizontal) -->
  <section class="dash-cards">
    <button class="dash-card dash-card-budget" onclick="goTab('budget')">
      <div class="dash-card-hd">Budget restant</div>
      <div class="dash-card-val" id="dash-budget-rest">0</div>
      <div class="pt dash-card-gauge"><div class="pf" id="dash-budget-gauge" style="width:0%"></div></div>
      <div class="dash-card-sub" id="dash-budget-sub">–</div>
    </button>
    <button class="dash-card dash-card-goal" id="dash-goal-card" onclick="goTab('goals')"></button>
  </section>

  <!-- RÉCENTS -->
  <section class="dash-recent-wrap">
    <div class="dash-recent-hd">
      <span>Récents</span>
      <button class="dash-see-all" onclick="goTab('tracker')">Voir tout</button>
    </div>
    <div id="dash-recent"></div>
  </section>
```

- [ ] **Step 2: Vérifier que la page se charge sans casser**

Run: `npm run dev`. L'accueil affiche la structure (valeurs à 0 / vides — le rendu vient en Task 4). Les autres onglets (Budget/Dépenses/Objectifs/IA) fonctionnent toujours. Aucune erreur console fatale (des `onclick` comme `openTxForm`/`openGoalForm`/`openMonthNav` peuvent ne pas encore exister — ils seront câblés en Task 3/4 ; ne pas cliquer encore).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: rewrite Accueil markup to épuré structure"
```

---

## Task 3: Actions & câblage (formulaires + mois)

**Files:**
- Modify: `src/ui/navigation.js` — exposer `openMonthNav()` (ouvre la `.month-nav` existante ou déclenche le sélecteur de mois).
- Modify: `src/ui/transactions-ui.js` — exposer `window.openTxForm(type)` (ouvre le formulaire d'ajout, pré-réglé sur `expense`/`income`).
- Modify: `src/ui/goals-ui.js` — exposer `window.openGoalForm()` (ouvre le formulaire de création d'objectif).

**Interfaces:**
- Consumes: les formulaires/modales existants de transactions et goals.
- Produces: `window.openTxForm`, `window.openGoalForm`, `window.openMonthNav`.

- [ ] **Step 1: Repérer les points d'entrée existants**

Run (Grep): chercher dans `src/ui/transactions-ui.js` la fonction qui bascule le type expense/revenu et affiche le formulaire (ex. `setTxType`, `showTxForm`, un `window.*` déjà exposé) ; idem dans `src/ui/goals-ui.js` (ex. `showGoalForm`, `openGoalModal`) ; et dans `src/ui/index.js`/`navigation.js` pour la navigation de mois (`changeMonth`, `.month-nav`).

- [ ] **Step 2: Exposer `openTxForm(type)`**

Dans `src/ui/transactions-ui.js`, ajouter (et exposer dans `initTransactionsUI`) une fonction qui : bascule le type sur `type`, va sur l'onglet Dépenses (`window.goTab('tracker')`), fait défiler jusqu'au formulaire et met le focus sur le champ description. Réutiliser les fonctions internes existantes repérées au Step 1 (ne pas dupliquer la logique de création). Exposer : `window.openTxForm = openTxForm;`.

- [ ] **Step 3: Exposer `openGoalForm()`**

Dans `src/ui/goals-ui.js`, ajouter/exposer `openGoalForm()` : va sur l'onglet Objectifs et ouvre le formulaire de création existant. `window.openGoalForm = openGoalForm;`.

- [ ] **Step 4: Exposer `openMonthNav()`**

Dans `src/ui/navigation.js`, exposer `openMonthNav()` qui rend visible / fait défiler jusqu'à la `.month-nav` existante (ou déclenche le même mécanisme que le sélecteur de mois actuel). `window.openMonthNav = openMonthNav;` dans `initNavigation`.

- [ ] **Step 5: Vérifier au navigateur**

Run: `npm run dev`. Cliquer chaque action de l'accueil : « Ajouter » → formulaire dépense ; « Revenu » → formulaire revenu ; « Objectif » → formulaire objectif ; le bouton mois → navigation de mois. Aucune erreur console.

- [ ] **Step 6: Commit**

```bash
git add src/ui/transactions-ui.js src/ui/goals-ui.js src/ui/navigation.js
git commit -m "feat: wire Accueil quick actions and month selector"
```

---

## Task 4: Rendu de l'accueil (renderDashboard) + delta mois précédent

**Files:**
- Modify: `src/data-bridge.js` — ajouter `getPreviousMonthAvailableEUR(Y, M)`.
- Modify: `src/ui/dashboard.js` — implémenter `renderDashboard(state)` + `renderRecent`.
- Modify: `src/ui/index.js` — importer et appeler `renderDashboard(state)` dans `renderAll` ; retirer le rendu overview mort (ov-rev/ov-dep/ov-rest/ov-na, donut, budget-bars, ov-cards, ov-goals, alerts `ov-al`).

**Interfaces:**
- Consumes: `calcTotalIncomes`, `calcTotalAllocated` (budget.js) ; `calcTotalExpenses`, `calcTotalPunctualIncomes`, `getRecent` (transactions.js) ; `fmt` (currency.js) ; `catIco`, `esc`, `fmtDate` (utils.js) ; nouveaux IDs du markup Task 2.
- Produces: `renderDashboard(state)` exporté depuis `dashboard.js`.

- [ ] **Step 1: Ajouter `getPreviousMonthAvailableEUR` dans `src/data-bridge.js`**

```js
// Reste disponible (EUR) du mois PRÉCÉDENT, ou null si aucune donnée. Lecture read-only.
export function getPreviousMonthAvailableEUR(Y, M) {
  let pm = M - 1, py = Y;
  if (pm < 0) { pm = 11; py--; }
  let data;
  try { data = JSON.parse(localStorage.getItem(monthKey(py, pm)) || 'null'); } catch (e) { data = null; }
  if (!data) return null;
  const revenus = Array.isArray(data.revenus) ? data.revenus.reduce((s, r) => s + (r.amount ?? 0), 0) : 0;
  const exps = Array.isArray(data.expenses) ? data.expenses : [];
  const punctual = exps.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount ?? 0), 0);
  const spent    = exps.filter(e => e.type !== 'income').reduce((s, e) => s + (e.amount ?? 0), 0);
  return revenus + punctual - spent;
}
```

- [ ] **Step 2: Implémenter `renderDashboard` dans `src/ui/dashboard.js`**

Remplacer le contenu de `src/ui/dashboard.js` par (garder `initDashboard` réexporté) :

```js
import { fmt } from '../currency.js';
import { calcTotalIncomes, calcTotalAllocated } from '../budget.js';
import { calcTotalExpenses, calcTotalPunctualIncomes, getRecent } from '../transactions.js';
import { catIco, esc, fmtDate } from '../utils.js';
import { getPreviousMonthAvailableEUR } from '../data-bridge.js';
import { bridgeLoadPrefs } from '../data-bridge.js';
export { initDashboard } from './index.js';

function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

export function renderDashboard(state) {
  const { budget, transactions, goals, month, year } = state;
  if (!budget) return;

  const revenue   = calcTotalIncomes(budget) + calcTotalPunctualIncomes(transactions);
  const expenses  = calcTotalExpenses(transactions);
  const available = revenue - expenses;
  const allocated = calcTotalAllocated(budget);
  const budgetRest = allocated - expenses;

  // En-tête : prénom si dispo
  const prefs = bridgeLoadPrefs();
  setText('dash-hello', prefs.username ? prefs.username : 'Compte principal');
  const av = document.getElementById('dash-avatar');
  if (av) av.textContent = (prefs.username || 'M').trim().charAt(0).toUpperCase();

  // Mois courant (label court)
  let Y = year ?? new Date().getFullYear(), M = new Date().getMonth();
  if (month) { const p = month.split('-'); Y = parseInt(p[0], 10); M = parseInt(p[1], 10) - 1; }
  const MONTHS_SHORT = ['jan','fév','mar','avr','mai','juin','juil','aoû','sep','oct','nov','déc'];
  setText('dash-month', `${MONTHS_SHORT[M]} ${Y}`);

  // Héros
  const heroEl = document.getElementById('dash-hero-val');
  if (heroEl) {
    heroEl.textContent = (available < 0 ? '−' : '') + fmt(Math.abs(available));
    heroEl.classList.toggle('is-neg', available < 0);
  }

  // Delta vs mois précédent
  const prevAvail = getPreviousMonthAvailableEUR(Y, M);
  const deltaEl = document.getElementById('dash-hero-delta');
  if (deltaEl) {
    if (prevAvail === null) { deltaEl.textContent = ''; deltaEl.className = 'dash-hero-delta'; }
    else {
      const d = available - prevAvail;
      const up = d >= 0;
      deltaEl.className = 'dash-hero-delta ' + (up ? 'is-up' : 'is-down');
      deltaEl.textContent = `${up ? '↗' : '↘'} ${up ? '+' : '−'}${fmt(Math.abs(d))} ce mois-ci`;
    }
  }

  // Carte budget restant
  setText('dash-budget-rest', (budgetRest < 0 ? '−' : '') + fmt(Math.abs(budgetRest)));
  const pct = allocated > 0 ? Math.min(100, Math.round((expenses / allocated) * 100)) : 0;
  const gauge = document.getElementById('dash-budget-gauge');
  if (gauge) { gauge.style.width = pct + '%'; gauge.style.background = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--gold)' : 'var(--pr)'; }
  setText('dash-budget-sub', `${pct}% utilisé sur ${fmt(allocated)}`);

  // Carte objectif prioritaire
  renderGoalCard(goals || []);

  // Récents
  renderRecent(getRecent(transactions, 4));
}

function renderGoalCard(goals) {
  const el = document.getElementById('dash-goal-card');
  if (!el) return;
  if (!goals.length) {
    el.innerHTML = `<div class="dash-card-hd">Objectif</div><div class="dash-goal-empty">Créer un objectif</div>`;
    return;
  }
  const g = goals[0];
  const pct = g.targetEUR > 0 ? Math.min(100, Math.round((g.savedEUR / g.targetEUR) * 100)) : 0;
  el.innerHTML = `
    <div class="dash-card-hd">${esc(g.name)}</div>
    <div class="dash-card-val">${fmt(g.savedEUR ?? 0)}</div>
    <div class="pt dash-card-gauge"><div class="pf" style="width:${pct}%;background:${g.color || 'var(--pr)'}"></div></div>
    <div class="dash-card-sub">${pct}% · objectif ${fmt(g.targetEUR ?? 0)}</div>`;
}

function renderRecent(txs) {
  const el = document.getElementById('dash-recent');
  if (!el) return;
  if (!txs.length) {
    el.innerHTML = `<div class="dash-recent-empty">Aucune transaction ce mois-ci</div>`;
    return;
  }
  el.innerHTML = txs.map(t => {
    const isE = t.type === 'expense';
    const col = isE ? 'var(--red-l)' : 'var(--green)';
    const ibg = isE ? 'rgba(196,58,58,.12)' : 'rgba(52,211,153,.12)';
    return `<div class="dash-recent-row">
      <div class="dash-recent-ico" style="background:${ibg};color:${col}">${catIco(t.category, 15)}</div>
      <div class="dash-recent-info">
        <div class="dash-recent-desc">${esc(t.description || t.category || '')}</div>
        <div class="dash-recent-cat">${esc(t.category || '')} · ${fmtDate(t.date)}</div>
      </div>
      <div class="dash-recent-amt" style="color:${col}">${isE ? '−' : '+'} ${fmt(t.amountEUR ?? 0)}</div>
    </div>`;
  }).join('');
}
```

- [ ] **Step 3: Brancher dans `renderAll` et retirer le rendu overview mort**

Dans `src/ui/index.js` :
- Ajouter en haut : `import { renderDashboard } from './dashboard.js';`
- Dans `renderAll`, après le calcul de `state` (garder les calculs nécessaires aux autres vues comme le donut interne à leurs onglets), appeler `renderDashboard(state)`.
- SUPPRIMER les blocs qui ciblent des IDs désormais absents de l'accueil : `setText('ov-rev'…)`, `ov-rev2`, `ov-dep`, `ov-rest*`, `ov-na*`, `renderDonut(...)`/`renderBudgetProgressBars(...)` **si** elles ne servent qu'à l'accueil (vérifier : si le donut/budget-bars sont aussi utilisés dans les onglets Budget/Dépenses, les garder pour ces vues), `ov-pct-*`, `ov-all`, `ov-cards`, `ov-al`, et l'ancien `renderRecentTransactions` ciblant `#ov-recent-txs`.
- Garder l'alerte `bud-al` (onglet budget) si elle existe encore là-bas.

> Note : ne pas casser les onglets Budget/Dépenses/Objectifs. Si une fonction (ex. `renderDonut`) sert AUSSI à un autre onglet, la conserver. Le but est de retirer uniquement le rendu qui ciblait les éléments supprimés de l'accueil.

- [ ] **Step 4: Vérifier au navigateur**

Run: `npm run dev`. L'accueil affiche : le prénom, le mois, le grand « Reste disponible » (= revenus − dépenses), la pastille de variation (si mois précédent en base), la carte budget restant avec jauge, la carte objectif, les 4 dernières transactions. Changer de mois → chiffres mis à jour. Changer de devise → montants reformatés. Aucune erreur console (`ov-*` supprimés ne sont plus référencés).

- [ ] **Step 5: Commit**

```bash
git add src/data-bridge.js src/ui/dashboard.js src/ui/index.js
git commit -m "feat: render épuré Accueil (reste dispo, delta, budget, goal, recent)"
```

---

## Task 5: Navbar adaptée (Accueil · Dépenses · Budget · Objectifs · Conseils IA)

**Files:**
- Modify: `index.html` — réécrire `.bottom-nav` (L886–913).
- Modify: `src/ui/navigation.js` — retirer le mapping `ai→plus`, faire de `ai` un onglet à part entière ; le panneau « Plus » reste ouvrable via le bouton réglages de l'en-tête (`openPlusPanel`).

**Interfaces:**
- Consumes: `goTabMobile`, `openPlusPanel` (déjà exposés).
- Produces: navbar à 5 onglets réels ; `syncBnavActive` corrigé.

- [ ] **Step 1: Réécrire `.bottom-nav` dans `index.html`**

Remplacer les 5 boutons (overview/budget/tracker/goals/plus) par cet ordre et ces libellés (garder `bnav-pill` et la structure `.bnav-inner`) :
```html
<button class="bnav-btn active" id="bn-overview" onclick="goTabMobile('overview')">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  <span class="bnav-lbl">Accueil</span>
</button>
<button class="bnav-btn" id="bn-tracker" onclick="goTabMobile('tracker')">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  <span class="bnav-lbl">Dépenses</span>
</button>
<button class="bnav-btn" id="bn-budget" onclick="goTabMobile('budget')">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
  <span class="bnav-lbl">Budget</span>
</button>
<button class="bnav-btn" id="bn-goals" onclick="goTabMobile('goals')">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
  <span class="bnav-lbl">Objectifs</span>
</button>
<button class="bnav-btn" id="bn-ai" onclick="goTabMobile('ai')">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  <span class="bnav-lbl">Conseils IA</span>
</button>
```

- [ ] **Step 2: Corriger `syncBnavActive` dans `src/ui/navigation.js`**

Remplacer la ligne `const navId = id === 'ai' ? 'plus' : id;` (L28) par :
```js
  const navId = id;
```
Ainsi l'onglet `ai` active `#bn-ai`. Le panneau « Plus » n'est plus dans la navbar : il reste ouvrable via `openPlusPanel()` (bouton réglages de l'en-tête, câblé en Task 2). Vérifier qu'aucune logique ne dépend encore de `#bn-plus` (sinon adapter `openPlusPanel`/`closePlusPanel` pour ne plus référencer `bn-plus`).

- [ ] **Step 3: Vérifier au navigateur**

Run: `npm run dev`. La navbar montre Accueil · Dépenses · Budget · Objectifs · Conseils IA ; la pilule glisse sous l'onglet actif ; chaque onglet ouvre la bonne page ; le bouton réglages de l'en-tête ouvre le panneau Plus (thème/export/reset/tutoriel) ; sur desktop la navigation reste fonctionnelle. Aucune erreur console.

- [ ] **Step 4: Commit**

```bash
git add index.html src/ui/navigation.js
git commit -m "feat: adapt bottom navbar to 5 real tabs, move Plus to header"
```

---

## Task 6: Raffinement visuel « pixel-proche Sleek » avec le skill impeccable

**Files:**
- Modify: `src/styles/components.css` (+ `src/styles/layout-mobile.css` / `layout-desktop.css` au besoin) — styles des classes `dash-*` introduites en Task 2.

**Interfaces:**
- Consumes: la structure et les IDs `dash-*` ; les variables de thème de `themes.css`.
- Produces: l'accueil rendu fidèle à la référence Sleek dans les 3 thèmes.

- [ ] **Step 1: Invoquer le skill `impeccable`**

Charger le skill `impeccable` et l'utiliser pour crafter le CSS des composants de l'accueil (`.dash-head`, `.dash-avatar`, `.dash-hello`, `.dash-icon-btn`, `.dash-month`, `.dash-hero`, `.dash-hero-val`, `.dash-hero-delta`, `.dash-actions`, `.dash-act`, `.dash-card`, `.dash-card-gauge`, `.dash-recent-row`, etc.), en visant la référence Sleek.

**Cibles visuelles (d'après la référence)** :
- Héros : chiffre très grand (~2.6–3rem), gras (700–800), centré/à gauche selon maquette ; pastille delta = petit badge arrondi, fond vert clair + texte vert (`--green`) si positif, rouge sinon.
- Actions : boutons ronds (~56px), le 1er plein (fond sombre/`--pr` + icône claire), les autres en contour ; libellé en petites majuscules dessous.
- Cartes résumé : cartes arrondies (~20px radius), scroll horizontal (`overflow-x:auto`, snap), jauge fine, ombres douces.
- Récents : lignes aérées, pastille catégorie ronde colorée, montant à droite (rouge/vert), lien « Voir tout » en `--pr`.
- Navbar : icônes + labels, pilule active animée (déjà en place).
- Général : beaucoup de whitespace, radius généreux, respect `font-size ≥ 16px`, touch targets ≥ 44px.

- [ ] **Step 2: Vérification visuelle multi-thème (Playwright)**

Sur `npm run dev`, en viewport mobile (~390px) ET desktop : capturer l'accueil dans les 3 thèmes (blue, violet, light) via `window.setTheme`. Comparer à la référence Sleek. Itérer le CSS jusqu'à ressemblance fidèle. Vérifier : aucun débordement horizontal du body, contrastes lisibles, aucun texte tronqué, aucune erreur console.

- [ ] **Step 3: Vérification fonctionnelle de bout en bout**

Ajouter une dépense, un revenu, un objectif depuis l'accueil → le héros, la carte budget, la carte objectif et les récents se mettent à jour. Changer de mois et de devise → cohérent. Les onglets Budget/Dépenses/Objectifs/IA restent intacts.

- [ ] **Step 4: Commit**

```bash
git add src/styles/
git commit -m "style: polish Accueil to match Sleek reference (impeccable)"
```

---

## Self-Review (effectuée)

**Couverture du spec :**
- Police Plus Jakarta Sans → Task 1. ✅
- En-tête (avatar, hello, réglages, mois) → Task 2 (markup) + Task 3 (câblage) + Task 4 (rendu). ✅
- Héros Reste disponible + delta → Task 2/4. ✅
- Actions rapides (Ajouter/Revenu/Objectif) → Task 2/3. ✅
- Cartes résumé (budget restant, objectif) → Task 2/4. ✅
- Récents + Voir tout → Task 2/4. ✅
- Navbar 5 sections + Plus en en-tête → Task 5 (+ bouton réglages en Task 2). ✅
- 3 thèmes, multi-devise, font-size ≥ 16px → contraintes globales + Task 6. ✅
- Fidélité visuelle Sleek → Task 6 (impeccable). ✅

**Placeholders :** le CSS final est délégué à `impeccable` (Task 6) par demande explicite de l'utilisateur — les cibles visuelles y sont concrètes ; toute la logique (markup, calculs, câblage, navbar) est entièrement spécifiée avec code.

**Cohérence des noms :** IDs `dash-*` définis en Task 2, consommés en Task 4 ; `openTxForm`/`openGoalForm`/`openMonthNav` exposés en Task 3 et référencés par le markup Task 2 ; `getPreviousMonthAvailableEUR` défini en Task 4 Step 1 et consommé Step 2.

**Ordre / dépendances :** Task 3 câble des `onclick` présents dans le markup Task 2 → Task 2 avant Task 3. Task 4 (rendu) après le markup Task 2. Task 5 (navbar) indépendante mais placée avant le polish. Task 6 style en dernier.
