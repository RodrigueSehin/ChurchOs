# Modèle de données

> **Mise à jour majeure** : ChurchOS a un vrai projet Supabase déjà en ligne, avec son propre
> schéma. Ce schéma (`db/schema.sql`) a été adopté tel quel comme source de vérité, **à la place**
> du schéma conçu en STEP 01. Ce document décrit le schéma réel. L'ancien design (tables
> `organizations`/`members` plates, RBAC dans un schéma `app`, permissions fines par module) est
> abandonné.

Le DDL complet et faisant foi est [`../../db/schema.sql`](../../db/schema.sql) — un fichier SQL
unique (tables, fonctions PL/pgSQL, triggers, RLS, seed RBAC/plans, grants), à appliquer tel quel
sur Supabase (SQL Editor ou `psql`). Il n'est **pas** généré par Drizzle : Drizzle sert uniquement
de couche de requêtage TypeScript (voir plus bas).

## Différences clés avec le design STEP 01

| | STEP 01 (abandonné) | Réel (adopté) |
|---|---|---|
| Identité de base | `members` porte directement les infos personnelles | `people` est l'identité de base ; `members`, `visitors`, les rôles ministériels, etc. référencent `person_id` |
| Profil utilisateur app | `users` (miroir manuel de `auth.users`) | `profiles`, auto-créé par un trigger `on_auth_user_created` sur `auth.users` |
| Appartenance à une org | `user_organizations` | `organization_memberships` |
| Rôles attribués | `user_roles` | `membership_roles` (liée à `organization_memberships`) |
| Fonctions RLS | schéma dédié `app.*` | fonctions dans `public` : `is_org_member()`, `is_org_admin()`, `has_permission()` |
| Enums | valeurs `UPPERCASE` | valeurs `snake_case` minuscules |
| Onboarding | à coder | RPC déjà fournie : `create_organization_for_current_user()` |
| Confidentialité pastorale/prière | policy RLS dédiée par `visibility` | colonnes `confidentiality`/`is_confidential` existent mais **ne sont pas encore appliquées en RLS** (voir 03-multi-tenancy-and-rls.md) |

## Conventions

- `id uuid primary key default gen_random_uuid()` partout.
- `organization_id uuid not null references organizations(id) on delete cascade` sur (quasiment)
  toutes les tables métier — c'est la clé de l'isolation multi-tenant.
- `campus_id` nullable quand la donnée peut être rattachée à un campus précis.
- `created_at`/`updated_at timestamptz`. `updated_at` est maintenu automatiquement par un trigger
  générique `set_updated_at()` (voir §18 de db/schema.sql), pas par l'application.
- Enums PostgreSQL en minuscules (`org_status`, `member_status`, `pastoral_status`, …) — voir
  `src/lib/db/schema/enums.ts` pour la liste complète, miroir exact.
- Extensions : `pgcrypto` (uuid), `citext` (emails/slugs insensibles à la casse), `vector`
  (pgvector, module IA — voir limite locale ci-dessous).

## Domaines et tables

| Domaine | Tables |
|---|---|
| **Identité & organisation** | `profiles`, `organizations`, `organization_settings`, `campuses`, `organization_memberships` |
| **RBAC** | `roles`, `permissions`, `role_permissions`, `membership_roles` |
| **Billing** | `feature_flags`, `organization_features`, `plans`, `subscriptions`, `invoices`, `payments` |
| **Personnes** | `people`, `members`, `families`, `family_members`, `person_relationships`, `visitors` |
| **Groupes** | `groups`, `group_members` |
| **Pastoral** | `pastoral_followups`, `pastoral_notes`, `prayer_requests`, `prayer_updates`, `visits`, `pastoral_councils`, `pastoral_council_members`, `pastoral_actions` |
| **Ministères** | `ministries`, `ministry_members`, `teams`, `team_members`, `workers`, `service_types`, `services`, `service_assignments`, `planning_slots` |
| **Événements** | `event_categories`, `events`, `event_registrations`, `attendance_sessions`, `attendance_records`, `calendar_items` |
| **Finance** | `finance_categories`, `funds`, `financial_accounts`, `financial_transactions`, `budgets`, `budget_lines` |
| **Formation** | `courses`, `course_modules`, `course_enrollments`, `certifications` |
| **Communication** | `announcements`, `message_templates`, `messages`, `notifications`, `notification_preferences` |
| **Documents & ressources** | `document_folders`, `documents`, `resources`, `resource_reservations` |
| **IA** | `ai_conversations`, `ai_messages`, `ai_documents` (RAG, pgvector) |
| **Audit** | `audit_logs` |

