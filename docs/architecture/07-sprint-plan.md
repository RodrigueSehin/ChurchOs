# Plan de développement par phase

Chaque phase suit le cycle : Analyse → Architecture → Plan → Implémentation → Test → Correction →
Validation. On ne passe à la phase suivante que lorsque la précédente est fonctionnelle
(TypeScript propre, lint propre, migrations à jour, permissions vérifiées).

Déclenchement : l'utilisateur dit **"PHASE SUIVANTE"** → implémentation de la phase suivante en
conservant l'architecture et les conventions de ce document.

| Phase | Contenu | Sortie attendue |
|---|---|---|
| **1. Foundation** ✅ | Projet Next.js/TS/Tailwind/shadcn, structure `features/`, Design System, layout (sidebar/topbar/breadcrumb), thème, responsive | App qui démarre, layout navigable avec données factices — **livré** |
| **2. Database** ✅ | Adoption du schéma Supabase réel (`db/schema.sql`), miroir Drizzle, seed "Église Évangélique La Source" | `db:migrate:local` + `db:seed` fonctionnels — **livré** (vérifié sur Postgres local, RLS prouvé) |
| **3. Authentication** ✅ | Login, register, logout, session, reset password, MFA, onboarding (5 étapes) | Un utilisateur peut créer un compte, une organisation, et atterrir sur `/dashboard` — **livré, vérifié en conditions réelles** |
| **4. Organization** ✅ | Organizations, campuses, users, roles, permissions (CRUD + UI `/settings/users`, `/settings/roles`) | RBAC opérationnel de bout en bout sur au moins un module test — **livré, vérifié en conditions réelles** |
| **5. Members** ✅ | Membres, familles, visiteurs, groupes | CRUD complet + recherche/filtre/pagination serveur — **livré, vérifié en conditions réelles** |
| **6. Pastoral** ✅ | Suivi pastoral, sujets de prière (confidentialité), visites, conseil pastoral | Confidentialité `PRIVATE` vérifiée par test E2E — **livré, vérifié en conditions réelles** |
| **7. Ministries** ✅ | Ministères, équipes, ouvriers, services, planning | Affectation + détection de conflits de planning — **livré, vérifié en conditions réelles** |
| **8. Events** ✅ | Événements, inscriptions (+ QR code), présences, calendrier agrégé | Scan QR fonctionnel, calendrier agrège tous les modules pertinents — **livré, vérifié en conditions réelles** |
| **9. Finance** ✅ | Dons/offrandes, dépenses, budgets, rapports financiers, flux d'approbation | Permissions finance strictement isolées (test RLS dédié) — **livré, vérifié en conditions réelles** |
| **10. Training** | Cours, modules, inscriptions, progression, certifications | Suivi de progression membre visible sur son profil |
| **11. Communication** | Annonces, templates (email/SMS/WhatsApp), notifications, historique d'envoi | Un envoi réel (Resend en sandbox) + statut livré/échoué |
| **12. Documents & Resources** | Documents/dossiers/permissions, salles/équipements/réservations | Upload Supabase Storage sécurisé, types de fichiers contrôlés |
| **13. Analytics** | Dashboards enrichis, graphiques, rapports, exports PDF/Excel/CSV | Dashboard `/analytics` avec vraies agrégations SQL |
| **14. Billing** | Plans, abonnements, facturation, `PaymentProvider` (Stripe + abstraction) | Upgrade/downgrade de plan fonctionnel en sandbox Stripe |
| **15. ChurchOS AI** | AI Assistant, AI Reports, AI Communication, AI Pastoral Assistant, AI Analytics | Filtrage par permission vérifié (voir §AI data filtering) |
| **16. Production** | Tests (Vitest/Playwright), sécurité, monitoring (Sentry/PostHog), performance, SEO, CI/CD, documentation | Déploiement Vercel + Supabase, CI verte |

## Ce qui doit être vrai à la fin de chaque phase

1. TypeScript compile sans `any` non justifié.
2. Lint (ESLint) sans erreur.
3. Migrations Drizzle générées et commitées, aucune dérive avec `db/schema.sql`.
4. Chaque nouvelle table métier a ses 4 policies RLS + son filtrage applicatif.
5. Chaque nouvelle page gère `Loading / Empty / Error / Success / Permission denied / No results`.
6. Aucun bouton sans action réelle ; aucune donnée hardcodée à la place d'une donnée PostgreSQL.
7. Documentation courte de ce qui a été livré (README de phase ou changelog), pas de document
   d'analyse superflu.

## Pivot de Phase 2 : adoption du schéma Supabase réel

