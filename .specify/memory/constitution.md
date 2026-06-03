<!--
==============================================================================
SYNC IMPACT REPORT
==============================================================================
Version change : [template] → 1.0.0
Type of bump   : MINOR — first concrete constitution (from blank template)

Principles added (all new, no prior version):
  - I.   Données Locales Uniquement
  - II.  Zéro Compte Utilisateur
  - III. Performance — Rendu Réactif
  - IV.  Design Responsive à 3 Layouts
  - V.   Accessibilité & UX Mobile
  - VI.  Multi-Devise avec EUR comme Pivot
  - VII. Légèreté & Dépendances Minimales

Sections added:
  - Gouvernance Technique (store, modules, séparation calculs/DOM, erreurs)
  - Standards Qualité (fonctions pures, gestion erreurs, responsabilités)

Principles removed : none
Sections removed   : none

Template sync status:
  ✅ .specify/templates/plan-template.md
     → Constitution Check section present; gates will be populated by
       /speckit-plan based on this constitution. No structural change needed.
  ✅ .specify/templates/spec-template.md
     → No mandatory section changes required. Assumptions section already
       covers storage/architecture decisions.
  ✅ .specify/templates/tasks-template.md
     → Generic structure unchanged; PWA-specific tasks (SW versioning,
       localStorage error handling) will be added by /speckit-tasks.

Deferred TODOs : none — all placeholders resolved.
==============================================================================
-->

# MyFinanx Constitution

## Core Principles

### I. Données Locales Uniquement

Toutes les données utilisateur (budget, transactions, objectifs, préférences)
DOIVENT être stockées exclusivement dans le `localStorage` de l'appareil.
Aucun appel réseau ne DOIT transmettre des données financières vers un serveur
tiers, à l'exception des requêtes vers le modèle IA (conseiller) et vers
`frankfurter.app` pour les taux de change.

- Le `localStorage` est la source de vérité unique.
- Toute opération `localStorage` (lecture, écriture, suppression) DOIT être
  encapsulée dans un bloc try/catch gérant les erreurs de quota (`QuotaExceededError`)
  et les données corrompues.
- L'export JSON DOIT être une copie fidèle de toutes les données locales.
- L'import JSON DOIT valider le schéma avant toute écriture, sans jamais
  écraser les données existantes en cas d'erreur de validation.

*Rationale* : L'absence de backend garantit la confidentialité totale des
données financières, supprime les coûts d'infrastructure et permet un
fonctionnement hors ligne natif.

### II. Zéro Compte Utilisateur

L'application DOIT fonctionner sans inscription, sans authentification et sans
compte en ligne. Aucune adresse e-mail, mot de passe ou identifiant distant
n'est collecté.

- La personnalisation (prénom, genre, devise, thème) est stockée localement.
- Aucune synchronisation multi-appareils n'est prévue.
- Le reset complet DOIT effacer l'intégralité des données locales après
  confirmation en 2 étapes distinctes.

*Rationale* : Zéro friction à l'entrée, zéro risque RGPD côté serveur,
cohérence avec le principe I.

### III. Performance — Rendu Réactif

