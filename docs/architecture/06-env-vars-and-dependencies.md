# Variables d'environnement & dépendances

## Variables d'environnement

Voir [`../../.env.example`](../../.env.example) pour le fichier réel. Résumé par domaine :

| Variable | Domaine | Exposée client ? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase (bypass RLS, server-only) | ❌ |
| `DATABASE_URL` | Postgres direct (Drizzle migrations/queries serveur) | ❌ |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'app | ✅ |
| `RESEND_API_KEY` | Email | ❌ |
| `SMS_PROVIDER` / `SMS_API_KEY` / `SMS_SENDER_ID` | SMS (abstraction `SmsProvider`) | ❌ |
| `WHATSAPP_BUSINESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business API | ❌ |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Jobs asynchrones | ❌ |
| `OPENAI_API_KEY` | ChurchOS AI | ❌ |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Billing | ❌ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Billing (Stripe Elements) | ✅ |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_AUTH_TOKEN` | Monitoring erreurs | DSN public, token serveur |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | Analytics produit | ✅ |
| `CRON_SECRET` | Protection des Route Handlers de jobs planifiés | ❌ |

Règle : toute clé secrète (service role, API providers, webhook secrets) ne porte **jamais** le
préfixe `NEXT_PUBLIC_` et n'est lue que dans du code server-only (`lib/*`, Server Actions, Route
Handlers). Un lint custom (ou une règle `eslint-plugin-node`/`server-only` import) empêche
l'import accidentel d'un module server-only depuis un composant client.

## Dépendances npm (V1)

### Core

```text
next, react, react-dom, typescript
```

### UI

```text
tailwindcss, postcss, autoprefixer
class-variance-authority, clsx, tailwind-merge
lucide-react
@radix-ui/* (via shadcn/ui — installés au fur et à mesure des composants générés)
```

### Data & forms

```text
@tanstack/react-query, @tanstack/react-table
zustand
react-hook-form, @hookform/resolvers
zod
```

### Database & backend

```text
drizzle-orm, drizzle-kit          — installés en Phase 2
postgres                          — driver pg (Supabase ou Postgres local), installé en Phase 2
server-only                       — garde-fou import serveur, installé en Phase 2
@supabase/supabase-js, @supabase/ssr  — Phase 3 (Auth)
```

Outillage dev-only (Phase 2, jamais importé par l'app) :

```text
tsx        — exécute les scripts db/seed, db/local-postgres, db/scripts en TypeScript
dotenv     — charge .env.local dans ces scripts (Next.js le fait nativement pour l'app)
embedded-postgres — Postgres local portable pour le dev sans Docker (voir db/local-postgres/README.md)
```

### Jobs & communication

```text
inngest
resend
```

### IA

```text
openai
```

### Monitoring

```text
@sentry/nextjs
posthog-js, posthog-node
```

### Paiement (abstrait derrière PaymentProvider)

```text
stripe
```

### Utilitaires

```text
date-fns
nanoid          # génération de tokens QR, slugs
qrcode          # génération QR code (inscriptions, présence)
```

### Dev / qualité

```text
eslint, eslint-config-next, @typescript-eslint/*
prettier, prettier-plugin-tailwindcss
vitest, @vitejs/plugin-react, @testing-library/react
@playwright/test
husky, lint-staged
```

Aucune dépendance n'est ajoutée "au cas où" — chaque paquet listé ici est utilisé dès la phase où
il apparaît dans le [plan de sprints](07-sprint-plan.md).
