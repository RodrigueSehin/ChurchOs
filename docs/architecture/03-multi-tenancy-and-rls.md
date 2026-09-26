# Multi-tenancy & Row Level Security

> Décrit le RLS réellement déployé (`db/schema.sql` §20). Voir
> [02-database-schema.md](02-database-schema.md) pour le contexte du pivot vers le schéma réel.

## Modèle

```text
Organization  (= une église ou un réseau d'églises)
    │
    ├── Campuses
    │
    ├── organization_memberships  (appartenance d'un utilisateur à l'organisation,
    │        │                     status invited/active/suspended/left)
    │        └── membership_roles (rôles attribués)
    │
    ├── people → members / visitors / groupes / ministères / équipes / ouvriers...
    ├── pastoral, prière, visites, conseil pastoral
    ├── événements, présences, calendrier
    ├── finance (funds, comptes, transactions, budgets)
    ├── documents / ressources
    └── IA (conversations, ai_documents)
```

Un `auth.users` (Supabase Auth) est global et peut appartenir à **plusieurs organisations** via
plusieurs lignes `organization_memberships`.

## Double couche d'isolation

1. **Applicative** — chaque Server Action / Route Handler résout l'organisation courante et
   vérifie la permission avant toute requête. Voir
   [04-rbac-permissions.md](04-rbac-permissions.md).
2. **PostgreSQL RLS** — filet de sécurité en base, actif même si l'étage applicatif a un bug.
   Toutes les tables org-scopées ont RLS activé (`db/schema.sql` §20).

## Fonctions helper (schéma `public`, pas de schéma `app` séparé)

```sql
public.is_org_member(p_org_id uuid) returns boolean   -- membership active pour auth.uid()
public.is_org_admin(p_org_id uuid) returns boolean     -- membership active + rôle SUPER_ADMIN/CHURCH_OWNER
public.has_permission(p_org_id uuid, p_permission text) returns boolean  -- via membership_roles → role_permissions
public.current_user_id() returns uuid                  -- = auth.uid(), security definer
```

Toutes `security definer`, `stable`, `set search_path = public` — évite la récursion de policies
et les soucis de search_path.

## Policy générique (appliquée par une boucle `do $$ ... $$` sur ~50 tables)

```sql
for select using (public.is_org_member(organization_id));
for insert with check (public.is_org_member(organization_id));
for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
for delete using (public.is_org_admin(organization_id));
```

**Important, à noter pour les phases suivantes** : cette policy générique est **grossière** — elle
ne distingue pas les permissions fines (`members.delete` vs `events.create`, etc.). Concrètement :

