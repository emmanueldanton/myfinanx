# Feature Specification: MyFinanx — PWA de Gestion Financière Personnelle

**Feature Branch**: `001-myfinanx-pwa`
**Created**: 2026-05-21
**Status**: Draft

---

## Clarifications

### Session 2026-05-21

- Q: Précision des montants lors de la conversion devise→EUR à la saisie → A: Précision fixe par devise : EUR/USD/GBP/CAD/MAD = 2 décimales, XOF = 0 décimale. Aucune erreur d'arrondi tolérée.
- Q: Cycle de chargement des objectifs d'épargne → A: Les objectifs sont chargés et sauvegardés indépendamment du cycle mensuel. Un changement de mois ne déclenche jamais le rechargement des objectifs.
- Q: Déclenchement du message IA contextuel sur le dashboard → A: Une seule fois par session, avec un debounce de 3 secondes et une invalidation par hash des données financières. Aucun redéclenchement à chaque recalcul.
- Q: Couverture de la règle font-size ≥ 16px sur iOS → A: Tous les inputs, y compris dans les composants imbriqués (wrappers .fw et autres), doivent avoir font-size ≥ 16px pour empêcher le zoom automatique iOS.
- Q: Source de vérité pour l'état actif de navigation → A: Source de vérité unique pour l'onglet actif, synchronisée sur tous les composants de navigation (bottom bar mobile, sidebar tablette et desktop). Désynchronisation impossible.
- Q: Versionnage du cache Service Worker → A: Version générée automatiquement par Vite à chaque build (via vite-plugin-pwa / Workbox). Aucune incrémentation manuelle autorisée.
- Q: Transmission de l'historique au modèle IA → A: L'array history[] complet est transmis à l'API Groq à chaque appel. Aucun message précédent n'est omis.
- Q: Conditions d'affichage du prompt d'installation PWA → A: L'invite showPwaPopup() s'affiche uniquement sur mobile (détection via matchMedia pointer:coarse). Elle n'apparaît jamais sur desktop Chrome.
- Q: Dimensions des graphiques (donut, barres) → A: Les graphiques utilisent ResizeObserver pour calculer leurs dimensions selon leur conteneur. Aucune dimension hardcodée en px.
- Q: Définition des breakpoints et structure du composant navigation → A: Les 3 breakpoints sont définis comme variables CSS centralisées. La navigation est un composant HTML unique qui se transforme visuellement selon le breakpoint, sans duplication de HTML.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Tableau de bord et navigation mensuelle (Priority: P1)

L'utilisateur ouvre MyFinanx et accède immédiatement à son tableau de bord : 4 cartes KPI (revenus du mois, dépenses réelles, reste disponible, budget non alloué), un graphique donut par catégorie, des barres de progression budgétaire, les 5 dernières transactions et la progression des objectifs d'épargne. Il navigue d'un mois à l'autre via des flèches.

**Why this priority**: C'est le point d'entrée unique de l'application et la vue la plus consultée quotidiennement. Sans elle, aucune autre fonctionnalité n'a de surface d'accès.

**Independent Test**: Peut être testé avec des données mockées : afficher les 4 KPIs calculés, un donut, des barres vides et une liste vide de transactions.

**Acceptance Scenarios**:

1. **Given** l'app est ouverte, **When** l'utilisateur arrive sur le tableau de bord, **Then** il voit 4 cartes KPI, le donut, les barres budgétaires, les 5 dernières transactions et les objectifs.
2. **Given** le tableau de bord affiche le mois courant, **When** l'utilisateur clique "mois précédent", **Then** toutes les données budget/dépenses se rechargent pour le mois sélectionné — les objectifs restent inchangés.
3. **Given** l'utilisateur a renseigné son prénom et son genre, **When** le dashboard s'affiche pour la première fois dans la session, **Then** une salutation personnalisée et genrée apparaît avec un message IA contextuel en une phrase (non redéclenché sur les recalculs suivants).

---

### User Story 2 — Gestion du budget mensuel (Priority: P1)

L'utilisateur saisit ses sources de revenus (nom + montant) et ses postes budgétaires (nom + montant alloué) pour le mois. L'app calcule en temps réel le total alloué, le reste non alloué et le pourcentage de chaque poste. Au premier accès à un nouveau mois, les données du mois précédent sont recopiées automatiquement.

