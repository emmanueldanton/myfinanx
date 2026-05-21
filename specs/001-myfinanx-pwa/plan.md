# Implementation Plan: MyFinanx — PWA de Gestion Financière Personnelle

**Branch**: `001-myfinanx-pwa` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-myfinanx-pwa/spec.md`

## Summary

MyFinanx est une PWA de gestion financière personnelle mono-utilisateur,
entièrement locale (localStorage), sans backend sauf un endpoint serverless
Vercel pour le conseiller IA (Groq llama-3.3-70b). L'architecture est basée
sur Vanilla JS + Vite avec un store centralisé pub/sub, des modules
fonctionnels indépendants et une séparation stricte calculs financiers /
rendu DOM. Le design implémente 3 layouts distincts (mobile, tablette,
desktop) via des fichiers CSS dédiés et des variables CSS centralisées.
Toutes les données restent sur l'appareil ; seuls Groq et frankfurter.app
reçoivent des données non-financières ou des métadonnées de session.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2023), HTML5, CSS3
**Primary Dependencies**: Vite 5.x (bundler), vite-plugin-pwa (PWA + SW), Workbox 7.x (stratégie cache + versioning automatique)
**Storage**: localStorage — données utilisateur, cache taux de change 24h, historique conversation IA
**Testing**: Fonctions pures exécutables via Node.js (pas de framework de test imposé — testabilité sans DOM requise)
**Target Platform**: Navigateur moderne (PWA installable) — iOS/Android/Windows/macOS. Déploiement statique Vercel + fonction serverless.
**Project Type**: PWA single-page application + 1 API serverless Vercel
**Performance Goals**: Rendu DOM < 100ms après toute action utilisateur. Taux de change servis depuis cache 24h. Greeting IA : 1 appel/session max.
**Constraints**: Zéro framework JS, zéro framework CSS. Graphiques en SVG natif. Offline-capable. localStorage = seul stockage. `font-size ≥ 16px` partout.
**Scale/Scope**: Mono-utilisateur. Données locales uniquement. 5 vues (Dashboard, Budget, Dépenses, Objectifs, Conseiller IA).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principe | Vérification | Statut |
|---|---|---|---|
| I | Données Locales Uniquement | `store.js` est la seule interface `localStorage`. Seules exceptions réseau autorisées : Groq API (texte IA, pas de données financières identifiables) et `frankfurter.app` (taux de change publics). | ✅ PASS |
| II | Zéro Compte Utilisateur | Aucune auth, aucune inscription, aucun identifiant distant. Prénom/genre stockés uniquement en local. | ✅ PASS |
| III | Performance — Rendu Réactif | Store pub/sub ciblé : seuls les composants abonnés aux données modifiées sont notifiés. Calculs purs avant tout paint DOM. | ✅ PASS |
| IV | Design Responsive à 3 Layouts | Trois fichiers CSS dédiés par breakpoint. Navigation = 1 seul élément HTML transformé par classes CSS. Breakpoints définis comme variables CSS centralisées. | ✅ PASS |
| V | Accessibilité & UX Mobile | `font-size: 16px` enforced globalement y compris dans wrappers `.fw`. Touch targets ≥ 44px. Contraste WCAG AA vérifié sur les 3 thèmes. | ✅ PASS |
| VI | Multi-Devise EUR Pivot | `currency.js` : `fromDisplay()` → EUR (précision fixe par devise) au stockage. `toDisplay()` → devise active au rendu. Cache taux 24h. | ✅ PASS |
| VII | Légèreté & Dépendances Minimales | Vanilla JS + Vite. Graphiques SVG natif (< 10 kB). Workbox uniquement pour SW. Aucun Chart.js, D3, Bootstrap, Tailwind. | ✅ PASS |

**Gouvernance Technique** :
- Store centralisé pub/sub ✅ (`store.js`)
- Modules indépendants ✅ (`budget.js`, `transactions.js`, `goals.js`, `ai.js`)
- Séparation calculs / rendu DOM ✅ (fonctions pures dans modules, rendu dans `ui/`)
- Gestion erreur localStorage systématique ✅ (try/catch `QuotaExceededError` + JSON parse errors)

*Post-Phase 1 re-check : ✅ PASS — aucune violation introduite par le design.*

## Project Structure

### Documentation (this feature)

```text
specs/001-myfinanx-pwa/
├── plan.md              # Ce fichier
├── research.md          # Phase 0 — Décisions techniques et rationale
├── data-model.md        # Phase 1 — Schéma complet des données localStorage
├── quickstart.md        # Phase 1 — Guide de démarrage développeur
├── contracts/
│   └── api-ai.md        # Phase 1 — Contrat endpoint /api/ai (Vercel + Groq)
└── tasks.md             # Phase 2 — /speckit-tasks (non créé ici)
```

### Source Code (repository root)

```text
myfinanx/
├── index.html                    # SPA — HTML unique, navigation unique transformée par CSS
├── vite.config.js                # Vite + vite-plugin-pwa (SW auto-versionné au build)
├── vercel.json                   # Routing SPA + déclaration fonction serverless
├── package.json
├── .env.local                    # GROQ_API_KEY (non commité, Vercel env var en prod)
│
├── public/
│   ├── manifest.json             # PWA manifest (name, icons, display, theme_color)
│   └── icons/                   # Icônes PWA 192×192, 512×512, maskable
│
├── api/
│   └── ai.js                    # Vercel serverless function — proxy Groq avec history[] complet
│
└── src/
    ├── main.js                   # Point d'entrée : init app, routing SPA, gestion breakpoint actif,
    │                             # synchronisation état navigation (source de vérité unique)
    ├── store.js                  # localStorage CRUD centralisé, pub/sub simple, migration de schéma,
    │                             # gestion QuotaExceededError, SecurityError, JSON parse errors
    ├── currency.js               # CURRENCIES (6 devises + précision), toDisplay(), fromDisplay(),
    │                             # fetchLiveRates() + cache 24h localStorage, fallback EUR
    ├── budget.js                 # Fonctions pures : CRUD revenus + postes budgétaires,
    │                             # calcTotaux(), calcPourcentages(), copyPreviousMonth()
    ├── transactions.js           # Fonctions pures : CRUD transactions + revenus ponctuels,
    │                             # CATEGORIES prédéfinies, filterByCategory(), calcByCategory()
    ├── goals.js                  # Fonctions pures : CRUD objectifs (cycle propre, jamais déclenché
    │                             # par navigation mensuelle), calcProgress()
    ├── ai.js                     # Chat Groq (history[] intégral transmis à chaque appel),
    │                             # buildSystemContext(), greeting debounce 3s + hash invalidation
    ├── theme.js                  # setTheme(), getTheme(), synchronisation indicateurs visuels
    │
    ├── ui/
    │   ├── index.js              # renderAll() — orchestrateur pub/sub → rendu
    │   ├── greeting.js           # renderGreeting() — salutation + message IA (1 fois/session)
    │   ├── charts.js             # donut SVG + barres progression — ResizeObserver, 0 px hardcodé
    │   ├── reminders.js          # Rappels in-app intelligents (1 fois/jour max)
    │   └── tutorial.js           # Tutoriel 6 étapes avec bouton "Passer" à chaque étape
    │
    └── styles/
        ├── main.css              # Import global + CSS custom properties :
        │                         #   --bp-mobile: 768px, --bp-tablet: 1200px
        │                         #   font-size base, spacing scale, z-index scale
        ├── layout-mobile.css     # @media (max-width: 767px) : bottom bar fixe, colonne unique
        ├── layout-tablet.css     # @media (768px–1199px) : sidebar icônes, grille 2 colonnes
        ├── layout-desktop.css    # @media (min-width: 1200px) : sidebar complète, multi-colonnes
        ├── components.css        # Cartes, boutons, inputs (font-size: 16px enforced),
        │                         # modales, bottom sheets — agnostiques du breakpoint
        └── themes.css            # --color-* variables pour les 3 thèmes : blue, violet, light
```

**Structure Decision**: Architecture PWA single-page sans framework. La fonction `api/ai.js` (Vercel serverless) est le seul code côté serveur — elle agit comme proxy Groq pour protéger la clé API. Tout le reste est statique et déployé sur le CDN Vercel. Aucun monorepo : tout dans un seul dépôt.

## Complexity Tracking

> Aucune violation constitutionnelle identifiée — section vide.
