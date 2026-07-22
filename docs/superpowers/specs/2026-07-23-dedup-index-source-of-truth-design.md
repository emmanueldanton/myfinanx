# Design — Dégraissage d'`index.html` vers `src/` (source de vérité unique)

**Date** : 2026-07-23
**Statut** : Validé — prêt pour plan d'implémentation
**Branche cible** : `refactor/dedup-index`

## Contexte & problème

L'application MyFinanx (PWA Vanilla JS + Vite) est dans un état de **migration
inachevée**. Le plan initial (`specs/001-myfinanx-pwa/plan.md`) décrit une
architecture modulaire propre dans `src/`, et l'app **tourne effectivement sur
`src/`** (chargée via `<script type="module" src="/src/main.js">`). Mais
`index.html` (2789 lignes) contient encore deux gros blocs hérités et
**redondants** avec `src/` :

| Bloc inline dans `index.html` | Doublon vivant dans `src/` | État réel |
|---|---|---|
| `<style>` L93–1592 (~1500 lignes) | `src/styles/*.css` (1942 lignes) | `src/` gagne au chargement (injecté après le `<head>`) |
| `<script>` L2491–2786 | `src/utils.js` + `src/ui/navigation.js` | `src/` écrase les globales sur `window` |

Preuves recueillies :
- Sélecteurs identiques dans les deux CSS (`.card`, `.kpi`, `.bnav-btn`,
  `:root`, `[data-theme]`…).
- `src/utils.js` redéfinit à l'identique `uid`, `esc`, `catIco`, `CAT_ICONS`,
  `CAT_COLORS`, `CATS_E/I`.
- `src/ui/navigation.js` définit `goTab`/`goTabMobile` et les expose sur
  `window`, écrasant les versions inline (le module se charge après les scripts
  inline).

**Conséquence** : deux sources de vérité pour le style → régressions
invisibles quand on touche au CSS ; logique éclatée entre le monolithe et les
modules → on ne sait plus où éditer.

### Orphelin vivant identifié (risque clé)

Le bloc `<script>` inline ne contient pas **que** des doublons. Il héberge un
**système de publicités encore actif** :
- `loadAd()` s'exécute au chargement (L2709) ;
- `showAd()` / `closeAd()` sont câblés au DOM (`.ad-overlay`, L2473–2481) ;
- constantes `AD_FREQ_MS`, `AD_SEEN_KEY` ; alimenté par `ads.json` (racine).

**Aucun de ces symboles n'existe dans `src/`.** Une suppression naïve du bloc
inline tuerait la fonctionnalité pub. Le design le traite explicitement
(migration avant suppression). `setText2` est également orphelin mais
vraisemblablement mort (aucun appelant hors bloc inline) — à confirmer.

## Objectif & critères de succès

Faire de `src/` la **seule source de vérité**, en retirant d'`index.html` le CSS
et le JS morts redondants, **sans aucun changement de comportement visible**.

Le design est un **dégraissage**, pas une réécriture : on retire du code qui
n'est déjà plus exécuté, ou on migre le peu qui l'est encore.

**Succès =**
- `index.html` : 2789 → ~800 lignes (head + markup des vues uniquement).
- Zéro `<style>` inline massif ; zéro constante/helper/fonction dupliqué inline.
- Comportement identique : mêmes 5 vues, navigation, pubs, thèmes, aucun FOUC.
- Modifier le style = éditer **un seul** endroit (`src/styles/`).

## Périmètre

**Inclus**
- Suppression du `<style>` inline (L93–1592) — après diff de sécurité.
- Suppression du `<script>` inline dupliqué (L2491–2786).
- Migration des orphelins vivants (système pub) vers `src/`.

**Exclus (YAGNI)**
- Extraction du DOM statique des vues vers des templates JS (approche B).
- Tout redesign visuel ou simplification UX (chantier séparé).
- Toute optimisation non liée au dégraissage.

## Modèle de sécurité (3 garde-fous)

1. **Auditer avant de supprimer** — chaque symbole inline est classé *doublon*
   (présent à l'identique dans `src/`) ou *orphelin vivant* (absent de `src/`,
   encore appelé). On ne supprime que les doublons ; les orphelins sont migrés
   d'abord.
2. **Incrémental + vérifié** — un bloc retiré, vérifié (local + preview Vercel),
   committé, puis seulement le suivant. Jamais deux suppressions non vérifiées
   d'affilée.
