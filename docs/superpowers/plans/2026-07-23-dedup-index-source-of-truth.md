# Dégraissage d'`index.html` vers `src/` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire de `src/` la seule source de vérité en retirant d'`index.html` le CSS et le JS morts redondants, sans aucun changement de comportement visible.

**Architecture:** L'app tourne déjà sur les modules ES de `src/` (chargés via `<script type="module" src="/src/main.js">`). `index.html` contient deux gros blocs hérités redondants — un `<style>` (L93–1592) dupliquant `src/styles/*`, et un `<script>` (L2491–2738) dupliquant `src/utils.js` + `src/ui/navigation.js`. On migre d'abord les 3 orphelins vivants cachés dans le bloc `<script>` (système de pub, enregistrement Service Worker, `loadAd()`), puis on supprime les blocs redondants, de façon incrémentale et vérifiée.

**Tech Stack:** Vanilla JS (ES2023), Vite 5.x, vite-plugin-pwa (Workbox), déploiement statique Vercel.

## Global Constraints

- **Aucun framework de test** dans ce projet. La « vérification » d'une tâche = build sans erreur + contrôle navigateur (comparaison visuelle vs baseline + test fonctionnel + console propre). Pas de `pytest`/`vitest` à écrire.
- **Zéro changement de comportement visible** : mêmes 5 vues (Vue globale, Budget, Dépenses, Objectifs, Conseiller IA), même navigation, mêmes pubs, mêmes 3 thèmes (blue, violet, light), offline PWA fonctionnel, aucun FOUC.
- **`font-size ≥ 16px`** partout (contrainte constitutionnelle — ne pas réintroduire de style qui la casse).
- **Une commit atomique par tâche.** Jamais deux suppressions non vérifiées d'affilée.
- **Branche dédiée** `refactor/dedup-index` (déjà créée, contient le spec).
- Scripts inline **à conserver** dans `index.html` : anti-FOUC thème (L6) et loader OneSignal (L48–72). Ne pas y toucher.
- Le DOM `#ad-overlay` (L~2473–2481) est du **markup** : il reste dans `index.html`, seule sa logique JS est migrée.

---

## File Structure

- `index.html` — retrait des deux blocs inline (net attendu : −~1700 lignes). Le markup des vues et les overlays restent.
- `src/ui/ads.js` — **nouveau** : système de pub migré (`loadAd`, `showAd`, `closeAd`, constantes `AD_*`, exposé via `initAds()`).
- `src/pwa-register.js` — **nouveau** (ou suppression pure si vite-plugin-pwa couvre) : enregistrement Service Worker migré/vérifié.
- `src/main.js` — appel de `initAds()` dans la séquence d'init.
- `src/styles/*.css` — éventuels sélecteurs orphelins portés depuis l'inline (Task 5, si le diff en révèle).

---

## Task 1: Filet de sécurité & baseline

**Files:**
- Aucune modification de code. Artefacts de référence uniquement (scratchpad).

**Interfaces:**
- Consumes: rien.
- Produces: dossier de screenshots baseline servant de référence visuelle aux Tasks 2–6.

- [ ] **Step 1: Vérifier la branche**

Run: `git branch --show-current`
Expected: `refactor/dedup-index`

- [ ] **Step 2: Lancer le serveur de dev**

Run: `npm run dev`
Expected: Vite démarre, affiche une URL locale (ex. `http://localhost:5173`), aucune erreur.

- [ ] **Step 3: Capturer la baseline visuelle**

Dans le navigateur, ouvrir l'URL locale. Pour **chacune** des 5 vues (Vue globale, Budget, Dépenses, Objectifs, Conseiller IA), en **mobile** (DevTools responsive ~390px) **et desktop** (~1280px), prendre un screenshot. Enregistrer sous :
`<scratchpad>/baseline/<vue>-<mobile|desktop>.png`

Répéter la vue globale pour les **3 thèmes** (blue, violet, light) via le sélecteur de thème → `overview-<theme>.png`.

- [ ] **Step 4: Noter l'état des pubs et de l'offline**