Tout recalcul déclenché par une saisie utilisateur (ajout, modification,
suppression d'une entrée) DOIT produire un rendu visible en moins de 100 ms.

- Aucun re-render inutile n'est toléré : le store centralisé DOIT notifier
  uniquement les composants abonnés aux données modifiées.
- Les calculs financiers (totaux, pourcentages, KPIs) DOIVENT être effectués
  en dehors du pipeline de rendu DOM — fonctions pures appelées avant toute
  mise à jour de l'interface.
- Les taux de change DOIVENT être mis en cache 24 h pour éviter des appels
  réseau répétés lors de chaque affichage.

*Rationale* : Une latence perceptible sur des opérations de saisie répétées
(budget mensuel, transactions) dégrade directement l'expérience utilisateur.

### IV. Design Responsive à 3 Layouts

L'application DOIT implémenter trois layouts visuellement et fonctionnellement
distincts selon le viewport :

| Breakpoint | Navigation | Layout principal |
|---|---|---|
| Mobile `< 768px` | Bottom bar fixe (icônes + labels) | Colonne unique, cartes pleine largeur |
| Tablette `768px–1199px` | Sidebar gauche réduite (icônes, tooltip au survol) | Grille 2 colonnes |
| Desktop `≥ 1200px` | Sidebar gauche déployée (icônes + labels texte) | Grille multi-colonnes, dashboard sans défilement |

Règles transverses :
- Aucun élément UI ne DOIT être tronqué, superposé ou inutilisable sur l'un
  des 3 breakpoints.
- Sur desktop, le dashboard DOIT afficher simultanément : 4 KPIs sur une ligne,
  donut + barres budgétaires côte à côte, transactions + objectifs en bas.
- La charte visuelle (couleurs, typographie, composants) DOIT rester identique
  sur les 3 breakpoints ; seul le layout change.

*Rationale* : MyFinanx est une PWA installable sur mobile et desktop. Les 3
layouts garantissent une expérience native sur chaque classe d'appareil.

### V. Accessibilité & UX Mobile

Toutes les interactions tactiles et tous les champs de saisie DOIVENT respecter :

- Touch targets ≥ 44 × 44 px sur mobile et tablette (standard Apple HIG / WCAG).
- `font-size` ≥ 16 px sur tous les inputs et composants imbriqués pour
  désactiver le zoom automatique sur iOS.
- Contraste suffisant (ratio WCAG AA) sur les 3 thèmes : bleu/sombre,
  violet/sombre, clair.
- Les modales et bottom sheets sur mobile DOIVENT occuper le plein écran
  ou une hauteur suffisante pour éviter tout débordement de contenu.

*Rationale* : L'usage mobile est le cas d'usage principal. Un zoom iOS
involontaire ou un bouton trop petit casse immédiatement l'expérience.

### VI. Multi-Devise avec EUR comme Pivot

Tous les montants DOIVENT être stockés en EUR (devise pivot), indépendamment
de la devise active sélectionnée par l'utilisateur.

- À la saisie : tout montant dans une devise non-EUR DOIT être converti en EUR
  avant stockage, en utilisant le taux de change en cache.
- À l'affichage : tout montant stocké en EUR DOIT être converti dans la devise
  active au moment du rendu.
- Les devises supportées sont : EUR, USD, GBP, CAD, XOF, MAD.
- Les taux DOIVENT être récupérés depuis `frankfurter.app` et mis en cache
  pendant 24 h dans le `localStorage`.
- En cas d'indisponibilité réseau et de cache expiré, l'app DOIT afficher
  les montants en EUR avec un avertissement visible.

*Rationale* : L'EUR comme pivot unique garantit la cohérence des calculs
et simplifie les conversions — un seul taux de référence par devise à tout
moment.

### VII. Légèreté & Dépendances Minimales

La stack technique DOIT rester légère : Vanilla JS + Vite, ou HTML/CSS/JS pur.
Aucune dépendance npm volumineuse (framework UI, state-management library,
ORM) n'est autorisée sans justification explicite dans le plan.

- Les graphiques (donut, barres) DOIVENT être implémentés en SVG natif ou
  via une micro-bibliothèque (< 10 kB gzippé). Pas de Chart.js ni D3 complet.
- Le Service Worker DOIT utiliser l'API native ou Workbox (si Vite) — pas de
  framework SW propriétaire.
- L'ajout de toute dépendance npm doit être documenté dans `plan.md` avec
  justification de taille et de maintenabilité.

*Rationale* : Une PWA légère se charge plus vite sur réseau mobile, se met
en cache plus efficacement et reste maintenable sur le long terme sans
migration de framework.

## Gouvernance Technique

Les règles suivantes gouvernent l'architecture interne de MyFinanx.
Elles sont non négociables dans toute implémentation conforme.

**Store centralisé pub/sub**
- Un store central unique gère l'état de l'application.
- Le pattern pub/sub DOIT être utilisé : les composants s'abonnent aux
  sous-ensembles de données dont ils ont besoin.
- Aucun composant ne DOIT lire directement le `localStorage` — toutes
  les lectures passent par le store.

**Modules indépendants**
- Les 4 domaines fonctionnels (budget, transactions, objectifs, IA) DOIVENT
  être implémentés comme des modules indépendants, sans couplage direct
  entre eux.
- Chaque module DOIT exposer une API interne claire (fonctions d'entrée/sortie)
  consommée par le store et les composants de rendu.

**Séparation stricte calculs / rendu DOM**
- Les calculs financiers (totaux, pourcentages, reste non alloué, conversion
  devise) DOIVENT résider dans des fonctions pures, sans effet de bord.
- Ces fonctions DOIVENT être testables unitairement, indépendamment du DOM.
- Le rendu DOM ne DOIT jamais contenir de logique de calcul financier.

**Gestion d'erreur localStorage systématique**
- Toute opération `localStorage` (getItem, setItem, removeItem, clear) DOIT
  être encapsulée et intercepter `QuotaExceededError`, `SecurityError` et
  toute donnée non-JSON parseable.
- En cas d'erreur d'écriture, l'utilisateur DOIT être informé par un message
  d'erreur explicite — jamais un échec silencieux.

## Standards Qualité

- Les fonctions pures de calcul financier DOIVENT pouvoir être exécutées et
  vérifiées sans navigateur (Node.js ou environnement de test headless).
- Tout nouveau poste budgétaire, transaction ou objectif DOIT être rejeté
  si le montant est nul ou négatif, avec un message d'erreur utilisateur.
- Le tutoriel 6 étapes DOIT pouvoir être ignoré à tout moment via un bouton
  "Passer" — il ne DOIT jamais bloquer l'accès aux fonctionnalités.
- Le cache Service Worker DOIT être versionné : toute mise à jour du SW DOIT
  invalider l'ancien cache et en créer un nouveau.

## Governance

Cette constitution supersède toute autre pratique ou décision d'implémentation
dans le projet MyFinanx. En cas de conflit entre une décision de plan ou de
tâche et un principe constitutionnel, le principe constitutionnel prévaut.

**Procédure d'amendement** :
1. Proposer la modification dans une issue ou un PR dédié.
2. Documenter : principe concerné, motivation, impact sur les artéfacts
   existants (spec, plan, tasks).
3. Mettre à jour `LAST_AMENDED_DATE` et incrémenter `CONSTITUTION_VERSION`
   selon les règles sémantiques (MAJOR / MINOR / PATCH).
4. Propager les changements aux templates concernés.

**Politique de versionnage** :
- MAJOR : suppression ou redéfinition incompatible d'un principe existant.
- MINOR : ajout d'un principe ou d'une section, expansion significative.
- PATCH : clarification, reformulation, correction de coquilles.

**Revue de conformité** :
- Le `Constitution Check` dans chaque `plan.md` DOIT lister explicitement
  les principes vérifiés avant de démarrer l'implémentation.
- Toute violation documentée dans `plan.md > Complexity Tracking` DOIT
  inclure une justification et une alternative rejetée.

**Version**: 1.0.0 | **Ratified**: 2026-05-21 | **Last Amended**: 2026-05-21