3. **Déploiement atomique + rollback** — une commit par phase sur branche
   dédiée. Vercel build à côté : build échoué → ancienne version servie, zéro
   interruption ; build réussi → bascule instantanée. Rollback via `git revert`
   ciblé ou depuis le dashboard Vercel.

## Phases

### Phase 0 — Filet de sécurité & audit
- Créer la branche `refactor/dedup-index`.
- Capturer une **baseline visuelle** : screenshots des 5 vues (Vue globale,
  Budget, Dépenses, Objectifs, Conseiller IA) en mobile **et** desktop, dans le
  scratchpad. Référence de comparaison pour toutes les phases suivantes.
- Consolider la **table d'audit des symboles** :

| Symbole inline | Statut | Action |
|---|---|---|
| `CAT_ICONS`, `CAT_COLORS`, `CATS_E/I`, `COLS`, `MONTHS_SHORT` | doublon de `src/utils.js` | supprimer inline |
| `uid`, `esc`, `catIco`, `setText`, `todayISO`, `fmtDate`, `parseAmt` | doublon de `src/utils.js` | supprimer inline |
| `launchConfetti` | doublon de `src/ui/tutorial.js` | supprimer inline |
| `loadAd`, `showAd`, `closeAd`, `AD_*`, appel `loadAd()` | **orphelin VIVANT** | **migrer → `src/ui/ads.js`** |
| `setText2` | orphelin (mort ?) | vérifier 0 appelant → supprimer |
| `<style>` L93–1592 | doublon de `src/styles/*` | supprimer inline (après diff) |

### Phase 1 — Migrer l'orphelin vivant (pub) vers `src/`
*(avant toute suppression, pour ne jamais casser la feature)*
- Créer `src/ui/ads.js` : y déplacer `loadAd` / `showAd` / `closeAd` +
  constantes `AD_*`.
- Exposer `closeAd` sur `window` (le DOM `onclick="closeAd()"` continue de
  marcher). Appeler `loadAd()` depuis l'init de `main.js`.
- **Vérif** : la pub s'affiche toujours (forcer via reset de `AD_SEEN_KEY`), le
  bouton fermer fonctionne. Commit.

### Phase 2 — Supprimer le `<script>` inline dupliqué
- Retirer le bloc L2491–2786 (100 % doublons + orphelins déjà migrés en
  Phase 1). Confirmer `setText2` sans appelant avant de le retirer.
- **Conserver** les scripts inline légitimes : anti-FOUC thème (L6) et loader
  OneSignal (L48–72).
- **Vérif** : navigation entre vues, icônes de catégories, dates, confetti (fin
  de tuto), rendu des transactions. Aucune erreur console. Commit.

### Phase 3 — Supprimer le `<style>` inline dupliqué
- **Diff de sécurité** d'abord : extraire les sélecteurs du `<style>` inline et
  de `src/styles/`, lister ceux présents *uniquement* inline. S'il en existe →
  les porter dans le fichier `src/styles/` approprié avant suppression.
- Retirer le bloc L93–1592.
- **Vérif FOUC** : au build (`vite build && vite preview`), le CSS doit être un
  `<link>` extrait → pas de flash. Comparer chaque vue aux screenshots baseline
  (mobile + desktop, 3 thèmes : blue, violet, light). Commit.

### Phase 4 — Vérification finale & merge
- Appliquer le skill `superpowers:verification-before-completion` : checklist
  complète, comparaison baseline, test des 5 vues + pub + 3 thèmes + offline PWA.
- Preview Vercel validée → merge → déploiement prod atomique.

## Vérification (à chaque phase)

Local `vite dev` **et** preview Vercel : les 5 vues rendent, navigation OK, pub
OK, thèmes OK, offline OK, aucune erreur console, comparaison visuelle vs
baseline. Aucune phase mergée sans ces contrôles.

## Rollback

Branche dédiée + commits atomiques par phase → `git revert <commit>` cible une
seule étape. Vercel conserve chaque déploiement → rollback prod immédiat depuis
le dashboard.

## Fichiers touchés

- `index.html` — suppression des deux blocs inline (net : −~1800 lignes).
- `src/ui/ads.js` — **nouveau** : système pub migré.
- `src/main.js` — init de `loadAd()`.
- `src/styles/*.css` — potentiellement quelques sélecteurs orphelins portés
  depuis l'inline (Phase 3, si le diff en révèle).

## Hors périmètre / suites possibles

- Approche B (extraction du DOM des vues vers `src/ui/`) — chantier ultérieur si
  besoin.
- Simplification UX / densité visuelle (« app bancaire simple ») — le chantier
  d'origine, repris une fois la base assainie.
