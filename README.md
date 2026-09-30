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
sur Supabase AVANT de déployer** (idempotent ; déjà inclus dans `db/schema.sql`). Sans `finance.approve`, une dépense est toujours créée « En attente ». Vérifiée sur un
Postgres 16 local (2 exécutions successives + requêtes de liste/KPI) ; l'upload Storage et
l'enregistrement via Supabase n'ont pas été testés en conditions réelles.

Le formulaire « Nouveau budget » ajoute aussi 4 colonnes à `budgets` :
[`db/migrations/2026-09-30-budget-form-fields.sql`](db/migrations/2026-09-30-budget-form-fields.sql)
(idempotent, inclus dans `db/schema.sql`) — le code ne les envoie que si elles sont renseignées.
Le champ « Ministère / Projet » ajoute `budgets.ministry_id` :
[`db/migrations/2026-09-30-budget-ministry.sql`](db/migrations/2026-09-30-budget-ministry.sql)
(à appliquer aussi ; sans elle, créer un budget avec un ministère échoue).

> Après une migration, si l'app affiche « Could not find the '…' column … in the schema cache », exécuter
> `notify pgrst, 'reload schema';` dans le SQL Editor (les migrations ci-dessus le font déjà).

### Rapports financiers (`/finance/reports`)

Génération de rapports en **PDF, Excel, JSON ou CSV** (`GET /api/finance/report?type=&format=&from=&to=&category=&fund=`,
gardé par `finance.view` + `reports.export`) : vue d'ensemble, état des résultats, exécution budgétaire,
flux de trésorerie, budgets par ministère. Chaque génération est tracée dans `audit_logs`
(`finance.report.generated`) et alimente « Rapports récents » (un clic régénère le fichier, rien n'est
stocké). Les dépenses « en attente » sont comptées, les « rejetées » exclues. Aucune migration requise. Vérifié sur Postgres local (5 types × 4 formats, PDF relu en image) ;
le téléchargement navigateur authentifié n'a pas été testé en conditions réelles.

### Logo de l'église

Paramètres > Église : téléversement du logo (PNG/JPEG/WebP, 2 Mo) dans le bucket public
`churchos-logos`, URL stockée dans `organizations.logo_url`. S'il existe, il remplace le logo
ChurchOS dans le menu latéral (bureau + mobile) et la pastille d'église de la barre du haut ; sans
logo, ChurchOS s'affiche. La Vitrine et les pages d'authentification gardent toujours le logo
ChurchOS. Migration : [`db/migrations/2026-10-01-organization-logos.sql`](db/migrations/2026-10-01-organization-logos.sql)
(idempotente, incluse dans `db/schema.sql`).

### Avatar de l'utilisateur

Profil > Avatar : 12 avatars prédéfinis (`public/avatars/*.svg`, un clic) ou photo personnelle
(PNG/JPEG/WebP, 2 Mo, bucket public `churchos-avatars`, dossier `<user_id>/`). Sans avatar, les
initiales s'affichent. Migration : [`db/migrations/2026-10-01-user-avatars.sql`](db/migrations/2026-10-01-user-avatars.sql)
(idempotente, incluse dans `db/schema.sql`).

### Photo des membres et téléversement de documents

- **Photo d'un membre** : champ « Ajouter une photo » dans le formulaire de création/modification
  (PNG/JPEG/WebP, 2 Mo, bucket public `churchos-member-photos`, stockée dans `people.photo_url`,
  retrait possible). Migration à appliquer : [`db/migrations/2026-10-02-member-photos.sql`](db/migrations/2026-10-02-member-photos.sql)
  (idempotente, incluse dans `db/schema.sql`).
- **Téléversement de document** : le fichier part désormais directement du navigateur vers Supabase
  Storage, puis une Server Action n'enregistre que les métadonnées (la limite de corps de requête
  de Vercel, ~4,5 Mo, faisait planter l'ancien envoi avec « This page couldn't load »). Aucune
  migration. Un `error.tsx` global à `(app)` affiche un message au lieu de la page d'erreur
  générique. Vérifié par typecheck/lint uniquement — à tester en conditions réelles.

### Refonte /training (Cours & Discipolat)

Selon la maquette : bannière (Matthieu 28:19) avec « Nouveau cours », 4 KPI (cours publiés,
apprenants actifs, certifications, taux de complétion), onglets Tous / En cours / Terminés / Mes
cours (+ recherche et tri dans l'URL), grille de cartes de cours (visuel `courses.image_url`,
modules, durée, progression personnelle, bouton Continuer/Commencer/Terminé) et colonne latérale
(Mon parcours en anneau, verset, cours récents, formateurs). « Mes cours » et « Mon parcours »
rapprochent l'utilisateur d'une fiche `people` par email (aucun lien direct compte ↔ personne dans
le schéma) ; sans correspondance ils restent vides. **Écart avec la maquette** : pas de « Parcours
de formation » ni d'onglet « Parcours » (aucune table correspondante) — le 3ᵉ KPI affiche les
certifications délivrées ; pas de badge « En vedette ». Aucune migration. Vérifié par
typecheck/lint uniquement — rendu à contrôler en conditions réelles.

