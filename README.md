# ChurchOS

SaaS de gestion des églises, ministères et communautés chrétiennes. Voir
[`docs/architecture/`](docs/architecture/) pour l'architecture technique complète (STEP 01) et le
plan de développement par phase.

## Prérequis

- Node.js 24 LTS (ou ≥20)

> Sur cette machine, Node.js n'était pas installé au démarrage du projet : une version portable a
> été téléchargée dans `%LOCALAPPDATA%\nodejs-portable\node-v24.21.0-win-x64` et ajoutée au PATH
> utilisateur. **Ouvrez un nouveau terminal** pour que `node`/`npm` soient reconnus directement ;
> sinon utilisez le chemin complet vers `node.exe`/`npm.cmd` dans ce dossier.

## Démarrage

```bash
npm install
npm run dev       # http://localhost:3000
```

## Scripts

```bash
npm run dev        # serveur de développement (Turbopack)
npm run build       # build de production
npm run start        # sert le build de production
npm run lint          # ESLint
npm run format          # Prettier (écrit les fichiers)
```

### Base de données

ChurchOS a un vrai projet Supabase déjà en ligne — **`db/schema.sql` est ce schéma réel**, adopté
tel quel comme source de vérité (voir [`docs/architecture/02-database-schema.md`](docs/architecture/02-database-schema.md)
pour le détail du pivot). Pas de Docker sur cette machine → Postgres local portable pour le
développement (voir [`db/local-postgres/README.md`](db/local-postgres/README.md), notamment la
limitation pgvector) :

```bash
npm run db:local           # démarre Postgres local sur :54329 (premier plan, Ctrl+C pour arrêter)

# dans un autre terminal :
npm run db:migrate:local   # applique db/schema.sql en local
npm run db:seed             # seed "Église Évangélique La Source"
npm run db:verify-rls        # preuve d'isolation multi-tenant (RLS)
```

Contre le vrai projet Supabase : `DATABASE_URL` dans `.env.local` → sa chaîne de connexion, puis
appliquer `db/schema.sql` via le SQL Editor Supabase ou `psql` (déjà fait sur le projet réel en
théorie — voir plus haut).

## État du projet

**Phase 1 — Foundation** ✅ et **Phase 2 — Database** ✅ : terminées.

- Next.js 16 (App Router, Turbopack) + TypeScript strict + Tailwind CSS + composants UI façon
  shadcn/ui (Radix + CVA) + layout applicatif complet (sidebar responsive, topbar, breadcrumb,
  footer) + dashboard avec données de démonstration + pages de tous les modules de la navigation
  en état "en construction" honnête (pas de fonctionnalité simulée).
- Base de données : le schéma **réel** du projet Supabase (`db/schema.sql`, ~50 tables, fonctions
  PL/pgSQL, triggers, RLS, seed RBAC/plans) appliqué et vérifié sur Postgres local ; Row Level
  Security **prouvé** par un test d'isolation multi-tenant (`npm run db:verify-rls`) ; miroir
  Drizzle TypeScript (`src/lib/db/schema/`) pour le requêtage type-safe ; seed de démonstration
  fonctionnel (via la RPC `create_organization_for_current_user`).
**Phase 3 — Authentication** 🚧 : en cours. Login/register/logout/reset-password + onboarding
5 étapes (appelant la vraie RPC `create_organization_for_current_user`) écrits et vérifiés par
build/typecheck/lint, mais **pas testés en conditions réelles** — bloqué sur les identifiants du
vrai projet Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`), à renseigner dans `.env.local`. Sans eux, toute page protégée
retourne une erreur explicite (vérifié). Voir
[`docs/architecture/07-sprint-plan.md`](docs/architecture/07-sprint-plan.md) pour le détail complet.
