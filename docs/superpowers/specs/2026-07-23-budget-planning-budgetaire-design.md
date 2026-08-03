# Design — Budget « Planning Budgétaire » (fidèle Sleek)

**Date** : 2026-07-23
**Statut** : Validé — prêt pour plan
**Branche** : `feat/accueil-epure`
**Référence** : maquette Sleek « My Finanx » — écran Budget (capturé exactement).

## Objectif

Refondre l'onglet Budget pour reproduire **fidèlement** la maquette Sleek « Planning
Budgétaire », tout en préservant le CRUD complet (ajout / édition inline / suppression /
totaux / répartition IA), le multi-devise, les 3 thèmes, et le langage épuré déjà en place
(pas d'ombres, icônes carrées Sleek unifiées, Plus Jakarta Sans).

## Cible Sleek (exacte)

- **En-tête** : ⚙️ (à gauche) + « Planning Budgétaire » (centré) + ↻ (à droite).
- **Revenus attendus** : libellé (petites capitales) + **total** (vert) à droite. UNE carte
  contenant des lignes : `[icône carré] Nom · Montant · ✎`.
- **Postes de dépenses** : libellé + « Alloué : X » à droite. **Cartes séparées** par poste :
  `[icône carré] Nom · sous-titre · Montant · pastille de statut`.
  - Pastilles : **PAS DE BUDGET** (rouge, 0 €), **OK** (vert), **PRÉVU** (bleu).

## Décisions validées

- **Sous-titres** : prédéfinis par catégorie (ex. Alimentation → « Courses & resto »,
  Logement → « Loyer & charges »). Table `CAT_SUBTITLES` dans `utils.js` ; fallback vide.
- **Statuts** (selon dépenses réelles du mois) :
  - `allocatedEUR === 0` → **PAS DE BUDGET**.
  - `allocatedEUR > 0` et dépenses de la catégorie > 0 → **OK**.
  - `allocatedEUR > 0` et aucune dépense → **PRÉVU**.
- **↻** = **copier le mois précédent** (revenus + postes) via la logique existante
  (`copyFromPreviousMonth` / bridge). Confirmation légère (toast) après copie.
- **Ajout** : bouton discret « + Ajouter » par section, qui **révèle** le champ de saisie
  existant (pas de formulaire toujours visible).
- **⚙️** : ouvre le panneau réglages (`openPlusPanel`).
- **IA « Répartir mon budget »** : conservée en **bouton discret** (pas le grand bandeau
  dégradé), sous la section Postes.

## En-tête & navigation mensuelle (contrainte app)

L'app est **multi-mois** : le budget est propre à chaque mois, la navigation mensuelle doit
rester accessible. Sleek n'affiche pas de sélecteur de mois — on l'intègre proprement :

- Masquer la barre `<header>` globale sur l'onglet Budget (comme sur l'Accueil).
- En-tête Budget dédié : `[⚙️ réglages] [ ‹ mois › ] [↻ copier]`, puis le titre
  « Planning Budgétaire ». Le sélecteur de mois réutilise `changeMonth` (déjà fonctionnel).

## Structure DOM cible (`#page-budget`)

```
#page-budget
├── header.bud-head        (⚙️ · month stepper · ↻)
├── h1.bud-title           « Planning Budgétaire »
├── section « Revenus attendus »
│   ├── .sec-hd  (label + total vert  → #rev-tot)
│   ├── .bud-card  > #rev-rows            (lignes revenus)
│   └── .add-reveal (bouton + champ nr-n / nr-a / addRev)
└── section « Postes de dépenses »
    ├── .sec-hd  (label + « Alloué : » → #bud-tot)
    ├── #bud-rows            (cartes séparées par poste)
    ├── .add-reveal (bouton + champ nb-n / nb-a / addBud)
    └── .bud-ai  (petit bouton « Répartir avec l'IA » → suggestBudget)
```

## Rendu (`budget-ui.js`)

- `renderRevRows` : lignes `[icône] nom · montant · ✎` (ajouter une icône revenu carrée).
- `renderBudRows` : **une carte par poste** `[icône catégorie] nom · sous-titre · montant ·
  pastille`. La pastille prend en compte les **transactions du mois** (passer
  `state.transactions` pour calculer les dépenses par catégorie via `calcByCategory`).
- `renderBudgetFooter` : alimente les totaux des `.sec-hd` (total revenus vert, alloué).
- CRUD inchangé (edit inline, delete, add via champ révélé).

## Fichiers touchés

- `index.html` — réécriture du markup `#page-budget` ; règle CSS de masquage du header
  global sur Budget.
- `src/utils.js` — `CAT_SUBTITLES` (sous-titres par catégorie).
- `src/ui/budget-ui.js` — `renderRevRows`, `renderBudRows` (cartes + sous-titres + pastilles
  statut avec dépenses), `renderBudgetFooter` (nouvelles cibles), copier-mois-précédent.
- `src/ui/navigation.js` — `openMonthNav` non requis (stepper direct via `changeMonth`).
- `src/styles/components.css` — styles `.bud-head`, `.bud-title`, `.sec-hd`, `.bud-card`,
  `.poste-card`, `.bud-status` (droite), `.add-reveal`, `.bud-ai` (épuré, pas d'ombres).

## Contraintes

- Zéro régression du CRUD ni des calculs ; multi-devise via `fmt()` ; 3 thèmes ; pas
  d'ombres superflues ; icônes carrées Sleek unifiées ; `font-size ≥ 16px`.

## Hors périmètre

- Objectifs (cycle suivant, même process) puis Dépenses / Conseils IA inspirés.