**Why this priority**: Le budget est la fondation de toutes les analyses. Sans données budgétaires, les KPIs, comparaisons et conseils IA sont inopérants.

**Independent Test**: Peut être testé en isolation en ajoutant revenus et postes, et en vérifiant les recalculs instantanés.

**Acceptance Scenarios**:

1. **Given** l'onglet Budget est ouvert, **When** l'utilisateur ajoute une source de revenu, **Then** le total des revenus se met à jour immédiatement.
2. **Given** des revenus sont saisis, **When** l'utilisateur ajoute un poste budgétaire, **Then** le total alloué, le reste non alloué et le % du poste s'actualisent en temps réel.
3. **Given** le mois précédent contient des revenus et postes, **When** l'utilisateur navigue vers un nouveau mois sans données, **Then** les revenus et postes du mois précédent sont automatiquement recopiés.
4. **Given** un montant est saisi dans une devise non-EUR, **When** il est enregistré, **Then** il est converti en EUR avec la précision fixe de la devise (2 décimales pour EUR/USD/GBP/CAD/MAD, 0 pour XOF) et stocké sans erreur d'arrondi.

---

### User Story 3 — Suivi des dépenses et revenus ponctuels (Priority: P1)

L'utilisateur ajoute des transactions (dépenses ou revenus ponctuels) avec description, catégorie, montant et date. Il filtre l'historique par catégorie, modifie ou supprime chaque transaction. Un graphique visualise la répartition des dépenses du mois par catégorie.

**Why this priority**: Sans suivi des dépenses réelles, le budget reste théorique et les KPIs "dépenses réelles" et "reste disponible" sont vides de sens.

**Independent Test**: Peut être testé en ajoutant, filtrant, modifiant et supprimant des transactions, puis en vérifiant le graphique.

**Acceptance Scenarios**:

1. **Given** l'onglet Dépenses est ouvert, **When** l'utilisateur ajoute une transaction "dépense", **Then** elle apparaît dans l'historique et les KPIs se mettent à jour.
2. **Given** l'onglet Dépenses est ouvert, **When** l'utilisateur ajoute un "revenu ponctuel", **Then** il s'additionne aux revenus du mois sans remplacer les revenus fixes.
3. **Given** plusieurs transactions existent, **When** l'utilisateur sélectionne un filtre de catégorie, **Then** seules les transactions de cette catégorie sont affichées.
4. **Given** une transaction existe, **When** l'utilisateur la modifie et confirme, **Then** les totaux et le graphique se mettent à jour immédiatement.
5. **Given** une transaction existe, **When** l'utilisateur la supprime, **Then** elle disparaît de l'historique et les totaux sont recalculés.

---

### User Story 4 — Objectifs d'épargne (Priority: P2)

L'utilisateur crée des objectifs d'épargne avec nom, montant cible, montant déjà épargné, date d'échéance et couleur. Il effectue des versements depuis sa carte de progression. Les objectifs persistent au-delà des mois et sont visibles sur le dashboard.

**Why this priority**: Les objectifs apportent la dimension long terme et augmentent l'engagement utilisateur, mais l'app reste fonctionnelle sans eux.

**Independent Test**: Peut être testé en créant un objectif, en effectuant des versements et en vérifiant la progression indépendamment du mois courant.

**Acceptance Scenarios**:

1. **Given** l'onglet Objectifs est ouvert, **When** l'utilisateur crée un objectif, **Then** il apparaît avec une barre de progression affichant le % atteint.
2. **Given** un objectif existe, **When** l'utilisateur effectue un versement, **Then** le montant épargné et la barre de progression se mettent à jour en temps réel.
3. **Given** l'utilisateur navigue entre plusieurs mois, **When** il revient sur les Objectifs, **Then** tous les objectifs sont intacts — leur chargement n'a pas été déclenché par le changement de mois.

---

### User Story 5 — Conseiller IA (Priority: P2)

L'utilisateur ouvre un chat avec un conseiller IA qui reçoit automatiquement le contexte financier du mois (revenus, budget, dépenses, objectifs). L'intégralité de l'historique de conversation est transmise à l'API à chaque appel. L'historique est sauvegardé et rechargé à chaque ouverture. Un bouton permet d'effacer la conversation.

**Why this priority**: Valeur différenciante de MyFinanx. Permet de transformer les données brutes en conseils personnalisés actionnables.

