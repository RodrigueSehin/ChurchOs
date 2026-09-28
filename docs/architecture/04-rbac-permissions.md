# RBAC — Rôles & Permissions

> Reflète le schéma réel (`db/schema.sql`). Voir [02-database-schema.md](02-database-schema.md)
> pour le contexte du pivot. Catalogue de permissions **réduit** par rapport au design initial du
> STEP 01 (49 codes contre ~90) — c'est ce qui est réellement seedé en base. Ajouté en Phase 6 :
> `pastoral.view_confidential` pour le durcissement RLS de la confidentialité pastorale — voir
> [03-multi-tenancy-and-rls.md](03-multi-tenancy-and-rls.md#confidentialité-pastorale-durcie-en-phase-6)
> — ainsi que `visits.*` et `pastoral_council.*`. Ajouté en Phase 7 :
> `ministries.*`/`teams.*`/`workers.*`/`services.*`/`planning.*` (3 codes chacun). Ajouté en
> Phase 8 : `registrations.*` et `calendar.*` (`events.*`/`attendance.*` existaient déjà dans le
> schéma d'origine). **Phase 9 : aucun code ajouté** — `finance.view`/`finance.create`/
> `finance.approve` existaient déjà dans le schéma d'origine, jamais utilisés avant cette phase,
> et déjà correctement réservés à `FINANCE_MANAGER` dans `ROLE_PERMISSIONS` ; catalogue toujours à
> 49 codes. Ajouté en Phase 10 : `training.view`/`training.manage`/`training.enroll`/
> `training.certify` (catalogue 49 → 53 codes) — aucun code `training.*` n'existait avant cette
> phase. Ajouté en Phase 11 : `communication.view`/`communication.manage`/`communication.send`
> (catalogue 53 → 56 codes) — aucun code `communication.*` n'existait avant cette phase. Ajouté en
> Phase 12 : `documents.view`/`documents.manage`/`resources.view`/`resources.manage`/
> `resources.reserve` (catalogue 56 → 61 codes) — aucun code `documents.*`/`resources.*` n'existait
> avant cette phase. **Phase 13 : aucun code ajouté** — `reports.view`/`reports.export`
> existaient déjà dans le schéma d'origine et étaient déjà correctement distribués par rôle ;
> catalogue toujours à 61 codes. **Phase 14 : aucun code ajouté** — `/settings/billing` réutilise
> `settings.manage`, déjà utilisé par les pages sœurs `/settings/church`/`/settings/users`/
> `/settings/roles` ; catalogue toujours à 61 codes.

## Rôles

9 rôles système, créés automatiquement pour chaque organisation par le trigger
`bootstrap_organization()` (voir `db/schema.sql` §4B) au moment de sa création :

| Rôle | Portée typique |
|---|---|
| `SUPER_ADMIN` | Plateforme ChurchOS (support/opérations) |
| `CHURCH_OWNER` | Propriétaire du compte — accès complet à son organisation |
| `PASTOR` | Accès pastoral complet |
| `PASTORAL_LEADER` | Suivi pastoral, prière, visites |
| `MINISTRY_LEADER` | Ministère(s) assigné(s), événements, présences |
| `FINANCE_MANAGER` | Dons, dépenses, budgets, approbation |
| `SECRETARY` | Membres, événements, rapports |
| `WORKER` | Lecture + présences |
| `MEMBER` | Portail membre |

`public.is_org_admin()` ne reconnaît que `SUPER_ADMIN`/`CHURCH_OWNER` comme "admin" (c'est ce qui
détermine l'accès `delete` en RLS — voir [03-multi-tenancy-and-rls.md](03-multi-tenancy-and-rls.md)).

## Catalogue de permissions (49 — `db/schema.sql` §21, table `permissions`)

```text
members.view       members.create       members.update       members.delete
pastoral.view       pastoral.create      pastoral.update      pastoral.delete
pastoral.view_confidential
prayer.view          prayer.create        prayer.update
visits.view           visits.create        visits.update
pastoral_council.view  pastoral_council.manage
ministries.view        ministries.create     ministries.update
teams.view              teams.create           teams.update
workers.view             workers.create          workers.update
services.view             services.create          services.update
planning.view              planning.create           planning.update
events.view           events.create        events.update        events.delete
attendance.view        attendance.create
registrations.view      registrations.create    registrations.update
calendar.view             calendar.manage
finance.view             finance.create        finance.approve
reports.view              reports.export
settings.manage
```

Note : plusieurs modules n'ont pas de code `.delete` séparé — comme pour `pastoral`, la policy
RLS `delete` générique exige `is_org_admin()` (voir plus bas), donc les "suppressions" pour ces
modules sont soit un changement de statut couvert par `.update` (prière, visite, inscription),
soit gardées explicitement par `check.context.isAdmin` en plus du `.manage`/`.update` applicatif
(conseil pastoral, ministères, équipes, ouvriers, services, plannings, calendrier — cascade
réelle en base).

C'est **beaucoup plus grossier** que le catalogue détaillé imaginé au STEP 01
(`members.export`/`import`, `pastoral.view.private`, `documents.view.all`, etc.) — celui-ci
n'existe plus. Pour étendre le catalogue plus tard : insérer dans `permissions`, référencer le
nouveau code dans `ROLE_PERMISSIONS` (`src/lib/rbac/permissions.ts`), et vérifier explicitement
dans les Server Actions concernées (RLS ne connaît pas ces permissions fines, voir plus bas).

## `role_permissions` : pas encore seedé côté base

`db/schema.sql` seed le catalogue `permissions` et les 9 `roles` par organisation, mais **ne
seed jamais `role_permissions`** (aucun `insert into role_permissions` dans le fichier). C'est
`src/lib/rbac/permissions.ts` (`ROLE_PERMISSIONS`) qui est la proposition ChurchOS pour cette
association, appliquée par `db/seed/index.ts` à chaque organisation nouvellement créée (à
reproduire pour les organisations déjà existantes sur le vrai Supabase, le cas échéant — à
coordonner avec le propriétaire du projet).

## Vérification — toujours double, mais RLS est grossier ici

```text
UI                              Server Action / Route Handler
──────────────────────          ──────────────────────────────
usePermission('finance.create')  requirePermission(orgId, 'finance.create')
→ cache le bouton "Nouveau"      → appelle public.has_permission(org_id, code) ou l'équivalent
                                    TypeScript, AVANT tout accès Drizzle
                                  → RLS ne revérifie QUE is_org_member()/is_org_admin() (pas la
                                    permission fine) — voir 03-multi-tenancy-and-rls.md
```

Contrairement au design STEP 01 où RLS appliquait la permission fine en base, ici **la
vérification de permission fine est uniquement applicative**. `lib/auth/guards.ts` (Phase 3+)
doit donc être strict : une Server Action qui ne commence pas par un `requirePermission()` explicite
est un bug de sécurité, RLS ne rattrapera pas l'erreur au niveau permission (seulement au niveau
organisation/admin).

## Feature flags

`feature_flags` (catalogue global, seedé par `db/schema.sql` : members, pastoral, prayer, events,
attendance, finance, training, communication, documents, analytics, ai, multi_campus) +
`organization_features` (activation par organisation, avec `config jsonb`). Résolution côté
serveur dans `lib/feature-flags/` (Phase 4+).

## ChurchOS AI — filtrage des données

Règle absolue inchangée : **l'IA n'accède jamais à des données que l'utilisateur courant n'aurait
pas pu voir lui-même.** `ai_documents` (RAG, pgvector) n'est indexé que pour du contenu
explicitement éligible et n'est jamais exposé directement au rôle `authenticated` — accès
service-role uniquement, filtré par permission côté serveur avant tout appel au modèle.

**Implémentation retenue en Phase 15 : tool-calling, pas RAG.** La garantie ci-dessus est assurée
par du function-calling OpenAI (`lib/ai/tools.ts`) : chaque outil que le modèle peut appeler est une
vraie requête Drizzle enveloppée dans le même `checkPermission()` que n'importe quelle Server Action
de l'application — un refus est donc structurel (le même mécanisme partout, testable comme
n'importe quel autre gate), pas une probabilité de filtrage post-hoc sur des chunks de texte
retrouvés par similarité vectorielle. Le pipeline RAG sur `ai_documents` décrit ci-dessus reste
valide comme design pour une future fonctionnalité (questions sur le contenu de documents
uploadés), mais n'a pas été construit en Phase 15 — voir `07-sprint-plan.md#phase-15`.