Dans la console navigateur, exécuter pour forcer la pub au prochain chargement :
```js
localStorage.removeItem('myfinanx-ad-last'); sessionStorage.removeItem('myfinanx-ad-last');
```
Recharger, confirmer que l'overlay de pub s'affiche (après le délai), puis le fermer. Noter « pub OK ». Vérifier dans DevTools > Application > Service Workers qu'un SW est bien enregistré. Noter « SW OK ».

- [ ] **Step 5: Commit (checkpoint, pas de code)**

Aucune modif de code à committer. Ce checkpoint sert juste à valider que la baseline est capturée avant toute suppression. Passer à la Task 2.

---

## Task 2: Migrer le système de pub vers `src/ui/ads.js`

**Files:**
- Create: `src/ui/ads.js`
- Modify: `src/main.js` (ajout d'un import + appel `initAds()`)
- Modify: `index.html` (retrait **uniquement** des lignes pub du bloc inline — fait en Task 4 ; ici on n'ajoute que le module, sans encore supprimer l'inline)

**Interfaces:**
- Consumes: le DOM `#ad-overlay`, `#ad-img-wrap`, `#ad-title`, `#ad-txt`, `#ad-cta` (déjà dans `index.html`) ; le fichier `/ads.json`.
- Produces: `initAds()` (appelé depuis `main.js`), `window.closeAd` (pour le `onclick="closeAd()"` du DOM).

- [ ] **Step 1: Créer `src/ui/ads.js` avec le code exact migré**

```js
// src/ui/ads.js — système de publicités (migré depuis l'inline d'index.html)
const AD_SEEN_KEY = 'myfinanx-ad-last';

// Durées en millisecondes par fréquence
const AD_FREQ_MS = {
  'always'  : 0,
  'session' : null,          // géré via sessionStorage
  'hourly'  : 60 * 60 * 1000,
  'daily'   : 24 * 60 * 60 * 1000,
  '3days'   : 3 * 24 * 60 * 60 * 1000,
  'weekly'  : 7 * 24 * 60 * 60 * 1000,
};

async function loadAd() {
  try {
    const res = await fetch('/ads.json?v=' + Date.now());
    const data = await res.json();
    if (!data.enabled || !data.ads || !data.ads.length) return;

    const freq = data.frequency || 'daily';

    if (freq === 'session') {
      if (sessionStorage.getItem(AD_SEEN_KEY)) return;
    } else if (freq !== 'always') {
      const ms = AD_FREQ_MS[freq];
      if (ms !== undefined) {
        const last = parseInt(localStorage.getItem(AD_SEEN_KEY) || '0', 10);
        if (Date.now() - last < ms) return;
      }
    }

    const ad = data.ads[Math.floor(Math.random() * data.ads.length)];
    const delay = data.delay || 4000;
    setTimeout(() => showAd(ad), delay);
  } catch (e) {}
}

function showAd(ad) {
  const imgWrap = document.getElementById('ad-img-wrap');
  if (ad.img) {
    const img = document.createElement('img');
    img.className = 'ad-img';
    img.src = ad.img;
    img.alt = ad.title || '';
    imgWrap.appendChild(img);
  } else {
    imgWrap.innerHTML = '<div class="ad-img-placeholder">Publicité</div>';
  }
  document.getElementById('ad-title').textContent = ad.title || '';
  document.getElementById('ad-txt').textContent   = ad.body  || '';
  const cta = document.getElementById('ad-cta');
  cta.textContent = ad.cta || 'Voir';
  cta.href = ad.url || '#';
  document.getElementById('ad-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  sessionStorage.setItem(AD_SEEN_KEY, '1');
  localStorage.setItem(AD_SEEN_KEY, Date.now().toString());
}

function closeAd() {
  document.getElementById('ad-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

export function initAds() {
  window.closeAd = closeAd;   // pour onclick="closeAd()" dans le DOM
  loadAd();
}
```

- [ ] **Step 2: Câbler `initAds()` dans `src/main.js`**

Ajouter l'import en haut de `src/main.js`, à côté des autres imports `./ui/*` (après la ligne `import { initToast } from './ui/toast.js';`) :
```js
import { initAds } from './ui/ads.js';
```
Puis, dans la fonction d'init (juste après `initPwaUI();`, autour de `src/main.js:169`), ajouter :
```js
  // Wire ads module (exposes window.closeAd, triggers loadAd on init)
  initAds();
```

- [ ] **Step 3: Neutraliser temporairement le doublon inline pour éviter la double pub**

Dans `index.html`, commenter **uniquement** l'appel `loadAd();` (ligne ~2709) pour que la pub ne se déclenche pas deux fois pendant la transition :
```js
// loadAd();  // migré → src/ui/ads.js (bloc inline supprimé en Task 4)
```
Ne pas encore toucher au reste du bloc inline.

- [ ] **Step 4: Vérifier que la pub fonctionne via le module**

Run: `npm run dev` (si arrêté)
Dans le navigateur : forcer la pub via la console —
```js
localStorage.removeItem('myfinanx-ad-last'); sessionStorage.removeItem('myfinanx-ad-last');
```
Recharger. Expected : l'overlay de pub s'affiche **une seule fois** après le délai ; le bouton « Ignorer »/✕ ferme l'overlay ; aucune erreur console (`showAd`/`closeAd` proviennent désormais de `ads.js`).

- [ ] **Step 5: Commit**

```bash
git add src/ui/ads.js src/main.js index.html
git commit -m "refactor: migrate ad system to src/ui/ads.js"
```

---

## Task 3: Traiter l'enregistrement Service Worker

**Files:**
- Modify: `index.html` (neutraliser le bloc d'enregistrement SW manuel, L~2713–2735)

**Interfaces:**
- Consumes: le SW généré par `vite-plugin-pwa` (`registerType: 'autoUpdate'`, `strategies: 'generateSW'`).
- Produces: rien de nouveau exposé — on s'appuie sur l'auto-injection de vite-plugin-pwa.

**Contexte:** `vite.config.js` configure `VitePWA({ registerType: 'autoUpdate', strategies: 'generateSW' })`. Avec `injectRegister: 'auto'` (défaut), vite-plugin-pwa **injecte lui-même** le script d'enregistrement du SW au build et gère la mise à jour automatique. Le bloc manuel d'`index.html` fait donc double emploi dans l'app buildée. On le retire et on **vérifie** que l'auto-enregistrement couvre le comportement (enregistrement + mise à jour).

- [ ] **Step 1: Neutraliser le bloc SW manuel dans `index.html`**

Repérer le bloc `if('serviceWorker' in navigator){ ... }` (L~2713–2735) à l'intérieur du `<script>` inline et le commenter entièrement :
```js
/* Enregistrement SW manuel retiré — vite-plugin-pwa (registerType: 'autoUpdate')
   injecte et gère l'enregistrement automatiquement. Voir vite.config.js.
if('serviceWorker' in navigator) {
  ... (bloc d'origine) ...
}
*/
```

- [ ] **Step 2: Builder et prévisualiser**

Run: `npm run build && npm run preview`
Expected : build sans erreur ; `dist/` contient `sw.js` (ou l'équivalent généré) et le registre auto-injecté.

- [ ] **Step 3: Vérifier l'enregistrement et l'offline**

Ouvrir l'URL de preview. Dans DevTools > Application > Service Workers : un SW est **actif**. Dans l'onglet Network, passer « Offline » et recharger : l'app se charge toujours (coquille + assets en cache). Expected : offline OK, aucune erreur console liée au SW.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "refactor: rely on vite-plugin-pwa auto-registration for service worker"
```

---

## Task 4: Supprimer le bloc `<script>` inline dupliqué

**Files:**
- Modify: `index.html` (suppression du bloc `<script>` L~2491–2738)

**Interfaces:**
- Consumes: `src/utils.js` (`uid`, `esc`, `catIco`, `CAT_ICONS`, `CAT_COLORS`, `CATS_E/I`, `COLS`, `setText`, `todayISO`, `fmtDate`, `parseAmt`), `src/ui/tutorial.js` (`launchConfetti`), `src/ui/ads.js` (Task 2), auto-registration PWA (Task 3).
- Produces: `index.html` sans logique JS inline (hors anti-FOUC + OneSignal loader).

- [ ] **Step 1: Confirmer que `setText2` n'a aucun appelant hors bloc inline**

Run: `grep -rn "setText2" src/ index.html`
Expected : occurrences uniquement dans le bloc inline `index.html` (définition + éventuels appels internes au même bloc). Aucune dans `src/`. → suppression sûre avec le bloc.

- [ ] **Step 2: Supprimer le bloc `<script>` inline**

Dans `index.html`, supprimer entièrement le bloc depuis `<script>` (L~2491) jusqu'à `</script>` (L~2738) — celui qui contient `CAT_ICONS`, les helpers, `launchConfetti`, la pub (déjà migrée), le SW (déjà neutralisé). **Ne pas** supprimer :
- le `<script>` anti-FOUC (L6),
- le `<script>` loader OneSignal (L48–72),
- le `<script type="module" src="/src/main.js">` (L2787).

- [ ] **Step 3: Vérifier le comportement fonctionnel**

Run: `npm run dev`
Dans le navigateur, tester : navigation entre les 5 vues ; icônes de catégories présentes (Dépenses/Budget) ; dates formatées correctement dans la liste des transactions ; confetti à la fin du tutoriel (rejouer via localStorage si besoin) ; la pub s'affiche toujours (forcée via console). Expected : tout fonctionne, **zéro** erreur console (`ReferenceError` sur une globale supprimée = régression à corriger avant commit).

- [ ] **Step 4: Comparer à la baseline**

Comparer les 5 vues (mobile + desktop) aux screenshots de la Task 1. Expected : aucune différence.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "refactor: remove duplicated inline script block from index.html"
```

---

## Task 5: Supprimer le bloc `<style>` inline dupliqué

**Files:**
- Modify: `index.html` (suppression du bloc `<style>` L~93–1592)
- Modify: `src/styles/*.css` (uniquement si le diff révèle des sélecteurs orphelins à porter)

**Interfaces:**
- Consumes: `src/styles/main.css`, `themes.css`, `components.css`, `layout-mobile.css`, `layout-tablet.css`, `layout-desktop.css`, `tutorial.css` (importés par `main.js`).
- Produces: `index.html` sans `<style>` massif.

- [ ] **Step 1: Diff de sécurité — sélecteurs présents uniquement inline**

Extraire les sélecteurs de chaque source et lister ceux qui n'existent **que** inline :
```bash
sed -n '93,1592p' index.html | grep -oE '^[[:space:]]*[.#:a-zA-Z\[][^{]*\{' | sed 's/{.*//; s/^[[:space:]]*//; s/[[:space:]]*$//' | sort -u > /tmp/inline-sel.txt
cat src/styles/*.css | grep -oE '^[[:space:]]*[.#:a-zA-Z\[][^{]*\{' | sed 's/{.*//; s/^[[:space:]]*//; s/[[:space:]]*$//' | sort -u > /tmp/src-sel.txt
comm -23 /tmp/inline-sel.txt /tmp/src-sel.txt
```
Expected : idéalement liste vide. **Toute** ligne affichée = sélecteur défini uniquement inline → à porter dans le fichier `src/styles/` approprié (thème → `themes.css`, composant → `components.css`, layout → le `layout-*.css` correspondant) **avant** la suppression. Copier la règle complète (le bloc `{ … }`), pas seulement le sélecteur.

- [ ] **Step 2: Supprimer le bloc `<style>` inline**

Dans `index.html`, supprimer entièrement le bloc `<style>` (L~93) → `</style>` (L~1592). Conserver les `<link>` de polices (L91–92) et le `<link rel="manifest">`.

- [ ] **Step 3: Vérifier l'absence de FOUC au build**

Run: `npm run build && npm run preview`
Ouvrir la preview. Expected : au chargement, **aucun flash** de contenu non stylé (Vite extrait le CSS des modules en `<link>` dans le HTML buildé, chargé avant le paint). Recharger plusieurs fois pour confirmer.

- [ ] **Step 4: Comparer à la baseline (visuel complet)**

Comparer les 5 vues en **mobile + desktop** ET la vue globale dans les **3 thèmes** (blue, violet, light) aux screenshots de la Task 1. Vérifier en particulier : cartes (`.card`), KPI (`.kpi`), bottom-nav (`.bnav-btn`), variables de thème (`[data-theme]`). Expected : pixel-équivalent à la baseline.

- [ ] **Step 5: Commit**

```bash
git add index.html src/styles/
git commit -m "refactor: remove duplicated inline style block from index.html"
```

---

## Task 6: Vérification finale, merge & déploiement

**Files:**
- Aucune modification de code. Vérification + merge.

**Interfaces:**
- Consumes: l'ensemble des tâches précédentes.
- Produces: branche mergée sur `main`, déploiement prod atomique.

- [ ] **Step 1: Vérifier la réduction d'`index.html`**

Run: `wc -l index.html`
Expected : ~800 lignes (contre 2789 au départ).

- [ ] **Step 2: Checklist de vérification finale**

Appliquer le skill `superpowers:verification-before-completion`. Sur la preview Vercel (`git push` de la branche déclenche une preview isolée) :
- [ ] Les 5 vues rendent correctement (mobile + desktop).
- [ ] Navigation entre vues OK (bottom-nav mobile + sidebar desktop).
- [ ] Les 3 thèmes s'appliquent correctement.
- [ ] La pub s'affiche et se ferme.
- [ ] Offline PWA : l'app charge hors-ligne.
- [ ] `font-size ≥ 16px` sur les inputs (pas de zoom iOS).
- [ ] Zéro erreur console sur chaque vue.
- [ ] Comparaison visuelle globale vs baseline : aucune régression.

- [ ] **Step 3: Pousser la branche et valider la preview**

```bash
git push -u origin refactor/dedup-index
```
Attendre l'URL de preview Vercel, refaire la checklist Step 2 dessus. Expected : tout vert.

- [ ] **Step 4: Merger vers `main`**

Ouvrir une PR (ou merge direct selon la préférence de l'utilisateur), puis merger. Le déploiement prod Vercel est atomique : bascule seulement si le build réussit.

```bash
gh pr create --title "refactor: dedup index.html toward src/ as single source of truth" --body "Retire le CSS/JS morts redondants d'index.html (2789 → ~800 lignes). Migre pub + SW. Aucun changement de comportement. Voir docs/superpowers/specs/2026-07-23-dedup-index-source-of-truth-design.md"
```

- [ ] **Step 5: Rollback si régression post-déploiement**

En cas de souci en prod : `git revert <commit>` cible la phase fautive, **ou** rollback depuis le dashboard Vercel (déploiement précédent en 1 clic).

---

## Self-Review (effectuée)

**Couverture du spec :**
- Phase 0 (filet + baseline + audit) → Task 1. ✅
- Phase 1 (migrer pub) → Task 2. ✅
- Orphelin SW (identifié pendant l'écriture du plan) → Task 3. ✅ *(ajouté par rapport au spec, qui ne l'avait pas encore isolé)*
- Phase 2 (retrait `<script>` inline) → Task 4. ✅
- Phase 3 (diff CSS + retrait `<style>`) → Task 5. ✅
- Phase 4 (vérif finale + merge) → Task 6. ✅

**Placeholders :** aucun — le code de `ads.js` et les commandes de vérification sont complets et concrets.

**Cohérence des noms :** `initAds`/`loadAd`/`showAd`/`closeAd`/`AD_SEEN_KEY`/`AD_FREQ_MS` cohérents entre Task 2 (définition) et Task 4 (consommation). `window.closeAd` exposé en Task 2, utilisé par le DOM conservé.