**Independent Test**: Peut être testé en envoyant plusieurs messages et en vérifiant que la réponse IA référence des données financières et le contexte des messages précédents.

**Acceptance Scenarios**:

1. **Given** l'onglet Conseiller IA est ouvert, **When** l'utilisateur envoie un message, **Then** la réponse IA tient compte des revenus, dépenses et objectifs du mois courant et de l'intégralité de l'historique de conversation.
2. **Given** une conversation avec plusieurs échanges existe, **When** l'utilisateur envoie un nouveau message, **Then** l'array history[] complet est transmis à l'API Groq — aucun message précédent n'est ignoré.
3. **Given** une conversation existe, **When** l'utilisateur ferme puis rouvre l'app, **Then** l'historique de la conversation est restauré.
4. **Given** une conversation existe, **When** l'utilisateur clique "Effacer la conversation", **Then** l'historique est supprimé et un message d'accueil vide s'affiche.

---

### User Story 6 — Multi-devise, thèmes et personnalisation (Priority: P3)

L'utilisateur choisit sa devise active parmi 6 options (EUR, USD, GBP, CAD, XOF, MAD) avec taux de change en direct. Il choisit parmi 3 thèmes visuels. Ses préférences sont persistées et restaurées au rechargement.

**Why this priority**: Fonctionnalités de personnalisation qui élargissent le public cible (utilisateurs hors zone euro) et améliorent l'expérience quotidienne.

**Independent Test**: Peut être testé en changeant la devise, en vérifiant la conversion des montants avec la précision correcte, puis en changeant le thème et en rechargeant la page.

**Acceptance Scenarios**:

1. **Given** l'utilisateur sélectionne USD, **When** il consulte le dashboard, **Then** tous les montants sont affichés en USD au taux du jour, arrondis à 2 décimales.
2. **Given** l'utilisateur sélectionne XOF, **When** il consulte le dashboard, **Then** tous les montants sont affichés en XOF arrondis à 0 décimale.
3. **Given** les taux ont été chargés il y a moins de 24h, **When** l'app s'ouvre, **Then** les taux sont lus depuis le cache local sans appel réseau.
4. **Given** l'utilisateur change de thème, **When** il recharge l'app, **Then** le thème sélectionné est automatiquement restauré.

---

### User Story 7 — PWA, export/import et reset (Priority: P3)

L'utilisateur installe MyFinanx comme une app native sur mobile ou desktop. Le prompt d'installation apparaît uniquement sur mobile. Il peut exporter toutes ses données en JSON, les réimporter avec validation, ou réinitialiser complètement l'app après une double confirmation.

**Why this priority**: Garantit la portabilité des données et la confiance de l'utilisateur dans l'app.

**Independent Test**: Peut être testé en exportant, réinitialisant, puis réimportant pour vérifier l'intégrité des données.

**Acceptance Scenarios**:

1. **Given** l'app est ouverte sur un mobile, **When** les conditions d'installation sont remplies, **Then** le prompt d'installation s'affiche (détection matchMedia pointer:coarse). Il n'apparaît jamais sur desktop Chrome.
2. **Given** l'app est installée, **When** l'appareil est hors ligne, **Then** l'app reste accessible grâce au cache Service Worker versionné automatiquement à chaque build.
3. **Given** l'utilisateur clique "Exporter", **When** le fichier est téléchargé, **Then** le JSON contient l'intégralité des données (budget, transactions, objectifs, préférences).
4. **Given** l'utilisateur importe un fichier JSON invalide, **When** la validation échoue, **Then** une erreur explicite s'affiche sans écraser les données existantes.
5. **Given** l'utilisateur initie un reset, **When** il confirme deux fois, **Then** toutes les données sont effacées et l'app revient à l'état initial (tutoriel inclus).

---

### Edge Cases

- Que se passe-t-il si le total des postes budgétaires alloués dépasse le total des revenus ?
- Que se passe-t-il si les taux de change sont indisponibles (hors ligne) et que le cache a expiré ? → Les montants sont affichés en EUR avec un avertissement visible.
- Que se passe-t-il si l'utilisateur importe un fichier JSON partiellement incomplet ou d'une version antérieure ?
- Que se passe-t-il si l'API du conseiller IA (Groq) est indisponible lors d'un envoi de message ?
- Que se passe-t-il si un objectif dépasse sa date d'échéance sans avoir atteint son montant cible ?
- Que se passe-t-il si l'utilisateur tente de saisir un montant négatif ou nul ?
- Que se passe-t-il si le localStorage est plein (QuotaExceededError) lors d'une sauvegarde ?
- Que se passe-t-il si le conteneur d'un graphique a une taille nulle au moment du premier rendu (ResizeObserver) ?

