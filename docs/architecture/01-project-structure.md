# Arborescence du projet

```text
churchos/
├── .github/
│   └── workflows/
│       ├── ci.yml                     # lint, typecheck, unit tests, build
│       ├── e2e.yml                    # Playwright sur preview deploy
│       └── db-migrate-check.yml       # vérifie que les migrations Drizzle sont à jour
│
├── db/
│   ├── schema.sql                     # LE schéma réel (Supabase live) — tables+fonctions+RLS+seed
│   ├── seed/
│   │   └── index.ts                   # données d'exécution de démo ("Église Évangélique La Source")
│   ├── local-postgres/                # Postgres portable pour dev sans Docker (voir README)
│   │   ├── index.ts
│   │   ├── auth-stub.sql              # stub local de auth.users/auth.uid()/triggers
│   │   ├── roles-stub.sql             # stub local des rôles anon/authenticated/service_role
│   │   └── README.md
│   └── scripts/
│       ├── migrate-local.ts           # applique db/schema.sql en local (saute le fragment pgvector)
│       └── verify-rls.ts              # preuve d'isolation multi-tenant RLS
│
├── drizzle.config.ts                  # utilisé par `drizzle-kit studio` (visualiseur) uniquement
│
├── public/
│   ├── icons/
│   └── manifest.webmanifest           # PWA
│
├── src/
│   ├── proxy.ts                        # ex-middleware.ts (renommé en Next.js 16) : protection des routes
│   ├── app/
│   │   ├── auth/callback/route.ts     # échange le code Supabase (confirmation email, reset password) contre une session
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── reset-password/{page.tsx,update/page.tsx}
│   │   │
│   │   ├── (onboarding)/
│   │   │   └── onboarding/
│   │   │       ├── church/page.tsx
│   │   │       ├── admin/page.tsx
│   │   │       ├── configuration/page.tsx
│   │   │       ├── subscription/page.tsx
│   │   │       └── finalization/page.tsx
│   │   │
│   │   ├── (app)/                     # layout protégé : sidebar + topbar + RBAC guard
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   │
│   │   │   ├── members/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── edit/page.tsx
│   │   │   │
│   │   │   ├── families/{page.tsx,[id]/page.tsx}
│   │   │   ├── visitors/{page.tsx,[id]/page.tsx}
│   │   │   ├── groups/{page.tsx,[id]/page.tsx}
│   │   │   │
│   │   │   ├── pastoral/{page.tsx,new/page.tsx,[id]/page.tsx}
│   │   │   ├── prayer/{page.tsx,new/page.tsx,[id]/page.tsx}
│   │   │   ├── visits/{page.tsx,new/page.tsx}
│   │   │   ├── pastoral-council/page.tsx
│   │   │   │
│   │   │   ├── ministries/{page.tsx,[id]/page.tsx}
│   │   │   ├── teams/page.tsx
│   │   │   ├── workers/page.tsx
│   │   │   ├── services/page.tsx
│   │   │   ├── planning/page.tsx
│   │   │   │
│   │   │   ├── events/{page.tsx,new/page.tsx,[id]/page.tsx}
│   │   │   ├── registrations/page.tsx
│   │   │   ├── attendance/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   │
│   │   │   ├── finance/
│   │   │   │   ├── income/page.tsx
│   │   │   │   ├── expenses/page.tsx
│   │   │   │   ├── budgets/page.tsx
│   │   │   │   └── reports/page.tsx
│   │   │   │
│   │   │   ├── training/page.tsx
│   │   │   ├── communication/page.tsx
│   │   │   ├── documents/page.tsx
│   │   │   ├── resources/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   ├── ai/page.tsx
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── profile/page.tsx
│   │   │       ├── church/page.tsx
│   │   │       ├── users/page.tsx
│   │   │       ├── roles/page.tsx
│   │   │       ├── billing/page.tsx
│   │   │       └── notifications/page.tsx
│   │   │
│   │   ├── api/                       # Route Handlers
│   │   │   ├── webhooks/
│   │   │   │   ├── stripe/route.ts
│   │   │   │   ├── inngest/route.ts
│   │   │   │   └── supabase-auth/route.ts
│   │   │   ├── qr/[token]/route.ts    # scan présence/inscription
│   │   │   ├── exports/[type]/route.ts
│   │   │   └── ai/chat/route.ts
│   │   │
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── features/                      # cœur métier, un dossier par module
│   │   ├── members/
│   │   │   ├── components/            # UI spécifique au module
│   │   │   ├── actions/               # Server Actions (create/update/delete)
│   │   │   ├── queries/               # lectures (Drizzle) côté serveur
│   │   │   ├── schemas/               # Zod schemas (partagés client/serveur)
│   │   │   ├── services/              # logique métier pure, testable
│   │   │   └── types/
│   │   ├── families/
│   │   ├── visitors/
│   │   ├── groups/
│   │   ├── pastoral/
│   │   ├── prayer/
│   │   ├── visits/
│   │   ├── pastoral-council/
│   │   ├── ministries/
│   │   ├── teams-workers/
│   │   ├── services-planning/
│   │   ├── events/
│   │   ├── registrations/
│   │   ├── attendance/
│   │   ├── calendar/
│   │   ├── finance/
│   │   ├── training/
│   │   ├── communication/
│   │   ├── documents/
│   │   ├── resources/
│   │   ├── reports-analytics/
│   │   ├── notifications/
│   │   ├── billing/
│   │   ├── organizations/             # organizations + campuses
│   │   ├── auth/
│   │   ├── rbac/                      # roles, permissions, feature flags
│   │   ├── audit/
│   │   └── ai/
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui primitives (Button, Input, Dialog, …)
│   │   └── shared/                    # DataTable, LoadingState, EmptyState, ErrorState,
│   │                                   # PermissionDenied, Skeleton, ConfirmDialog, Sidebar,
│   │                                   # Topbar, Breadcrumb, PageHeader
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── client.ts              # Drizzle client (server-only)
│   │   │   └── schema/                # miroir manuel (transcrit) de db/schema.sql
│   │   │       ├── enums.ts
│   │   │       ├── auth-ref.ts        # référence typée vers auth.users (géré par Supabase)
│   │   │       ├── identity-org.ts    # profiles, organizations, organization_settings, campuses, organization_memberships
│   │   │       ├── rbac.ts            # roles, permissions, role_permissions, membership_roles
│   │   │       ├── billing.ts         # feature_flags, plans, subscriptions, invoices, payments
│   │   │       ├── people.ts          # people, members, families, family_members, person_relationships, visitors
│   │   │       ├── groups.ts
│   │   │       ├── pastoral.ts
│   │   │       ├── ministries.ts
│   │   │       ├── events.ts
│   │   │       ├── finance.ts
│   │   │       ├── training.ts
│   │   │       ├── communication.ts
│   │   │       ├── documents.ts
│   │   │       ├── ai.ts
│   │   │       ├── audit.ts
│   │   │       └── index.ts
│   │   ├── supabase/
│   │   │   ├── server.ts              # client serveur (cookies, RLS via JWT)
│   │   │   ├── client.ts              # client navigateur
│   │   │   └── admin.ts               # service role — server-only, usage restreint
│   │   ├── auth/
│   │   │   ├── session.ts             # getCurrentUser(), getCurrentOrg()
│   │   │   └── guards.ts              # requirePermission(), requireRole()
│   │   ├── rbac/
│   │   │   └── permissions.ts         # matrice permission → rôle (miroir de la DB)
│   │   ├── inngest/
│   │   │   ├── client.ts
│   │   │   └── functions/             # définitions des jobs
│   │   ├── email/resend.ts
│   │   ├── sms/provider.ts            # abstraction SmsProvider
│   │   ├── whatsapp/provider.ts
│   │   ├── ai/openai.ts
│   │   ├── storage/                   # helpers upload/validation Supabase Storage
│   │   ├── feature-flags/
│   │   ├── audit/log.ts
│   │   ├── errors.ts                  # erreurs métier typées
│   │   └── utils.ts
│   │
│   ├── hooks/                         # hooks React partagés (use-permissions, use-org, …)
│   ├── stores/                        # stores Zustand (ui state, filtres persistés, …)
│   ├── styles/                        # tokens Tailwind, thème
│   └── types/                         # types globaux générés (Database, enums)
│
├── tests/
│   ├── unit/                          # Vitest — miroir de features/*/services
│   └── e2e/                           # Playwright — parcours critiques
│
├── docs/
│   └── architecture/                  # ce dossier
│
├── .env.example
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── playwright.config.ts
```

## Règles de dépendances entre modules

- `features/<module>` peut importer `lib/*`, `components/ui`, `components/shared`.
- `features/<module>` ne doit **pas** importer les fichiers internes (`queries/`, `services/`)
  d'un autre `features/<autre-module>` — s'il a besoin d'une donnée d'un autre module, il importe
  la fonction exposée depuis `features/<autre-module>/services/index.ts` (façade publique).
- `lib/db/schema` est la seule source de vérité des tables Drizzle ; `db/schema.sql` reste le
  document de référence humaine tenu en synchronisation avec les migrations générées.
- Les Server Actions (`actions/`) valident toujours avec Zod + vérifient la permission RBAC avant
  d'appeler un service. Elles ne touchent jamais Drizzle directement (passent par `queries/`
  ou `services/`).