## Relations et logique clés à retenir

- **`people` est le pivot** : une personne existe une seule fois (`people`), et devient `member`,
  `visitor`, responsable de `ministries`/`groups`/`teams`, etc. via des tables qui référencent
  `person_id`. Une personne peut être membre ET avoir un historique de visiteur simultanément.
- **Onboarding automatisé côté DB** : `create_organization_for_current_user(name, slug, city,
  country_code)` (RPC, `security definer`) crée l'organisation, et le trigger
  `bootstrap_organization()` (sur `after insert on organizations`) crée automatiquement
  `organization_settings` + les 9 rôles système (`SUPER_ADMIN` … `MEMBER`). La RPC ajoute ensuite
  la membership de l'appelant et lui assigne `CHURCH_OWNER`. Phase 3 (onboarding) doit appeler
  cette RPC plutôt que de réimplémenter cette logique côté Next.js.
- **`profiles` auto-créé** : le trigger `handle_new_user()` (sur `after insert on auth.users`)
  crée la ligne `profiles` correspondante à partir de `raw_user_meta_data`/`phone`/`email` du
  signup Supabase Auth.
- **`role_permissions` n'est PAS seedé par db/schema.sql** — seul le catalogue `permissions` (23
  lignes) et les 9 rôles système (par organisation, via le trigger) le sont. L'association
  rôle → permissions est la proposition ChurchOS (`src/lib/rbac/permissions.ts`), appliquée par
  `db/seed/index.ts`. Voir [04-rbac-permissions.md](04-rbac-permissions.md).
- **Confidentialité pastorale non durcie en RLS** — `pastoral_followups.confidentiality`
  (`normal`/`pastoral`/`restricted`) et `prayer_requests.is_confidential` existent comme données
  mais aucune policy RLS ne les filtre : tout membre actif de l'organisation peut lire tout le
  pastoral/toutes les prières au niveau base. À appliquer côté application (Server Actions) pour
  l'instant ; durcissement RLS proposé pour la Phase 6.
- **`ai_documents`** (RAG) dépend de pgvector, indisponible sur le Postgres local de dev — voir
  [`../../db/local-postgres/README.md`](../../db/local-postgres/README.md#pgvector-module-ia).

## Drizzle : rôle et limites

`src/lib/db/schema/*.ts` est un **miroir manuel** de `db/schema.sql`, maintenu par transcription
directe (pas de génération automatique) — utilisé pour le requêtage type-safe côté application
(Server Actions, queries). Il ne couvre que les tables/colonnes/contraintes ; **pas** les
fonctions PL/pgSQL, triggers, policies RLS ni les grants, que drizzle-kit ne peut pas représenter.
`drizzle-kit generate`/`migrate` ne sont donc **pas** utilisés pour appliquer ce schéma — c'est
`db/schema.sql` lui-même (via `npm run db:migrate:local` en dev, ou le SQL Editor Supabase /
`psql` en production) qui fait foi. `drizzle-kit studio` reste disponible comme visualiseur.

Si `db/schema.sql` évolue sur le projet Supabase réel, resynchroniser `src/lib/db/schema/*.ts`
manuellement (ou via `drizzle-kit introspect`/`pull` une fois connecté à la vraie base — plus
fiable qu'une transcription manuelle, à privilégier dès que les identifiants Supabase sont
disponibles).

## Seed de démonstration

`db/seed/index.ts` : crée un utilisateur de démo, appelle
`create_organization_for_current_user()` pour "Église Évangélique La Source" (Abidjan), un
campus, seed `role_permissions`, et quelques `people`/`members`. Volontairement minimal pour
l'instant (focalisé sur ce dont l'authentification/onboarding a besoin) — enrichi module par
module au fil des phases plutôt que tout d'un coup.