---

## Requirements *(mandatory)*

### Functional Requirements

**Dashboard**
- **FR-001**: L'app DOIT afficher un tableau de bord avec 4 cartes KPI : revenus du mois, dépenses réelles, reste disponible, budget non alloué.
- **FR-002**: Le tableau de bord DOIT inclure un graphique donut de répartition des dépenses par catégorie. Le graphique DOIT utiliser ResizeObserver pour calculer ses dimensions selon son conteneur — aucune dimension hardcodée en px n'est autorisée.
- **FR-003**: Le tableau de bord DOIT afficher des barres de progression pour chaque poste budgétaire. Les barres DOIVENT utiliser ResizeObserver pour calculer leurs dimensions selon leur conteneur.
- **FR-004**: Le tableau de bord DOIT lister les 5 dernières transactions du mois courant.
- **FR-005**: Le tableau de bord DOIT afficher la progression (montant et %) de chaque objectif d'épargne.
- **FR-006**: Le tableau de bord DOIT afficher une salutation personnalisée (prénom + accord genré) et un message IA contextuel en une phrase. Ce message DOIT être généré une seule fois par session, avec un debounce de 3 secondes et une invalidation par hash des données financières. Il ne DOIT PAS être redéclenché à chaque recalcul.
- **FR-007**: L'app DOIT permettre la navigation entre mois via des flèches "précédent" et "suivant". Un changement de mois DOIT recharger les données budget et dépenses, sans jamais déclencher le rechargement des objectifs d'épargne.

**Budget**
- **FR-008**: L'utilisateur DOIT pouvoir ajouter, modifier et supprimer des sources de revenus (nom + montant).
- **FR-009**: L'utilisateur DOIT pouvoir ajouter, modifier et supprimer des postes budgétaires (nom + montant alloué).
- **FR-010**: L'app DOIT calculer et afficher en temps réel : total des revenus, total alloué, reste non alloué, pourcentage par poste.
- **FR-011**: Lors de la navigation vers un nouveau mois sans données, l'app DOIT recopier automatiquement les revenus et postes budgétaires du mois précédent.
- **FR-012**: Si le total alloué dépasse le total des revenus, l'app DOIT afficher un avertissement visuel non-bloquant.

**Dépenses**
- **FR-013**: L'utilisateur DOIT pouvoir ajouter une transaction avec : description, catégorie, montant, date, type (dépense ou revenu ponctuel).
- **FR-014**: Un revenu ponctuel DOIT s'ajouter au total des revenus du mois sans remplacer les revenus fixes.
- **FR-015**: L'historique des transactions DOIT être filtrable par catégorie.
- **FR-016**: Chaque transaction DOIT être modifiable et supprimable.
- **FR-017**: L'onglet Dépenses DOIT afficher un graphique de répartition des dépenses par catégorie pour le mois courant. Le graphique DOIT utiliser ResizeObserver — aucune dimension hardcodée en px.

**Objectifs**
- **FR-018**: L'utilisateur DOIT pouvoir créer un objectif d'épargne avec : nom, montant cible, montant déjà épargné, date d'échéance, couleur.
- **FR-019**: L'utilisateur DOIT pouvoir effectuer un versement sur un objectif depuis sa carte de progression.
- **FR-020**: La progression de chaque objectif (montant épargné et %) DOIT se mettre à jour en temps réel après chaque versement.
- **FR-021**: Les objectifs DOIVENT persister indépendamment du mois courant. Leur chargement et sauvegarde DOIVENT être déclenchés par des actions utilisateur directes (création, versement, suppression), jamais par un changement de mois.

