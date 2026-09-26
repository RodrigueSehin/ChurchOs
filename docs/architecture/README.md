# ChurchOS — Architecture Technique (STEP 01)

> Statut : **en attente de validation**. Ne rien implémenter tant que ce document n'est pas approuvé.
> Quand validation reçue → commencer PHASE 1 (Foundation) du plan de sprints ([07-sprint-plan.md](07-sprint-plan.md)).

## Vision produit

ChurchOS est un SaaS multi-tenant de gestion d'églises, ministères et communautés chrétiennes.
Une **Organization** = une église ou un réseau d'églises (multi-campus). Le produit centralise
membres, pastoral, ministères, événements, présences, finances, formation, communication,
documents, ressources, analytics et IA dans une seule plateforme.

Le produit doit être pensé comme **commercialisable** (billing, plans, feature flags) dès la V1,
pas comme une démo.

## Documents de cette phase

| Doc | Contenu |
|---|---|
| [01-project-structure.md](01-project-structure.md) | Arborescence complète du repo, architecture modulaire `features/` |
| [02-database-schema.md](02-database-schema.md) | Modèle de données : lecture guidée du schéma (voir `db/schema.sql` pour le DDL) |
| [03-multi-tenancy-and-rls.md](03-multi-tenancy-and-rls.md) | Modèle multi-tenant + politiques RLS (voir `db/rls-policies.sql`) |
| [04-rbac-permissions.md](04-rbac-permissions.md) | Rôles, permissions, feature flags |
| [05-design-system.md](05-design-system.md) | Couleurs, typographie, composants, layout |
| [06-env-vars-and-dependencies.md](06-env-vars-and-dependencies.md) | Variables d'environnement + dépendances npm |
| [07-sprint-plan.md](07-sprint-plan.md) | Plan de développement par phase/sprint |
| `../../db/schema.sql` | DDL PostgreSQL complet (tables, enums, indexes) |
| `../../db/rls-policies.sql` | Politiques RLS PostgreSQL |

## Stack technique retenue

**Frontend** : Next.js (App Router) · TypeScript · React · Tailwind CSS · shadcn/ui · Lucide React ·
TanStack Query · Zustand · React Hook Form · Zod

**Backend** : Server Actions + Route Handlers (Next.js) · services métier isolés par module ·
validation Zod partagée frontend/backend · architecture modulaire (`features/`)

**Database** : PostgreSQL (via Supabase) · Drizzle ORM · Row Level Security

**Auth** : Supabase Auth (email/password, magic link, OAuth optionnel, MFA pour comptes sensibles)

**Storage** : Supabase Storage (avatars, documents, médias, pièces jointes)

**Async/Jobs** : Inngest (emails, rappels, notifications, tâches récurrentes, rapports)

**Communication** : Resend (email) · provider SMS abstrait · WhatsApp Business API · push · in-app

**IA** : OpenAI API · pgvector · embeddings · RAG pour ChurchOS AI

**Monitoring** : Sentry (erreurs) · PostHog (analytics produit)

**Tests** : Vitest (unit) · Playwright (E2E)

**Déploiement** : Vercel (app) · Supabase (DB/Auth/Storage) · GitHub + GitHub Actions (CI/CD)

## Principes d'architecture

1. **Modular Monolith** — pas de microservices en V1. Un seul déploiement Next.js, mais chaque
   module métier (`members`, `pastoral`, `finance`, …) est isolé dans `features/<module>/` avec
   ses propres composants, actions, queries, schemas, services et types. Un module ne doit pas
   importer directement le repository interne d'un autre module — il passe par le service exposé.
2. **Multi-tenant dès le jour 1** — toute table métier porte `organization_id` (et `campus_id`
   quand pertinent). Isolation appliquée en double : Row Level Security PostgreSQL **et**
   vérification applicative (jamais l'un sans l'autre).
3. **Sécurité côté serveur, jamais côté client seul** — RBAC vérifié dans les Server Actions/Route
   Handlers avant toute lecture/écriture. Le frontend masque l'UI par confort, il ne protège rien.
4. **Séparation logique métier / accès données / UI** — les composants React ne contiennent pas
   de logique métier ; les Server Actions orchestrent ; les services encapsulent les règles
   métier ; les queries/repositories encapsulent Drizzle.
5. **Pas de fonctionnalité simulée** — quand l'architecture réelle peut être branchée
   (DB, Storage, Auth, Jobs), on la branche. Pas de boutons sans action, pas de données
   hardcodées à la place de données PostgreSQL.