### Formulaire « Nouveau cours »

Refonte selon la maquette : dialogue large en 3 sections (informations générales, détails, paramètres
et visibilité) avec aperçu en direct et image de couverture (PNG/JPEG/WebP, 2 Mo, bucket public
`churchos-course-covers`). Nouveaux champs de `courses` : catégorie, niveau, prérequis, date de
publication, co-formateurs, `allow_enrollment`, `show_in_library`. À la création, « Nombre de
modules » génère « Module 1 » … « Module N » (durée par module optionnelle, durée du cours = somme) ;
ces deux champs n'apparaissent pas à la modification (les modules se gèrent dans la fiche du cours).
**Migrations à appliquer, dans l'ordre** : [`2026-10-03-course-form-fields.sql`](db/migrations/2026-10-03-course-form-fields.sql)
puis [`2026-10-04-course-categories.sql`](db/migrations/2026-10-04-course-categories.sql) (idempotentes,
incluses dans `db/schema.sql`).

- **Catégories modifiables** : table `course_categories` (bouton « Catégories » de la bannière :
  ajout/suppression). Une organisation sans catégorie reçoit les 8 catégories par défaut à la première
  ouverture ; supprimer une catégorie ne change pas les cours qui la portent (`courses.category` est un texte).
- **Inscription** : bouton « S'inscrire » (carte de cours et fiche du cours) qui inscrit le membre
  connecté (`enrollSelf`) ; refusé côté serveur si le cours n'est pas publié ou si « Autoriser
  l'inscription » est désactivé. Les gestionnaires (`training.enroll`) inscrivent toujours qui ils veulent.
  Sans fiche `people` ayant le même email que le compte, l'auto-inscription est indisponible.
- **Bibliothèque** : « Afficher dans la bibliothèque » désactivé = cours masqué aux non-gestionnaires.
- **Image** : téléversement ou URL http(s) externe ; les modules d'un cours existant se gèrent dans sa fiche
  (le formulaire de modification en indique le nombre).

Vérifié par typecheck/lint uniquement.

### Page Certifications (`/training/certifications`) et formulaire « Nouvelle certification »

Nouvelle entrée « Certifications » sous Formations (le menu met désormais en surbrillance l'entrée la
plus spécifique). Page d'après la maquette : bannière (2 Timothée 3:14), 4 KPI (délivrées avec variation
vs année précédente, membres certifiés, programmes, taux de réussite = obtenues / total), onglets
Toutes / En cours / Obtenues / Expirées + recherche, tableau paginé (10 par page), répartition par
programme (anneau), statut (barres) et certifications récentes. Le formulaire (dialogue en 3 sections
avec aperçu du certificat) sert aussi sur la fiche d'un cours (programme figé). **Migration à appliquer** :
[`db/migrations/2026-10-05-certification-form-fields.sql`](db/migrations/2026-10-05-certification-form-fields.sql)
(idempotente, incluse dans `db/schema.sql`) : colonnes `issuer`, `description`, `instructor_person_id`,
`status`, `visibility`, `file_path` et bucket privé `churchos-certificates` (PDF/PNG/JPG, 5 Mo, envoi direct
navigateur → Storage, téléchargement par URL signée).

- Statut affiché : « En cours » si enregistré ainsi ; « Expirée » si enregistré ainsi ou si la date d'expiration
  est passée ; sinon « Obtenue ».
- Visibilité appliquée côté serveur : les responsables (admin, `training.certify`, `training.manage`) voient
  tout ; les autres voient les certifications « toute l'église » et les leurs si « visibles par le membre ».
- « Notifier le membre » crée une notification in-app (`notifications.person_id`) — aucun écran ne les
  affiche encore, et aucun email/SMS n'est envoyé.
- Non reproduit de la maquette : le bouton « Filtres » (la recherche et les onglets couvrent le besoin) et le
  sélecteur de taille de page.

Vérifié par typecheck/lint/build uniquement.

### Reste à faire

- **Page de l'utilisateur connecté (`/settings/profile`)** : écrite (infos personnelles, préférences, changement de mot de passe avec réauthentification), vérifiée par typecheck/lint uniquement — à tester en conditions réelles.
- Refonte selon les maquettes des modules restants : Finance, Training, Communication, Documents,
  Resources, Analytics, Reports, Settings, AI, Teams.
- Finir la vérification live des Phases 14 et 15, puis les marquer ✅.
- Reporté volontairement : paiements mobiles (Orange Money, MTN, Wave), RAG/pgvector, streaming des
  réponses IA, `lib/feature-flags/`, alertes de paiement en retard.