**Conseiller IA**
- **FR-022**: L'app DOIT proposer une interface de chat avec un conseiller IA.
- **FR-023**: Le contexte système injecté automatiquement DOIT inclure : revenus fixes, postes budgétaires, transactions et objectifs du mois courant.
- **FR-024**: L'historique de conversation DOIT être sauvegardé localement et restauré à chaque ouverture. L'intégralité de l'array history[] DOIT être transmise à l'API Groq à chaque appel — aucun message précédent n'est omis.
- **FR-025**: L'utilisateur DOIT pouvoir effacer l'historique de conversation via un bouton dédié.

**Multi-devise**
- **FR-026**: L'app DOIT proposer un sélecteur de devise : EUR, USD, GBP, CAD, XOF, MAD.
- **FR-027**: Les taux de change DOIVENT être récupérés via frankfurter.app et mis en cache pendant 24 heures.
- **FR-028**: Tous les montants affichés DOIVENT être convertis dans la devise active avec une précision fixe par devise : EUR, USD, GBP, CAD, MAD → 2 décimales ; XOF → 0 décimale.
- **FR-029**: Tous les montants DOIVENT être stockés en EUR (devise pivot). La conversion display→EUR à la saisie DOIT utiliser la même précision fixe par devise et ne DOIT produire aucune erreur d'arrondi.
- **FR-030**: En cas d'indisponibilité réseau et de cache expiré, l'app DOIT afficher les montants en EUR avec un avertissement visible.

**Thèmes**
- **FR-031**: L'app DOIT proposer 3 thèmes : bleu/sombre, violet/sombre, clair.
- **FR-032**: Le thème choisi DOIT être persisté en localStorage et restauré au rechargement de l'app.

**Export / Import / Reset**
- **FR-033**: L'utilisateur DOIT pouvoir exporter toutes ses données en fichier JSON téléchargeable.
- **FR-034**: L'utilisateur DOIT pouvoir importer un fichier JSON ; l'app DOIT valider le schéma avant toute écriture — aucune donnée existante n'est écrasée en cas d'erreur de validation.
- **FR-035**: L'app DOIT proposer un reset complet avec une confirmation en 2 étapes distinctes.

**PWA**
- **FR-036**: L'app DOIT être installable comme PWA sur mobile (iOS, Android) et desktop (Windows, macOS).
- **FR-037**: L'app DOIT fonctionner hors ligne pour la consultation des données via un Service Worker. Le cache DOIT être versionné automatiquement à chaque build via vite-plugin-pwa / Workbox — aucune incrémentation manuelle n'est autorisée.
- **FR-038**: Le prompt d'installation PWA (showPwaPopup) DOIT s'afficher uniquement sur les appareils mobiles, détectés via `matchMedia('(pointer: coarse)')`. Il ne DOIT jamais apparaître sur desktop Chrome.

**Notifications & Onboarding**
- **FR-039**: L'app DOIT intégrer les notifications push via OneSignal.
- **FR-040**: L'app DOIT afficher un tutoriel en 6 étapes au premier lancement, ignorable à tout moment via un bouton "Passer".
- **FR-041**: L'app DOIT afficher des rappels in-app intelligents, au maximum une fois par jour, basés sur la situation financière de l'utilisateur.

**Responsive Design & Navigation**
- **FR-042**: Les 3 breakpoints DOIVENT être définis comme variables CSS centralisées. La navigation DOIT être un composant HTML unique qui se transforme visuellement selon le breakpoint actif — sans duplication de HTML.
- **FR-043**: L'état de l'onglet actif DOIT reposer sur une source de vérité unique, synchronisée sur tous les composants de navigation (bottom bar mobile, sidebar tablette et desktop). Toute désynchronisation est interdite.
- **FR-044**: Sur mobile (< 768px) : navigation bottom bar fixe, layout colonne unique, cartes pleine largeur, modales plein écran pour la saisie. Tous les inputs DOIVENT avoir font-size ≥ 16px, y compris dans les composants imbriqués (wrappers .fw et autres), pour prévenir le zoom automatique iOS.
- **FR-045**: Sur tablette (768px–1199px) : sidebar gauche réduite (icônes + tooltip au survol), grille 2 colonnes, formulaires inline. Touch targets ≥ 44px.
- **FR-046**: Sur desktop (≥ 1200px) : sidebar gauche déployée (icônes + labels texte), grille multi-colonnes, tout le dashboard visible sans défilement, hover states et tooltips riches.

---

### Key Entities