- N'importe quel membre actif peut **insert/update** n'importe quelle table org-scopée (`people`,
  `finance_transactions`, `pastoral_followups`, …), même sans le rôle ou la permission "métier"
  appropriée. Le filtrage fin (ex. seul `FINANCE_MANAGER` peut créer une transaction) **doit être
  fait côté application** (Server Actions, via `has_permission()` ou l'équivalent TypeScript) —
  RLS ne le fait pas aujourd'hui.
- Seul le **delete** distingue admin/non-admin (`is_org_admin`), et seulement entre "admin
  (SUPER_ADMIN/CHURCH_OWNER)" et "membre", pas par permission fine.

C'est un choix déjà en production — ChurchOS le respecte tel quel pour les autres modules. La
confidentialité pastorale, elle, a été durcie en Phase 6 (voir juste en dessous) : c'était la
seule exception explicitement candidate pour un durcissement, validée avec le propriétaire du
projet avant de toucher au schéma live.

## Confidentialité pastorale, durcie en Phase 6

Avant la Phase 6, `is_confidential` (`prayer_requests`), `confidentiality`
(`pastoral_followups`, valeurs `normal`/`pastoral`/`restricted`) et `is_private`
(`pastoral_notes`) n'étaient que des colonnes de données : n'importe quel membre actif de
l'organisation pouvait lire n'importe quelle ligne de ces trois tables, confidentielle ou non
(policy générique `is_org_member`). Le filtrage applicatif (Server Actions, requêtes) existait
mais RLS ne le renforçait pas — un accès direct à l'API Supabase (hors app) aurait pu contourner
le filtre applicatif.

Policies dédiées (remplacent la policy `select` générique pour ces trois tables uniquement —
`insert`/`update`/`delete` restent sur la policy générique `is_org_member`/`is_org_admin`,
inchangée) :

```sql
-- prayer_requests : visible si non confidentiel, ou créateur/assigné/admin, ou permission dédiée
for select using (
  is_org_member(organization_id) and (
    not is_confidential
    or created_by = auth.uid()
    or assigned_to_user_id = auth.uid()
    or is_org_admin(organization_id)
    or has_permission(organization_id, 'pastoral.view_confidential')
  )
);

-- pastoral_followups : 'normal' = comme non confidentiel ; 'pastoral' exige la permission
-- dédiée ; 'restricted' n'est jamais accordé par la permission, seulement créateur/assigné/admin
for select using (
  is_org_member(organization_id) and (
    confidentiality = 'normal'
    or created_by = auth.uid()
    or assigned_to_user_id = auth.uid()
    or is_org_admin(organization_id)
    or (confidentiality = 'pastoral' and has_permission(organization_id, 'pastoral.view_confidential'))
  )
);

-- pastoral_notes : même logique que prayer_requests, sur is_private
for select using (
  is_org_member(organization_id) and (
    not is_private
    or author_user_id = auth.uid()
    or is_org_admin(organization_id)
    or has_permission(organization_id, 'pastoral.view_confidential')
  )
);
```

Nouvelle permission `pastoral.view_confidential` (voir
[04-rbac-permissions.md](04-rbac-permissions.md)), accordée à `PASTOR`/`PASTORAL_LEADER` (et aux
rôles admin via le bypass `is_org_admin()` habituel). `SECRETARY`, `WORKER`,
`MINISTRY_LEADER`, `FINANCE_MANAGER`, `MEMBER` ne l'ont pas : pour eux, seuls leurs propres
enregistrements (créés ou assignés) restent visibles parmi les confidentiels/restreints.

**Limite connue** : ces policies s'appuient sur `has_permission()`, qui lit `role_permissions` —
une organisation créée **avant** ce durcissement (donc avant que `pastoral.view_confidential`
n'existe dans le catalogue seedé par `db/schema.sql` au moment de sa création) n'aura pas cette
ligne dans `role_permissions` pour ses rôles `PASTOR`/`PASTORAL_LEADER`, même après avoir
réappliqué `db/schema.sql` (qui insère avec `on conflict do nothing`, donc ne rétro-ajoute rien
aux organisations existantes). `seedRolePermissionsForOrganization()`
(`lib/rbac/seed-role-permissions.ts`) est idempotent et peut être rejouée manuellement pour une
organisation existante afin de corriger ça.

## Policies spécifiques (hors boucle générique)

- **`profiles`** : select/update uniquement `id = auth.uid()` (jamais les profils d'un autre
  utilisateur, même dans la même organisation).
- **`organizations`** : select si membre, update si admin. Pas d'insert direct — passe par la RPC
  `create_organization_for_current_user()`.
- **`organization_memberships`** : select si `user_id = auth.uid()` OU membre de l'org ; insert/
  update réservés aux admins.
- **`roles`** : select si `organization_id is null` (gabarits système, visibles de tous les
  authentifiés) ou membre de l'org ; gestion réservée aux admins.
- **`permissions`** : select à tout utilisateur authentifié (catalogue global, pas org-scopé).

## Pourquoi pas un claim JWT `organization_id` unique ?

Un utilisateur peut appartenir à plusieurs organisations (`organization_memberships`), donc un
claim JWT unique ne suffirait pas. L'organisation "active" côté UI est un choix de session
(cookie), toujours revalidée côté serveur contre `organization_memberships` — jamais fait
confiance à une valeur envoyée par le client.

## Rôles Postgres

Supabase préconfigure `anon`, `authenticated`, `service_role` sur chaque projet. `db/schema.sql`
fait les grants nécessaires en fin de fichier (`grant ... to authenticated`). Sur le Postgres
local de dev, ces rôles n'existent pas nativement — `db/local-postgres/roles-stub.sql` les crée
(voir [`../../db/local-postgres/README.md`](../../db/local-postgres/README.md)).

## Vérification

`npm run db:verify-rls` prouve l'isolation multi-tenant (`organization_id`) en basculant sur le
rôle `authenticated` (`SET LOCAL ROLE`) et en simulant `request.jwt.claim.sub` comme le fait
PostgREST/GoTrue en production. Voir le script pour le détail et ses limites (ne teste pas la
confidentialité intra-organisation, qui n'est pas encore appliquée en RLS — voir plus haut).