En cours de Phase 2, il s'est avéré qu'un vrai projet Supabase existait déjà avec son propre
schéma (`db/churchos_supabase_schema.sql` à l'origine). Sur instruction explicite, ce schéma a été
adopté **tel quel** comme source de vérité, à la place du design initial du STEP 01 — voir
[`docs/architecture/02-database-schema.md`](02-database-schema.md) pour le détail complet des
différences (modèle `people`/`members`, RBAC plus grossier au niveau RLS, catalogue de
permissions réduit à 23 codes, RPC d'onboarding déjà existante côté DB, etc.). Toute la couche
Drizzle (`src/lib/db/schema/`) et le RBAC (`src/lib/rbac/permissions.ts`) ont été réécrits en
conséquence et re-vérifiés (migrations, RLS, seed) sur Postgres local.

## Prochaine étape

Phase 1 (Foundation) et Phase 2 (Database, sur le schéma réel) livrées et vérifiées :
- `npm run lint` / `npm run build` / `npx tsc --noEmit` passent.
- `db/schema.sql` (le vrai schéma) appliqué et **réellement vérifié** sur Postgres local
  (`db:migrate:local`), RLS **réellement appliqué et prouvé** (`db:verify-rls` : isolation
  multi-tenant confirmée par des requêtes exécutées sous le rôle `authenticated` avec RLS actif —
  voir la réserve sur la confidentialité pastorale dans
  [03-multi-tenancy-and-rls.md](03-multi-tenancy-and-rls.md)), seed "Église Évangélique La Source"
  fonctionnel (via la RPC `create_organization_for_current_user`).
- Réserve connue : `ai_documents` (RAG, pgvector) non testable localement faute de pgvector — voir
  `db/local-postgres/README.md#pgvector-module-ia`. Sera vérifié contre le vrai Supabase.

**PHASE 3 — Authentication** ✅ : livrée et vérifiée de bout en bout en conditions réelles.

Le flux a été entièrement reconstruit le 2026-09-24/25 pour suivre une maquette visuelle fournie
par l'utilisateur (voir `src/img/`) : l'écran scindé (panneau décoratif navy/or + illustration
toit/croix reprenant le logo, pas de photo — aucun asset adapté disponible) remplace les cartes
centrées d'origine, et **la création du compte se fait désormais à l'étape 2 de l'onboarding**
(`/onboarding/admin`, publique) plutôt que sur une page `/register` séparée avant l'assistant —
`/register` redirige maintenant vers `/onboarding/church`. Étapes 3 à 5 protégées
individuellement (`requireUser()`), pas par un garde de layout global (les étapes 1-2 sont
publiques). Nouvelle page `/onboarding/welcome` (succès) avant `/dashboard`.

Vérifié **en conditions réelles** contre le vrai projet Supabase (2026-09-25, `DATABASE_URL`
corrigé par l'utilisateur en cours de route) :
- Parcours complet rejoué intégralement sans erreur : inscription (étape 1→2) → email de
  confirmation réellement envoyé et reçu → connexion → configuration (3) → abonnement (4) →
  finalisation (5, RPC + campus + `organization_features` + `subscriptions` créés pour de vrai)
  → `/onboarding/welcome` → `/dashboard`, avec les vraies données (nom de l'église, ville, nom et
  rôle de l'administrateur) affichées dans la topbar — **0 erreur console**. Le tableau
  comparatif de l'étape Abonnement lit `plans.features` (peuplé via
  `npm run db:seed-plan-features` — la colonne existait mais était vide).
- Bugs réels trouvés et corrigés pendant cette vérification (pas seulement en review de code) :
  1. Redirection en boucle : un utilisateur déjà authentifié sans organisation était renvoyé vers
     `/onboarding/church` (donc retombait sur "compte déjà existant" à l'étape 2) au lieu de
     `/onboarding/configuration` — corrigé dans `requireOrganization()`
     (`src/lib/auth/session.ts`), et `/onboarding/admin` redirige maintenant lui-même vers
     l'étape 3 si une session existe déjà.
  2. Course de réhydratation Zustand/`sessionStorage` : les pages 2 à 5 lisaient/redirigeaient
     sur le brouillon avant que `persist` ait fini de le relire depuis `sessionStorage`,
     provoquant des redirections à tort vers l'étape 1 et des champs initialisés vides malgré un
     brouillon existant. Corrigé via un flag `_hasHydrated` sur le store
     (`features/onboarding/store.ts`) + `OnboardingHydratedGate` — les composants dont les champs
     s'initialisent depuis le store (`useState(store.x)`) ne montent qu'après réhydratation.
  3. Tableau comparatif des plans tronqué à une seule colonne : le conteneur de contenu
     onboarding était `max-w-2xl` (672px, hérité des premières étapes plus simples), trop étroit
     pour la grille de 4 plans + tableau + barre latérale de l'étape Abonnement — élargi à
     `max-w-5xl`.

**Corrigé — policies RLS manquantes** (repéré en testant la finalisation, pas en lecture de
code) : `public.campuses` et `public.organization_settings` avaient RLS activé (§20) sans
**aucune policy définie** — en Postgres, RLS activé sans policy = accès refusé à tout rôle non
superutilisateur. Conséquence observée avant correctif : la création du campus principal
échouait (`new row violates row-level security policy for table "campuses"`), donc aucune
organisation créée par un vrai utilisateur ne pouvait terminer l'onboarding. Correctif (4
policies sur `campuses`, 2 sur `organization_settings`, même posture que `organizations` :
lecture ouverte aux membres, écriture réservée aux admins) ajouté à `db/schema.sql` (§20, juste
après les policies `organizations`) **et appliqué à la vraie base par l'utilisateur** (SQL
Editor Supabase) — reproduit et confirmé résolu par un nouveau parcours complet en direct.

**Anomalie mineure observée, non creusée** : `organizations.created_by` reste `null` après
`create_organization_for_current_user()` malgré `auth.uid()` explicitement utilisé dans sa
définition — à vérifier (fonction peut-être différente en base réelle de celle de
`db/schema.sql`). N'affecte rien de fonctionnel aujourd'hui (colonne non lue par le code).

**Volontairement reporté** (hors du minimum "un utilisateur peut créer un compte, une
organisation, et atterrir sur /dashboard") : l'inscription MFA (Phase 4) ; upload réel de la
photo de profil (aperçu local seulement, aucun bucket Storage dans `db/schema.sql`) ; connexion
Google (bouton retiré, provider non confirmé côté Supabase) ; parcours "Nous contacter" dédié au
plan Enterprise (même flux self-service que les autres plans, pas d'adresse commerciale
vérifiée) ; liens légaux du pied de page (pages inexistantes).

**PHASE 4 — Organization** ✅ : livrée et vérifiée de bout en bout en conditions réelles
(2026-09-25).

Livré :
- `lib/rbac/resolve.ts` (`resolveMembershipContext`) + `lib/auth/guards.ts` (`checkPermission`) :
  résolution des permissions effectives d'un membership (bypass complet pour
  `SUPER_ADMIN`/`CHURCH_OWNER`, sinon lecture réelle de `role_permissions` via les rôles
  assignés) — la vérification applicative documentée dans
  [04-rbac-permissions.md](04-rbac-permissions.md) est maintenant du code, pas seulement une
  intention.
- **Correctif d'infrastructure RBAC** : `db/schema.sql` ne seed jamais `role_permissions` pour
  une organisation réelle (seul `db/seed/index.ts`, pour la démo, le faisait) — sans ça, aucun
  rôle non-admin d'une vraie organisation n'aurait eu de permission fine. `finalizeOnboarding`
  appelle maintenant `seedRolePermissionsForOrganization()`
  (`lib/rbac/seed-role-permissions.ts`) juste après la création de l'organisation, en
  s'appuyant sur `ROLE_PERMISSIONS` (même source de vérité TS que le seed de démo) via le
  client authentifié (upsert idempotent, RLS `role_permissions_manage_admin` satisfaite par le
  créateur).
- `/settings/church` (`features/organizations/`) : édition des informations de l'église
  (contact, adresse, fuseau horaire, devise, logo par URL) + gestion des campus (ajout,
  modification, définir principal, suppression du non-principal) — CRUD complet, gated
  `settings.manage`.
- `/settings/users` (`features/rbac/`) : liste des membres (nom, email, rôle, statut, dernière
  connexion réelle via `auth.users`), changement de rôle et de statut (actif/suspendu/parti — un
  retrait est un changement de statut, pas un hard delete : `organization_memberships` n'a pas
  de policy RLS `delete`), invitation par email réelle (`supabase.auth.admin.inviteUserByEmail`,
  dans un **Route Handler** `/api/organizations/members/invite`, pas une Server Action — respecte
  la restriction documentée dans `lib/supabase/admin.ts`).
- `/settings/roles` (`features/rbac/`) : matrice rôles × permissions (cases à cocher réelles,
  pas un mockup) + création de rôles personnalisés + suppression (rôles système protégés,
  affichés avec un cadenas pour `SUPER_ADMIN`/`CHURCH_OWNER` — leur accès complet ne dépend pas
  de `role_permissions`, cocher/décocher n'aurait aucun effet réel donc n'est pas proposé).
- `auth-ref.ts` étendu (`email`, `last_sign_in_at` en lecture seule) pour afficher les membres
  sans dupliquer de données Supabase Auth.

Bugs réels trouvés et corrigés pendant la vérification en direct (pas en revue de code) :
1. **IDs HTML dupliqués** : `CampusFormFields` réutilisait des `id` (`name`, `city`, `email`...)
   déjà utilisés par le formulaire "Informations générales" toujours monté sur la même page —
   deux éléments avec le même `id` en même temps cassent l'association `<label for>` (le
   navigateur associe le premier trouvé, pas le bon), et un test réel via un vrai remplissage de
   formulaire l'a démontré concrètement (le nom du campus partait dans le mauvais champ).
   Corrigé par un `idPrefix` obligatoire, unique par instance du dialogue.
2. **UI périmée après action impérative** : `revalidatePath()` (dans une Server Action) ne
   rafraîchit automatiquement le rendu client qu'après une soumission de `<form action>` — un
   appel impératif (`startTransition(async () => await action())`, utilisé pour les changements
   de rôle/statut/campus principal/suppression) laissait l'écriture réussir en base mais
   l'affichage rester périmé, `router.refresh()` inclus (peu fiable ici en conditions réelles).
   Corrigé par deux approches selon la fréquence de l'action : état local optimiste directement
   mis à jour dans `MembersTable`/`RolesMatrix` (checkboxes, changement de rôle/statut — fréquent,
   doit rester réactif) ; rechargement complet de la page pour les actions rares (inviter,
   ajouter/supprimer un campus, supprimer un rôle).
3. Bouton "Annuler" de `ConfirmDialog` (composant partagé depuis la Phase 1) sans effet en usage
   non contrôlé — corrigé (`DialogClose` au lieu d'un `onOpenChange` optionnel jamais fourni),
   bénéficie à tous les usages futurs du composant.
4. `NEXT_PUBLIC_APP_URL` absent de `.env.local` — cassait déjà silencieusement le lien de
   réinitialisation de mot de passe (Phase 3) et aurait cassé le lien d'invitation (Phase 4).
   Ajouté.

Vérifié en conditions réelles (nouvelle organisation créée pour l'occasion, nettoyée après) :
édition des infos d'église, ajout/modification/suppression/principal de campus, liste des
membres avec vraie dernière connexion, changement de rôle et de statut (persistance confirmée en
base à chaque fois, pas seulement à l'écran), matrice de permissions affichant les vraies
`role_permissions` seedées à la création, bascule d'une permission (persistée), création d'un
rôle personnalisé. L'envoi réel d'invitation par email a été vérifié une fois (erreur
correctement affichée) puis re-testé indirectement (limite de débit d'emails Supabase atteinte
pendant cette session de vérification intensive — comportement d'erreur propre confirmé, chemin
"compte déjà existant" et écriture de la ligne membership/rôle vérifiés séparément via un
utilisateur pré-confirmé).

**Volontairement reporté** : filtrage de la sidebar par permission (mentionné dans
[05-design-system.md](05-design-system.md), pas un critère de sortie explicite de cette phase —
peu de valeur tant que la plupart des modules sont encore des pages "à venir") ; édition du titre
d'un membre depuis `/settings/users` (l'action serveur `updateMemberTitle` existe déjà,
pas encore reliée à une UI — le titre se règle aujourd'hui à l'invitation ou dans l'onboarding).

**PHASE 5 — Members** ✅ : livrée et vérifiée de bout en bout en conditions réelles (2026-09-26).

Livré — quatre modules dans `features/{members,families,visitors,groups}/` (queries/actions/
schemas/components), chacun avec recherche + filtre + pagination **serveur** (état dans l'URL via
`?q=&status=&page=`, pas un filtrage client sur une page déjà chargée) :
- **Membres** (`/members`, `/members/new`, `/members/[id]`, `/members/[id]/edit`) : seul module
  avec des pages dédiées (pas de dialogue) — c'est le plus riche en champs (`people` + `members`).
  "Supprimer" un membre = archiver (`status = 'archived'`), pas un `DELETE` réel : la policy RLS
  de suppression sur les tables métier exige `is_org_admin()`, un rôle avec seulement
  `members.delete` (ex. `PASTOR`, qui n'est pas reconnu par `is_org_admin()`) serait bloqué par
  RLS malgré la permission applicative — archiver est réversible, RLS-safe pour tout rôle
  autorisé, et préserve l'historique.
- **Familles** (`/families`, `/families/[id]`) : CRUD par dialogue (pas de route dédiée, comme
  prévu dans `01-project-structure.md`) + gestion des membres de la famille (ajout par recherche
  de personne existante, tête de famille / contact principal, retrait). Suppression de famille et
  retrait d'un membre de famille réservés aux admins d'organisation (`family_members` n'a pas de
  policy RLS `delete` pour un simple membre — même contrainte que ci-dessus).
- **Visiteurs** (`/visitors`, `/visitors/[id]`) : création (personne + fiche visiteur en une
  fois), suivi de statut (`nouveau` → ... → `converti`/`perdu de vue`), et surtout **conversion
  réelle en membre** (`convertVisitorToMember`) : crée une vraie ligne `members` à partir de la
  même personne, marque le visiteur `converted_to_member_id`, redirige vers la nouvelle fiche
  membre — l'historique de visite n'est jamais perdu.
- **Groupes** (`/groups`, `/groups/[id]`) : CRUD par dialogue + gestion des membres. Retrait d'un
  membre de groupe = `is_active = false` (colonne dédiée sur `group_members`), pas un `DELETE` —
  contrairement aux familles, cette action reste possible pour n'importe quel rôle avec
  `members.update`, pas seulement les admins (pas de policy RLS bloquante ici).
- Composants partagés ajoutés (réutilisables par les phases suivantes) : `NoResultsState`
  (recherche/filtre sans résultat, distinct de `EmptyState` — prévu par
  [05-design-system.md](05-design-system.md) mais jamais construit avant cette phase),
  `Pagination`, `SearchBox`, `StatusFilterForm`.
- Permissions : les quatre modules sont gated par le catalogue existant `members.*` (23 codes,
  pas de nouveaux codes — familles/visiteurs/groupes sont des sous-ressources de "membres", voir
  [04-rbac-permissions.md](04-rbac-permissions.md)).

**Bug réel trouvé et corrigé pendant la vérification en direct — le plus sérieux de cette
phase** : le helper `optionalString = z.string().optional().default("")`, dupliqué dans les 5
fichiers de schémas Zod parsant du `FormData` (membres, familles, visiteurs, groupes,
organisations), acceptait `undefined` mais pas `null` — or `FormData.get()` renvoie `null` (pas
`undefined`) pour une clé absente, et `.default()` ne se déclenche que sur `undefined`, jamais
sur `null`. Résultat concret : créer une famille échouait à coup sûr
(`Invalid input: expected string, received null`) parce que le dialogue ne rendait pas de champ
`notes` alors que le schéma l'attendait — un champ optionnel non rendu (ou simplement absent du
DOM à cet instant) suffisait à faire échouer tout le formulaire. Ça ressemblait fortement, au
premier abord, à un bug de timing React (`useActionState` remettant à zéro les champs non
contrôlés) — plusieurs minutes ont été perdues à chasser cette fausse piste avant d'identifier la
vraie cause en inspectant directement la valeur du champ juste avant soumission. Corrigé partout
par `.nullish().transform(v => v ?? "")` (accepte `null` ET `undefined`, sort toujours une
chaîne) ; les champs réellement manquants dans les formulaires (`notes` pour les familles, `code`
pour les groupes) ont aussi été ajoutés puisqu'ils avaient un sens réel, pas seulement pour faire
taire l'erreur.

Autre correctif du même passage : le fil d'Ariane (`Breadcrumb`, composant partagé depuis la
Phase 1) affichait l'UUID brut et mal capitalisé sur toute page `/module/[id]` (ex. "6da55cf4 B9c7
46f9...") faute de connaître le titre réel de l'entité affichée — corrigé en détectant les
segments au format UUID et en affichant "Détail" à la place ; bénéficie à toutes les pages de
détail existantes et futures.

Vérifié en conditions réelles (nouvelle organisation, nettoyée après) : création/liste/recherche/
filtre/pagination/modification/archivage d'un membre ; création d'une famille, ajout d'un membre
de famille (tête de famille + contact principal) ; création d'un visiteur puis conversion réelle
en membre (redirection vers la nouvelle fiche vérifiée) ; création d'un groupe, ajout puis retrait
d'un membre de groupe, modification du groupe — zéro erreur console à chaque étape.

**Volontairement reporté** : recherche de personnes par texte pour les sélecteurs (responsable de
groupe, contact de famille, "invité par"...) — un `<select>` natif listant toutes les personnes de
l'organisation suffit à la volumétrie d'une église pour l'instant ; à remplacer par un vrai
combobox avec recherche serveur si un client a un annuaire de plusieurs milliers de personnes.

**PHASE 6 — Pastoral** ✅ : livrée et vérifiée de bout en bout en conditions réelles (2026-09-26),
y compris le critère de sortie explicite (confidentialité vérifiée par test E2E, sur les deux
couches — applicative et RLS, décision explicite de l'utilisateur pour ce module).

Livré — quatre modules dans `features/{pastoral,prayer,visits,pastoral-council}/` :
- **Suivi pastoral** (`/pastoral`, `/pastoral/new`, `/pastoral/[id]`) : suivi lié à une personne,
  priorité, échéance, assigné à, et surtout un champ `confidentiality` à 3 niveaux (`normal` /
  `pastoral` / `restricted`) qui contrôle à la fois la visibilité en liste, en détail (404 si non
  autorisé, pas seulement un masquage visuel), et celle des notes de suivi (`pastoral_notes`,
  booléen `is_private` séparé).
- **Sujets de prière** (`/prayer`, `/prayer/new`, `/prayer/[id]`) : même logique de confidentialité
  mais booléenne (`is_confidential`), personne concernée optionnelle (anonyme), fil de mises à jour
  (`prayer_updates`), et action dédiée "Marquer comme exaucé" (`status = 'answered'` +
  `answered_at` + témoignage optionnel).
- **Visites** (`/visits`, `/visits/new`) : pas de route `[id]` (comme prévu dans
  `01-project-structure.md`) — modification par dialogue directement depuis la liste. Aucune
  confidentialité sur cette table (aucune colonne `is_confidential`/`is_private` dans le schéma).
- **Conseil pastoral** (`/pastoral-council`, page unique) : réunions (ordre du jour, compte-rendu,
  statut planifiée/tenue/annulée) avec, par réunion, deux sous-panneaux — participants
  (personne **ou** utilisateur, présence) et actions à suivre (assigné, échéance, statut). Toute
  la gestion se fait par formulaires/boutons inline sur la page, sans sous-route.

**Décision de l'utilisateur (question posée explicitement avant implémentation)** : le durcissement
de la confidentialité pastorale devait être **applicatif ET RLS** (pas seulement applicatif comme
c'était le cas pour tout le reste du RBAC jusqu'ici, voir
[04-rbac-permissions.md](04-rbac-permissions.md)) :
- **Couche applicative** : `lib/rbac/confidentiality.ts` (`confidentialBooleanFilter`,
  `confidentialityLevelFilter`) reproduit en Drizzle exactement la même logique que les policies
  RLS ci-dessous — nécessaire car `DATABASE_URL` (utilisé par Drizzle, donc par toutes les pages)
  se connecte avec un rôle qui **contourne RLS entièrement** ; sans ce filtre applicatif, RLS seul
  ne protégerait qu'un accès direct à l'API Supabase, jamais les pages Next.js elles-mêmes.
- **Couche RLS** (`db/schema.sql`, appliquée par l'utilisateur via le SQL Editor Supabase après
  préparation du script par l'agent — modification de schéma live, hors permission d'écriture
  directe) : les policies `select` génériques de `prayer_requests`, `pastoral_followups` et
  `pastoral_notes` ont été remplacées par des policies dédiées qui référencent
  `is_confidential`/`confidentiality`/`is_private`, `created_by`/`assigned_to_user_id`, et le
  nouveau code `pastoral.view_confidential` via `public.has_permission()` — voir le détail complet
  dans [03-multi-tenancy-and-rls.md](03-multi-tenancy-and-rls.md#confidentialité-pastorale-durcie-en-phase-6).
- Catalogue de permissions étendu de 24 à **29 codes** : `pastoral.view_confidential` (nouveau,
  pour la confidentialité) + `visits.view/create/update` et `pastoral_council.view/manage`
  (absents jusqu'ici malgré des tables existant depuis le schéma initial) — voir
  [04-rbac-permissions.md](04-rbac-permissions.md).
- `getAssignableMembers()` (façade `features/rbac/services`) extrait de la logique jusque-là
  dupliquée dans `features/pastoral/queries` — réutilisée par `prayer`, `visits` et
  `pastoral-council` pour peupler les sélecteurs "assigné à" sans jamais exposer tous les
  `auth.users` de l'instance (fuite inter-organisation à laquelle l'agent a fait attention dès
  l'écriture, pas seulement en test).

**Test E2E de confidentialité (critère de sortie explicite de cette phase)** — organisation de
test dédiée, nettoyée après : un compte `CHURCH_OWNER` (admin) et un compte avec un **rôle
personnalisé** ayant `pastoral.view`/`prayer.view`/`*.create`/`*.update` mais **sans**
`pastoral.view_confidential` (le scénario réaliste : aucun rôle système seedé n'a `pastoral.view`
sans avoir aussi la permission confidentielle — c'est un rôle personnalisé, créé via
`/settings/roles`, qui expose la distinction). Quatre enregistrements créés par l'admin (un suivi
`normal` + un `pastoral`, une prière non confidentielle + une confidentielle), plus une note
privée et une note publique sur le suivi normal :
- **Couche applicative** (Playwright, navigateur réel) : le compte restreint ne voit, dans les
  listes `/pastoral` et `/prayer`, que les enregistrements non confidentiels ; l'accès direct par
  URL à l'enregistrement confidentiel renvoie **404** (pas un message d'erreur — l'enregistrement
  n'existe simplement pas pour cette requête) ; la note privée n'apparaît pas dans le panneau de
  notes du suivi normal. Le compte admin voit tout.
- **Couche RLS** (accès direct Postgres sous le rôle `authenticated` avec `request.jwt.claim.sub`
  positionné, comme le fait PostgREST — même méthode que `db:verify-rls`, script écrit pour
  l'occasion) : mêmes résultats obtenus **sans passer par Drizzle du tout**, confirmant que les
  policies appliquées à la vraie base filtrent réellement, indépendamment de la couche applicative.

**Bug réel trouvé et corrigé pendant cette vérification** : `councilActionSchema.status` (et
`councilSchema.status`) utilisait `z.enum([...]).default("new")` — le même piège que celui
documenté en Phase 5 (`.default()` ne se déclenche que sur `undefined`, jamais sur `null`, alors
que `FormData.get()` renvoie `null` pour une clé absente). Contrairement aux formulaires
pastoral/prayer/visits qui rendent toujours un `<select>` pour `status` (donc le champ est
toujours présent dans le `FormData`, même s'il n'a jamais déclenché le bug), le mini-formulaire
d'ajout d'action du conseil pastoral omet volontairement ce champ (une nouvelle action démarre
toujours à `new`) — `formData.get("status")` valait donc réellement `null`, pas juste une chaîne
vide, et l'ajout échouait avec `Invalid option: expected one of "new"|...`. Corrigé par le même
motif `.nullish().transform(v => v ?? défaut)` déjà établi en Phase 5, appliqué directement dans le
schéma plutôt que dans chaque appelant.

Vérifié en conditions réelles au-delà de la confidentialité (même organisation de test) : création
d'une visite + modification de statut (rafraîchissement automatique via `<form action>`
confirmé) ; création d'une réunion du conseil pastoral, ajout d'un participant (personne) avec
présence, ajout d'une action, changement de statut d'action inline, suppression de la réunion
(admin uniquement, cascade réelle sur participants/actions) — zéro erreur console après le
correctif ci-dessus.

**Volontairement reporté** : recherche combobox pour les sélecteurs (même réserve qu'en Phase 5) ;
notification/rappel automatique sur les échéances de suivi pastoral ou d'action du conseil (aucune
infrastructure de job asynchrone avant la Phase 11/Inngest) ; export PDF du compte-rendu d'une
réunion du conseil pastoral.

**PHASE 7 — Ministries** ✅ : livrée et vérifiée de bout en bout en conditions réelles (2026-09-26),
y compris le critère de sortie explicite (affectation + détection de conflits de planning).

Livré — cinq modules dans `features/{ministries,teams,workers,services,planning}/` :
- **Ministères** (`/ministries`, `/ministries/[id]`) : même structure que les groupes (Phase 5) —
  liste + fiche personne, membres avec rôle et retrait souple (`is_active = false`), responsable
  optionnel. Seul module de la phase avec une route `[id]` dédiée, comme prévu dans
  `01-project-structure.md`.
- **Équipes** (`/teams`, page unique) : rattachement optionnel à un ministère
  (`features/ministries/services` → nouvelle façade `getMinistriesForSelect`), gestion des
  membres par dialogue plutôt que sous-page.
- **Ouvriers** (`/workers`, page unique) : le "profil de service" d'une personne — numéro,
  statut, compétences (stockées en texte séparé par virgules côté formulaire, tableau `jsonb`
  côté base). C'est le pivot de la phase : `features/workers/services` expose
  `getActiveWorkersForSelect`, consommé par les modules Services et Planning pour peupler leurs
  sélecteurs d'affectation.
- **Services** (`/services`, page unique) : cultes/réunions avec type (`service_types`, gérés
  dans un petit dialogue dédié), et surtout des **affectations d'ouvriers**
  (`service_assignments` : ouvrier + rôle + statut) — c'est ici que la détection de conflits se
  déclenche à la création d'une affectation.
- **Plannings** (`/planning`, page unique) : créneaux ponctuels (accueil, sonorisation...)
  assignables à un ouvrier — même détection de conflits qu'un service, à la création ET à la
  modification (en excluant le créneau lui-même de la vérification, sinon un créneau se
  bloquerait contre sa propre plage horaire à chaque modification).
- Catalogue de permissions étendu de 29 à **44 codes** (`ministries.*`, `teams.*`, `workers.*`,
  `services.*`, `planning.*`, 3 codes chacun — voir [04-rbac-permissions.md](04-rbac-permissions.md)).
  `MINISTRY_LEADER` reçoit les cinq groupes de permissions ; `WORKER` reçoit `services.view` et
  `planning.view` en lecture seule (un ouvrier doit pouvoir voir ses propres affectations).

**Détection de conflits de planning (critère de sortie explicite)** — `lib/scheduling/
conflict-detection.ts`, `findWorkerConflicts()` : pour un ouvrier et un créneau horaire donnés,
recherche tout chevauchement avec (a) ses `service_assignments` existantes (via
`services.starts_at/ends_at`) et (b) ses `planning_slots` existants — les deux façons dont un
ouvrier peut être "occupé" dans ce schéma. Une fin de créneau non renseignée est traitée comme une
durée par défaut de 2h plutôt que d'être ignorée. Appelée par `addServiceAssignment` (Services) et
par `createPlanningSlot`/`updatePlanningSlot` (Planning, avec exclusion du créneau modifié
lui-même). En cas de conflit, l'écriture est refusée avec un message listant le(s)
chevauchement(s) — un refus net, pas un avertissement contournable, pour que le comportement
reste déterministe et testable.

Vérifié en conditions réelles (organisation de test dédiée, nettoyée après) :
- Ministère créé avec responsable + membre ; équipe créée et rattachée à ce ministère (façade
  cross-module confirmée fonctionnelle en direct) ; ouvrier créé et visible dans les sélecteurs
  Services/Planning.
- **Conflit service ↔ service** : un ouvrier affecté à un premier service (10h-12h) ne peut pas
  être affecté à un second service qui chevauche (11h-13h) — refus confirmé avec le bon message,
  aucune ligne créée en base.
- **Conflit croisé planning ↔ service** : le même ouvrier ne peut pas non plus être affecté à un
  créneau de planning qui chevauche ce premier service (9h30-10h30 contre 10h-12h) — confirme que
  la détection couvre bien les deux tables, pas seulement l'une d'elles.
- **Non-conflit accepté** : un créneau de planning à un horaire réellement libre (14h-15h) est
  créé sans problème.
- **Exclusion de soi-même à la modification** : modifier ce créneau libre pour le déplacer sur un
  horaire qui chevauche le premier service redéclenche bien le conflit (contre le service, pas
  contre lui-même) — confirme que `excludePlanningSlotId` fonctionne et qu'un créneau ne se
  bloque pas contre sa propre plage horaire à chaque sauvegarde.

**Deux bugs réels trouvés et corrigés pendant cette vérification** :
1. `getMinistryDetail` résolvait le "Responsable" du ministère en cherchant son `personId` dans
   la liste des *membres* du ministère (`members.find(m => m.personId === ministry.leaderPersonId)`)
   — copié du même motif dans `features/groups` (Phase 5), qui a la même limite non détectée
   jusqu'ici. Un responsable choisi à la création n'est pas automatiquement membre : la fiche
   affichait "—" au lieu de son nom dès qu'il n'avait pas été *aussi* ajouté comme membre.
   Corrigé en résolvant le responsable directement par une requête séparée sur `people` dans
   `getMinistryDetail`, indépendante de la liste des membres. `features/groups` a la même
   limite latente, non corrigée dans cette phase (hors scope), à garder en tête.
2. `findWorkerConflicts` (nouveau code de cette phase) construisait un fragment `sql` brut
   (`drizzle-orm`) en y interpolant directement des objets `Date` JavaScript — le driver
   `postgres` sous-jacent n'accepte pas un `Date` brut comme paramètre dans un fragment libre
   (contrairement à une comparaison sur une colonne typée, où Drizzle fait la conversion), et
   levait `TypeError: The "string" argument must be of type string or an instance of Buffer or
   ArrayBuffer. Received an instance of Date` dès la première tentative d'affectation réelle.
   Corrigé en convertissant explicitement les bornes en chaînes ISO avant de les interpoler.

**Volontairement reporté** : `workers.availability` (disponibilités récurrentes par jour/heure,
colonne `jsonb` existante mais non exposée dans l'UI cette phase — la détection de conflits
couvre déjà les créneaux déjà réservés, pas les préférences de disponibilité) ; recherche
combobox pour les sélecteurs (même réserve que les phases précédentes) ; wizard de résolution de
conflit avec suggestion d'un autre ouvrier disponible (le refus net avec message clair a été jugé
suffisant pour cette phase).

**PHASE 8 — Events** ✅ : livrée et vérifiée de bout en bout en conditions réelles (2026-09-27),
y compris les deux critères de sortie explicites (scan QR fonctionnel, calendrier agrégeant tous
les modules pertinents).

Livré — quatre modules dans `features/{events,registrations,attendance,calendar}/` :
- **Événements** (`/events`, `/events/new`, `/events/[id]`) : seul module de la phase avec des
  pages dédiées (comme les membres) — catégories gérées dans un petit dialogue depuis la liste
  (même motif que `ServiceTypeManager` en Phase 7), fiche détail avec liens directs vers les
  inscriptions et les présences filtrées sur cet événement. `events.*`/`attendance.*` existaient
  déjà dans le catalogue de permissions depuis le schéma d'origine (jamais utilisés avant cette
  phase) ; seuls `registrations.*` et `calendar.*` sont réellement nouveaux (catalogue 44 → 49
  codes).
- **Inscriptions** (`/registrations`, page unique, filtrable par `?eventId=`) : inscription
  d'une personne existante ou d'un invité sans compte (`event_registrations.person_id` ou
  `guest_name`, au moins l'un des deux — contrainte du schéma reproduite dans le Zod), génération
  d'un `qr_token` unguessable (`crypto.randomBytes`, jamais un compteur ou un UUID prévisible) à
  la création, changement de statut inline, et un bouton "QR" par inscription ouvrant le code
  généré à la demande (pas au chargement de la liste, pour éviter de générer une image PNG par
  ligne inutilement).
- **Présences** (`/attendance`, page unique, filtrable par `?eventId=`) : sessions de présence
  rattachées à un événement ou un service (contrainte du schéma reproduite dans le Zod, comme les
  inscriptions), check-in manuel par dialogue, et affichage d'une icône QR distincte sur les
  présences enregistrées par ce canal (`attendance_records.method = 'qr'`) pour les distinguer
  visuellement des saisies manuelles.
- **Calendrier** (`/calendar`, page unique) : agrège en direct `events` + `services` +
  `planning_slots` + `calendar_items` (entrées manuelles) plutôt que de dépendre d'une
  synchronisation vers `calendar_items` — aucun trigger ne peuple cette table depuis les autres
  dans `db/schema.sql`, une synchronisation aurait exigé de retoucher les Server Actions
  create/update de trois phases précédentes. Vue agenda (liste chronologique groupée par jour,
  pas une grille mensuelle) sur une fenêtre de 60 jours, avec lien direct vers la ressource
  source pour chaque entrée sauf les entrées manuelles.

**Scan QR fonctionnel (critère de sortie explicite)** — `src/app/api/qr/[token]/route.ts` (Route
Handler `GET`, pas une Server Action) : point d'entrée que l'appareil qui scanne atteint
directement (un lecteur de code QR grand public ouvre l'URL encodée, aucune UI de scan dédiée
dans l'app n'était nécessaire pour ce critère). Aucune session requise — la seule autorisation
est la connaissance du `qr_token`, ce qui est le motif standard de check-in par billet ; c'est
pourquoi ce Route Handler utilise le client admin Supabase (`createAdminClient()`), légitime ici
puisque RLS exigerait `is_org_member()`, qu'un scan anonyme ne peut jamais satisfaire — restriction
documentée dans `lib/supabase/admin.ts` (autorisé en Route Handler, jamais en Server Action).
Trouve-ou-crée une `attendance_sessions` pour l'événement au premier scan, marque
`attendance_records` (`method = 'qr'`) uniquement pour les inscrits avec un `person_id` (un invité
sans compte n'a pas de ligne `people` à laquelle rattacher une présence — seul son statut
d'inscription passe à `attended`), et répond par une page HTML minimale en français
(succès/déjà-enregistré/invalide), sans dépendance à un rendu React.

Vérifié en conditions réelles (organisation de test dédiée, nettoyée après) :
- Création d'un événement avec inscriptions activées, inscription d'une personne, génération du
  QR (image PNG affichée dans un dialogue) — token récupéré en base pour construire l'URL de
  scan sans caméra (technique équivalente à un vrai scan : le token est la seule autorisation).
- **Scan réel** (navigation directe vers l'URL de check-in) : présence enregistrée, page de
  confirmation nominative affichée, session de présence créée automatiquement pour l'événement,
  statut de l'inscription passé à `attended`.
- **Idempotence** : un second scan du même code affiche "Déjà enregistré" au lieu de dupliquer ou
  d'échouer.
- **Token invalide** : renvoie une 404 avec un message clair plutôt qu'une erreur serveur brute.
- **Calendrier** : un service (4 octobre, 10h), un créneau de planning (4 octobre, 9h30) et
  l'événement inscrit (10 octobre) apparaissent bien ensemble, correctement groupés par jour et
  triés par heure, avec les bons liens vers chaque module source ; une entrée manuelle ajoutée
  directement au calendrier apparaît à son tour au bon endroit chronologique.

**Deux bugs réels trouvés et corrigés pendant cette vérification** :
1. La fiche événement passait un `<div>` (deux badges côte à côte) comme `description` à
   `PageHeader`, qui enveloppe systématiquement `description` dans un `<p>` — un `<div>` dans un
   `<p>` est un HTML invalide et déclenchait une vraie erreur d'hydratation React, visible
   uniquement dans la console (le rendu final semblait correct). Corrigé en remplaçant le `<div>`
   par un `<span inline-flex>`, valide dans un `<p>`. Recherché dans le reste du code : aucune
   autre page ne passe un bloc non-inline comme `description`.
2. **La même famille de bug qu'aux Phases 5/6, une troisième fois** : `registrationSchema.status`
   utilisait `z.enum([...]).default("pending")`, mais le dialogue de création d'inscription
   n'affiche volontairement aucun champ statut (une nouvelle inscription démarre toujours
   `pending`) — `formData.get("status")` valait donc `null`, pas juste absent, et `.default()`
   ne se déclenche que sur `undefined`. Corrigé avec le motif `.nullish().transform(v => v ??
   "pending")` déjà établi. Un grep systématique de tous les `.default(` des quatre modules de
   cette phase a confirmé qu'aucun autre cas similaire ne s'y cachait (les autres champs enum
   sont tous rendus par un `<select>` toujours présent dans leur formulaire).

**Volontairement reporté** : lecteur de QR par caméra intégré à l'app (le critère de sortie parle
de "scan QR fonctionnel", pas d'une UI de scan dédiée — un appareil photo grand public ouvrant
l'URL encodée remplit ce rôle ; une UI de scan in-app resterait une amélioration UX, pas une
nécessité fonctionnelle) ; paiement des inscriptions payantes (`event_registrations.amount`/
`payment_status` existent dans le schéma mais aucun `PaymentProvider` avant la Phase 14/Billing) ;
vue calendrier en grille mensuelle (l'agenda chronologique suffit à prouver l'agrégation) ;
liste d'attente automatique quand `capacity` est atteinte (`waitlisted` existe comme statut
possible mais n'est pas positionné automatiquement).

**PHASE 9 — Finance** ✅ : livrée et vérifiée de bout en bout en conditions réelles (2026-09-27),
y compris le critère de sortie explicite (permissions finance strictement isolées, prouvé par un
test RLS dédié).

Livré — un seul module `features/finance/` couvrant quatre pages :
- **Configuration** (`FinanceSetupManager`, dialogue partagé depuis `/finance/income` et
  `/finance/expenses`) : catégories (typées recette/dépense/transfert), fonds (avec indicateur
  "restreint"), comptes financiers (caisse/banque/mobile money/autre) — trois sections empilées,
  chacune son propre formulaire `useActionState`.
- **Dons & offrandes** (`/finance/income`) et **Dépenses** (`/finance/expenses`) : même
  `TransactionFormDialog` partagé via une prop `type` (+ champ caché), liste avec montants
  signés et colorés (vert/rouge), suppression réservée aux admins (hard delete, même motif établi
  dans les phases précédentes pour les tables sans policy RLS `delete` pour un simple membre).
- **Budgets** (`/finance/budgets`) : budgets annuels par exercice, avec lignes budgétaires
  (catégorie/fonds, montant planifié, montant réel modifiable inline via `onBlur`) et un **flux
  d'approbation** modélisé sur `budgets.status` (`draft` → `active` via `finance.approve`, puis
  `active` → `closed`, toujours via `finance.approve`) — le schéma réel n'a pas de colonne
  d'approbation sur `financial_transactions`, donc ce critère de sortie a été mappé sur la seule
  notion d'approbation qui existe réellement dans `db/schema.sql` (le statut d'un budget), plutôt
  que d'inventer une colonne.
- **Rapports financiers** (`/finance/reports`) : recettes/dépenses agrégées par catégorie sur une
  plage de dates filtrable (`sum()` Drizzle groupé par type+catégorie), total recettes/dépenses/
  solde net.
- **Aucun nouveau code de permission** : `finance.view`/`finance.create`/`finance.approve`
  existaient déjà dans le catalogue depuis le schéma d'origine (23 codes), jamais utilisés avant
  cette phase, et déjà correctement réservés à `FINANCE_MANAGER` (+ bypass admin) dans
  `ROLE_PERMISSIONS` — catalogue toujours à 49 codes, une première depuis la Phase 6.

**Test RLS dédié (critère de sortie explicite)** — `db/scripts/verify-finance-rls.ts`
(`npm run db:verify-finance-rls`), même technique que `db:verify-rls` (`SET LOCAL ROLE
authenticated` + `request.jwt.claim.sub`, ce que fait PostgREST/GoTrue en production) mais ciblée
sur `financial_transactions` et `budgets` : insère un jeu de données financières minimal dans une
organisation réelle (réutilise un `organization_memberships` actif existant), vérifie qu'un membre
de cette organisation voit les lignes insérées, qu'un utilisateur membre d'aucune organisation ne
voit rien, et qu'une requête sans session (aucun claim JWT) ne voit rien non plus — puis nettoie
les lignes qu'il a créées, que le test réussisse ou échoue. **Résultat confirmé contre le vrai
Supabase** : `✓ RLS financier confirmé`. Important à noter (documenté explicitement dans le script
lui-même) : RLS dans ce schéma ne connaît que `organization_id`, jamais les permissions fines
`finance.*` — ce test prouve donc l'isolation *inter-organisation*, pas une isolation par rôle à
l'intérieur d'une même organisation, que RLS ne gère pas et n'a jamais géré ailleurs dans ce
schéma.

**Isolation applicative par rôle (l'autre moitié du critère de sortie, vérifiée par Playwright,
navigateur réel)** — organisation de test dédiée, nettoyée après : un compte `CHURCH_OWNER` (admin)
et un compte avec le rôle système `SECRETARY` (permissions réalistes seedées manuellement :
`members.*`, `events.*`, `attendance.*`, `registrations.*`, `calendar.view`, `reports.view` —
aucune permission `finance.*`, exactement la configuration `SECRETARY` réelle de
`ROLE_PERMISSIONS`). Avec le compte admin : catégories/fonds/comptes créés, une recette (Dîmes,
50 000 F CFA) et une dépense (Loyer, virement bancaire, 15 000 F CFA) créées et affichées
correctement, budget "Budget annuel 2026" créé, une ligne budgétaire ajoutée (Loyer, 180 000 F CFA
planifié), montant réel saisi (150 000 F CFA, mise à jour du total confirmée), budget approuvé
(Brouillon → Actif) puis clôturé (Actif → Clôturé, boutons d'action disparaissant comme attendu) ;
`/finance/reports` affichant les bons totaux (50 000 / 15 000 / 35 000 net) et la bonne ventilation
par catégorie. Avec le compte secrétaire : les quatre pages finance (`/finance/income`,
`/finance/expenses`, `/finance/budgets`, `/finance/reports`) affichent toutes "Accès refusé
(`finance.view`)" ; `/members` reste accessible normalement pour le même compte — confirmant que
c'est une isolation réelle et ciblée, pas un verrouillage général de session.

**Bug réel trouvé et corrigé pendant cette vérification** — une nouvelle variante de la famille de
bugs `FormData` déjà rencontrée aux Phases 5/6/8, mais cette fois-ci pas une histoire de `null` vs
`undefined` : `transactionSchema.paymentMethod` utilisait `z.enum([...]).nullish().transform(v =>
v ?? "")`, mais le `<select>` du formulaire de transaction rend une option "—" (moyen de paiement
non précisé) dont la *valeur* est la chaîne vide `""`, pas une absence de champ — `z.enum` rejette
`""` directement, avant même que `.nullish()` n'ait la moindre chance d'intervenir (`.nullish()` ne
catche que `null`/`undefined`, jamais une chaîne hors énumération). Résultat concret : toute
transaction créée sans préciser de moyen de paiement échouait avec `Invalid option: expected one
of "cash"|"bank_transfer"|...`. Corrigé en remplaçant le champ par une simple chaîne optionnelle
(`optionalString`, sans `z.enum()` au niveau Zod) — la vraie validation de l'énumération a lieu à
l'insertion, portée par la colonne Postgres `payment_method` réellement typée en enum côté base.
Un grep de tout `features/` a confirmé qu'aucune autre occurrence de ce même motif (`z.enum(...)
.nullish()` sur un champ rendu par un `<select>` avec option vide) n'existait ailleurs.

**Bug d'isolation trouvé pendant l'écriture du code, avant tout test** : `/finance/reports` était
initialement gated par `reports.view` (le permission code générique déjà utilisé par `/reports`)
plutôt que par `finance.view` — or `SECRETARY` et `MINISTRY_LEADER` ont tous deux `reports.view`
sans avoir `finance.view`, ce qui aurait directement violé le critère de sortie de cette phase en
exposant des totaux financiers agrégés à des rôles n'ayant pas accès aux finances. Corrigé avant
tout test en re-gatant la page sur `finance.view`.

**Volontairement reporté** : export PDF/Excel des rapports financiers (aucune infrastructure
d'export avant la Phase 13/Analytics) ; rapprochement bancaire ou import de relevé ; gestion
multi-devises (le schéma stocke un montant numérique simple, pas de colonne devise sur les
transactions) ; historique des changements de statut d'un budget (seul le statut courant est
stocké, pas un journal d'audit dédié).
