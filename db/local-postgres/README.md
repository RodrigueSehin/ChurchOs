# Postgres local (dev sans Docker)

Cette machine de développement n'a ni Docker ni Postgres installés, donc pas de `supabase start`
possible. `npm run db:local` télécharge et lance un Postgres réel, portable (binaires
[`embedded-postgres`](https://www.npmjs.com/package/embedded-postgres), pas d'installeur, pas de
droits admin), dans `.local-postgres/` (gitignored) à la racine du projet.

Il applique aussi automatiquement :
- [`roles-stub.sql`](./roles-stub.sql) : crée les rôles Postgres `anon`/`authenticated`/
  `service_role` que Supabase préconfigure sur chaque projet (nécessaires aux `grant ... to
  authenticated` de `db/schema.sql`).
- [`auth-stub.sql`](./auth-stub.sql) : un schéma `auth` minimal (`auth.users` avec les colonnes
  lues par nos triggers, `auth.uid()`) qui **n'existe que localement**. Sur un vrai projet
  Supabase, ce schéma existe déjà nativement (bien plus complet) — ce stub n'est jamais exécuté
  contre Supabase.

## Utilisation

```bash
npm run db:local          # démarre Postgres sur localhost:54329, reste au premier plan (Ctrl+C pour arrêter)
```

Dans un autre terminal, avec `DATABASE_URL` pointant vers cette instance (`.env.local`, déjà
configuré) :

```bash
npm run db:migrate:local   # applique db/schema.sql (le vrai schéma, tel quel — voir pgvector ci-dessous)
npm run db:seed            # seed "Église Évangélique La Source" (via create_organization_for_current_user)
npm run db:verify-rls      # preuve d'isolation multi-tenant RLS (SET LOCAL ROLE authenticated + claim JWT simulé)
```

`db/schema.sql` est idempotent (`create table if not exists`, `on conflict do nothing`,
`drop trigger/policy if exists` avant recréation) — relancer `db:migrate:local` plusieurs fois est
sans danger.

## pgvector (module IA)

Le Postgres portable local (binaires [zonky/embedded-postgres](https://github.com/zonkyio/embedded-postgres))
n'inclut pas l'extension `pgvector` — installer une extension C sur Windows nécessiterait soit
Docker (absent ici), soit compiler pgvector avec Visual Studio, soit un binaire précompilé non
officiel (risque supply-chain non pris). Conséquence concrète :

- `db/schema.sql` contient `create extension "vector"`, la table `ai_documents` (colonne
  `embedding vector(1536)`) et son index ivfflat — dépendants de pgvector.
- `npm run db:migrate:local` détecte l'absence de l'extension côté serveur (`pg_extension`) et
  retire automatiquement ces 3 fragments avant application (voir le script pour le détail exact
  des remplacements). Le reste du fichier (~50 tables, fonctions, triggers, RLS, seed) s'applique
  normalement.
- Sur Supabase, activer l'extension `vector` (dashboard → Database → Extensions, ou
  `create extension if not exists vector;`), puis appliquer `db/schema.sql` tel quel (SQL Editor
  ou `psql $DATABASE_URL -f db/schema.sql`) — le fragment `ai_documents` s'applique alors
  normalement, sans script de contournement.

## Quand passer à Supabase

Dès qu'un vrai projet Supabase est disponible, pointez `DATABASE_URL` vers sa chaîne de connexion
Postgres. `db/schema.sql` est déjà celui réellement déployé sur ce projet, donc en théorie déjà
appliqué — `db:seed` (adapté pour ne pas dupliquer une organisation existante, voir
`db/seed/index.ts`) et `db:verify-rls` fonctionnent alors contre les vraies données, sans stub
(`auth.users`/`auth.uid()` fournis nativement par Supabase).
