# Design — Accueil épuré style « app bancaire » (Sleek)

**Date** : 2026-07-23
**Statut** : Validé — prêt pour plan d'implémentation
**Branche cible** : `feat/accueil-epure`
**Référence visuelle** : projet Sleek « My Finanx » (écran Accueil) — thème clair, banque mobile épurée.

## Contexte & objectif

L'accueil actuel (« Vue globale ») empile trop d'informations : salutation, 4 cartes
KPI, donut de répartition + liste budget, sources de revenus, dernières transactions,
progression des objectifs. Effet « étouffant », loin d'une app bancaire simple.

Objectif : refondre l'accueil pour qu'il **ressemble à la référence Sleek** — un grand
chiffre héros, des actions rapides, deux cartes résumé, les transactions récentes — et
adapter la navigation. Tout le contenu retiré reste accessible dans son onglet dédié.

Ce chantier fait suite au dégraissage `index.html → src/` (voir
`2026-07-23-dedup-index-source-of-truth-design.md`) : la base est saine, `src/` est la
seule source de vérité, l'accueil se rend via `src/ui/index.js` + `src/ui/dashboard.js`.

## Décisions validées

- **Héros = Reste disponible** : `(revenus du mois + revenus ponctuels) − dépenses réelles`,
  grand chiffre, dans la devise active.
- **Actions rapides = 3 boutons** : Ajouter dépense · Revenu · Objectif.
- **« Plus »/réglages** : sort de la navbar, passe dans l'en-tête de l'accueil.
- **Navbar = 5 vraies sections** : Accueil · Dépenses · Budget · Objectifs · Conseils IA.
- **Périmètre = Accueil + navbar d'abord**. Budget / Dépenses / Objectifs = cycles suivants.

## Système visuel

Reprend la référence Sleek : fond clair, cartes très arrondies (~20 px), généreux
whitespace, chiffres en gras, accents bleu (`--pr`) et vert (`--green`), pastilles
catégories colorées (`CAT_COLORS` de `src/utils.js`). Les **3 thèmes existants**
(blue, violet, light) restent supportés via `src/styles/themes.css` — aucune couleur
codée en dur, tout passe par les variables CSS. `font-size ≥ 16px` conservé partout.

## Structure de l'accueil (de haut en bas)

1. **En-tête**
   - Gauche : avatar (`pp.png` ou initiale) + libellé « Compte principal » / prénom.
   - Droite : bouton **réglages** (icône) ouvrant le panneau « Plus » existant
     (thème, export/import, réinitialiser, tutoriel, Conseils IA) + **sélecteur de mois**
     compact (l'app est multi-mois ; navigation `changeMonth` conservée et accessible ici).

2. **Héros — Reste disponible**
   - Très grand chiffre = `calcTotalIncomes(budget) + calcTotalPunctualIncomes(tx) − calcTotalExpenses(tx)`,
     rendu via `toDisplay()` (devise active).
   - Pastille de variation sous le chiffre : delta vs mois précédent, verte si ≥ 0
     (« ↗ +142,50 € ce mois-ci »), rouge sinon. Si mois précédent indisponible, pastille masquée.

3. **Actions rapides** — 3 boutons ronds avec libellés :
   - **Ajouter dépense** (bouton plein) → ouvre le formulaire d'ajout de transaction (type dépense).
   - **Revenu** → formulaire d'ajout (type revenu ponctuel).
   - **Objectif** → formulaire de création d'objectif.

4. **Cartes résumé horizontales** (scroll horizontal, 2 cartes) :
   - **Budget restant** : `calcTotalAllocated(budget) − calcTotalExpenses(tx)` + jauge
     + libellé « X % utilisé sur `calcTotalAllocated` ». Tap → onglet Budget.
   - **Objectif prioritaire** : premier objectif actif (montant cible + % complété + jauge).
     Tap → onglet Objectifs. Si aucun objectif : carte « Créer un objectif ».

5. **Récents** : titre « Récents » + lien « Voir tout » (→ onglet Dépenses).
   Liste des `getRecent(transactions, 4)` : pastille catégorie colorée (`catIco`/`CAT_COLORS`)
   + libellé + sous-ligne (catégorie • heure) + montant (rouge dépense / vert revenu).
   État vide : « Aucune transaction ce mois-ci ».

6. **Navbar basse fixe** : Accueil · Dépenses · Budget · Objectifs · Conseils IA.
   Le « Plus » disparaît de la navbar (déplacé dans l'en-tête). L'ordre et les libellés
   sont mis à jour ; la logique `goTab`/`goTabMobile` de `src/ui/navigation.js` est adaptée
   (l'onglet interne « overview » devient « Accueil »).

## Ce qui quitte l'accueil (vers les onglets dédiés)

- Donut de répartition du mois → reste dans les onglets Budget/Dépenses.
- Liste budget détaillée par poste → onglet Budget.
- Section « Sources de revenus » → onglet Budget.
- Progression détaillée de tous les objectifs → onglet Objectifs (l'accueil n'en montre qu'un).

## Composants & fichiers touchés

- `index.html` — remplacer le markup de la vue accueil (`#view-overview` / la section
  overview) par la nouvelle structure (en-tête, héros, actions, cartes, récents). Mettre à
  jour le markup de la navbar (retrait du bouton « Plus », nouvel ordre/libellés).
- `src/ui/dashboard.js` (aujourd'hui quasi vide — simple ré-export) — **devient le module
  de rendu de l'accueil** : `renderDashboard(state)` calcule le reste disponible, le delta,
  le budget restant, l'objectif prioritaire, les récents, et peint le DOM. Boundary claire :
  entrée = état du store, sortie = DOM de l'accueil.
- `src/ui/index.js` — brancher `renderDashboard` dans `renderAll()` (abonné aux slices
  `mfx_budget`, `mfx_transactions`, `mfx_goals`).
- `src/ui/navigation.js` — adapter l'ordre/labels de la navbar et le mapping des onglets.
- `src/styles/components.css` (+ `layout-mobile.css` si besoin) — styles de l'accueil épuré
  (héros, boutons ronds d'action, cartes résumé horizontales), via variables de thème.
- Réutilise sans les modifier : `budget.js`, `transactions.js`, `goals.js`, `currency.js`,
  `utils.js`.

## Non-régression & contraintes

- Aucune donnée ni calcul dupliqué : tout vient des modules purs existants.
- Multi-devise via `toDisplay()` ; le mois actif pilote tous les chiffres de l'accueil.
- 3 thèmes préservés ; `font-size ≥ 16px` ; touch targets ≥ 44px (contraintes constitutionnelles).
- Rendu ciblé via le store pub/sub existant (pas de re-render global superflu).
- Implémentation pilotée par le skill `impeccable` (demande utilisateur) pour la qualité UI.

## Hors périmètre (cycles suivants)

- Refonte des écrans Budget, Dépenses, Objectifs pour matcher la référence Sleek.
- Toute connexion bancaire réelle (l'app reste 100 % locale).
