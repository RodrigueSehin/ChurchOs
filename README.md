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

Détail complet par phase : [`docs/architecture/07-sprint-plan.md`](docs/architecture/07-sprint-plan.md).

| Phase | Statut |
| --- | --- |
| 1 Foundation, 2 Database | ✅ Livrées (schéma Supabase réel, RLS prouvé par `npm run db:verify-rls`, miroir Drizzle, seed) |
| 3 Authentication, 4 Organization (RBAC) | ✅ Livrées, vérifiées en conditions réelles |
| 5 Members, 6 Pastoral, 7 Ministries | ✅ Livrées, vérifiées en conditions réelles |
| 8 Events, 9 Finance, 10 Training | ✅ Livrées, vérifiées en conditions réelles |
| 11 Communication, 12 Documents & Resources, 13 Analytics | ✅ Livrées, vérifiées en conditions réelles |
| 14 Billing (Stripe) | 🚧 Architecture livrée ; création client + session Checkout vérifiées en direct. Reste : paiement de test (carte `4242…`, à faire manuellement), synchronisation au retour, proratisation, annulation, facture |
| 15 ChurchOS AI | 🚧 Architecture livrée (tool-calling, filtrage par permission) ; vérification live bloquée par un `429` OpenAI (crédit manquant) |

### Refonte visuelle selon les maquettes

Terminée : tableau de bord, menu latéral, Membres, Familles, Visiteurs, Groupes, Suivi pastoral,
Sujets de prière, Visites, Conseil pastoral, Ministères, Ouvriers, Services, Calendrier, Plannings,
Événements, Inscriptions, Présences, et la page Vitrine (site marketing public).

### Administration globale ChurchOS (`/platform`)

Vue réservée aux administrateurs de la plateforme (table `platform_admins`, distincte du rôle
`SUPER_ADMIN` qui reste limité à une organisation) : indicateurs globaux, liste/recherche des
églises, détail (usage, abonnement), catalogue des plans, journal des actions et suspension/réactivation (tracée dans `audit_logs`, bloque
l'accès de l'église via `/suspended`). Accès : appliquer la nouvelle table de `db/schema.sql`, puis
`npm run db:grant-platform-admin -- email@exemple.com`. Écrite et vérifiée par typecheck/lint
uniquement — à tester en conditions réelles.

### Migration requise : formulaire « Nouvelle dépense »

Les pages Finance lisent de nouvelles colonnes (`title`, `vendor_name`, `status`, ...) et la table
`financial_transaction_attachments` + le bucket `churchos-finance`. **Appliquer
[`db/migrations/2026-09-30-expense-form-fields.sql`](db/migrations/2026-09-30-expense-form-fields.sql)
sur Supabase AVANT de déployer** (idempotent ; déjà inclus dans `db/schema.sql`). Vérifiée sur un
Postgres 16 local (2 exécutions successives + requêtes de liste/KPI) ; l'upload Storage et
l'enregistrement via Supabase n'ont pas été testés en conditions réelles.

Le formulaire « Nouveau budget » ajoute aussi 4 colonnes à `budgets` :
[`db/migrations/2026-09-30-budget-form-fields.sql`](db/migrations/2026-09-30-budget-form-fields.sql)
(idempotent, inclus dans `db/schema.sql`) — le code ne les envoie que si elles sont renseignées.

### Reste à faire

- **Page de l'utilisateur connecté (`/settings/profile`)** : écrite (infos personnelles, préférences, changement de mot de passe avec réauthentification), vérifiée par typecheck/lint uniquement — à tester en conditions réelles.
- Refonte selon les maquettes des modules restants : Finance, Training, Communication, Documents,
  Resources, Analytics, Reports, Settings, AI, Teams.
- Finir la vérification live des Phases 14 et 15, puis les marquer ✅.
- Reporté volontairement : paiements mobiles (Orange Money, MTN, Wave), RAG/pgvector, streaming des
  réponses IA, `lib/feature-flags/`, alertes de paiement en retard.