- **Mois financier** : Période de référence (année + mois). Contient les revenus fixes et les postes budgétaires du mois.
- **Source de revenu** : Revenu récurrent mensuel (nom, montant en EUR, devise de saisie originale).
- **Poste budgétaire** : Allocation mensuelle pour une catégorie de dépense (nom, montant alloué en EUR, catégorie).
- **Transaction** : Mouvement financier ponctuel (description, catégorie, montant en EUR, date, type : dépense ou revenu ponctuel).
- **Objectif d'épargne** : Cible financière long terme (nom, montant cible en EUR, montant épargné en EUR, date d'échéance, couleur). Indépendant du mois — chargé et sauvegardé dans un cycle propre, jamais déclenché par la navigation mensuelle.
- **Conversation IA** : Historique de messages (rôle : utilisateur ou assistant, contenu, horodatage), persisté localement. L'intégralité de l'historique est transmise à l'API Groq à chaque appel.
- **Préférences utilisateur** : Prénom, genre, devise active, précision d'affichage par devise (EUR/USD/GBP/CAD/MAD = 2 décimales ; XOF = 0), thème, statut du tutoriel, date du dernier rappel in-app, hash des données financières pour invalidation du greeting IA.
- **Cache taux de change** : Taux EUR→devise pour les 6 devises supportées, horodatage de chargement, durée de validité 24h.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: L'utilisateur peut saisir ses revenus et son budget mensuel complet en moins de 3 minutes.
- **SC-002**: Tous les calculs (totaux, pourcentages, KPIs) se mettent à jour en moins d'une seconde après chaque saisie.
- **SC-003**: L'application est installable et consultable hors ligne sur iOS, Android, Windows et macOS.
- **SC-004**: Les taux de change sont servis depuis le cache local pendant 24 heures sans appel réseau additionnel.
- **SC-005**: Le tutoriel d'onboarding peut être complété ou ignoré en moins de 2 minutes.
- **SC-006**: Le conseiller IA produit une réponse contextuelle (avec historique complet) en moins de 10 secondes dans des conditions normales de connectivité.
- **SC-007**: Un export suivi d'un import restaure 100 % des données sans perte ni erreur d'arrondi.
- **SC-008**: L'interface s'adapte sans perte de contenu fonctionnel sur les 3 breakpoints (mobile, tablette, desktop).
- **SC-009**: Les rappels in-app n'apparaissent pas plus d'une fois par jour par utilisateur.
- **SC-010**: Le message IA du dashboard n'est généré qu'une fois par session, quelle que soit la fréquence des recalculs.
- **SC-011**: La conversion devise→EUR ne produit aucune erreur d'arrondi visible pour l'utilisateur, en respectant la précision fixe par devise.

---

## Assumptions

- L'application est mono-utilisateur : aucune synchronisation multi-appareils ni authentification en ligne n'est prévue.
- Toutes les données sont stockées localement sur l'appareil (localStorage) ; aucune base de données distante n'est requise.
- L'EUR est la devise pivot : tous les montants sont convertis en EUR avant stockage. La précision par devise est fixe : EUR, USD, GBP, CAD, MAD → 2 décimales ; XOF → 0 décimale.
- Les catégories de dépenses sont prédéfinies (ex. Alimentation, Transport, Logement, Loisirs…) avec possibilité d'en ajouter des personnalisées.
- Le conseiller IA utilise l'API Groq ; une connexion internet est requise pour cette seule fonctionnalité.
- La salutation IA du dashboard est générée une fois par session (avec debounce 3s et invalidation par hash) — elle n'est pas recalculée lors des recalculs financiers intra-session.
- Les montants nuls ou négatifs ne sont pas autorisés dans les revenus, postes budgétaires et objectifs.
- Le tutoriel au premier lancement est ignorable à tout moment via un bouton "Passer".
- L'application est entièrement en français ; aucune internationalisation multi-langue n'est prévue dans cette version.
- OneSignal est configuré côté projet ; l'utilisateur doit accepter les permissions de notification au premier lancement.
- La détection mobile pour le prompt PWA repose sur `matchMedia('(pointer: coarse)')`.
- Les graphiques (donut, barres) n'ont aucune dimension hardcodée : toutes les dimensions sont calculées via ResizeObserver.
- Le versionnage du Service Worker est entièrement délégué à vite-plugin-pwa / Workbox ; aucun numéro de version n'est maintenu manuellement.
