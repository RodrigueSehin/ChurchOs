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

### Bibliothèque (`/library`)

Entrée « Bibliothèque » sous Formations. Page d'après la maquette : bannière (Psaumes 119:105) avec
« Catégories » (gestion) et « Ajouter une ressource », 4 KPI (ressources avec variation vs mois dernier,
catégories, téléchargements, note moyenne), onglets par type (Livres, Études bibliques, Enseignements,
Documents, Vidéos, Audios), recherche (titre, auteur, description, tags), filtres catégorie / format / tri
+ « Mes favoris », cartes (couverture, catégorie, auteur, format · taille, vues, téléchargements, favori,
téléchargement, menu : noter 1–5 / supprimer), colonne latérale Catégories (avec compteurs) et Ressources
populaires. Droits : `training.view` pour consulter, `training.manage` pour ajouter/supprimer/gérer les
catégories ; les non-gestionnaires ne voient que les ressources publiées et « visibles par tous les membres ».
**Migration à appliquer** : [`db/migrations/2026-10-06-library.sql`](db/migrations/2026-10-06-library.sql)
(idempotente, incluse dans `db/schema.sql`) : tables `library_categories`, `library_resources`,
`library_bookmarks`, `library_ratings`, buckets `churchos-library` (privé, fichiers jusqu'à 100 Mo, URL
signées) et `churchos-library-covers` (public, 5 Mo). Les fichiers sont envoyés directement du navigateur vers
Storage. Supabase plafonne aussi la taille par fichier au niveau du projet (Storage > Settings) : l'augmenter
si 100 Mo est refusé.

- Écarts avec la maquette : pas de bouton « Filtres » séparé (les filtres sont affichés), pas de durée,
  des vidéos/audios (le formulaire n'en contient pas : la taille est affichée), « Année de publication » est un
  champ date.
- **Modification** : l'administrateur et le propriétaire de l'église (rôles `SUPER_ADMIN` / `CHURCH_OWNER`, `isAdmin`) voient « Modifier » dans le menu ⋮ de chaque carte et sur la page de lecture ; le formulaire est pré-rempli, le fichier et la couverture ne sont remplacés que si on en choisit de nouveaux (couverture retirable), les anciens fichiers sont supprimés après coup. Le droit est revérifié côté serveur (`updateResource`). Les autres gestionnaires de formation peuvent ajouter et supprimer mais pas modifier.
- Le compteur de vues s'incrémente à l'ouverture, celui de téléchargements au téléchargement.

**Formats : PDF et DOCX uniquement** (formulaire, bucket Storage et filtres ; les types vidéo/audio ont été
retirés). Cliquer une carte ouvre `/library/[id]` : un PDF s'affiche dans la page (servi par
`/api/library/[id]/file`, relayé en flux depuis l'URL signée, depuis notre origine), un DOCX est converti
en HTML (mammoth) puis filtré par liste blanche (sanitize-html) ; au-delà de 20 Mo ou en cas d'échec de
lecture, un message invite à télécharger. « Télécharger » (carte et page de lecture) passe par la même route
(`?download=1`) et incrémente le compteur. Si `2026-10-06-library.sql` a déjà été exécutée, appliquer aussi
[`2026-10-07-library-pdf-docx.sql`](db/migrations/2026-10-07-library-pdf-docx.sql) (restreint le bucket).
Les mises en page très riches d'un DOCX (colonnes, zones de texte, en-têtes) ne sont pas reproduites à
l'identique par l'aperçu ; le téléchargement donne le fichier d'origine.

Vérifié par typecheck/lint/build uniquement.

### Versets du jour

Chaque bannière de page affiche un verset (Louis Segond) qui change chaque jour **et** correspond au
sujet de la page : `src/lib/verses.ts` contient une liste thématique par contexte (membres, familles,
visiteurs, groupes, pastoral, prière, visites, conseil pastoral, ministères, ouvriers, services,
plannings, événements, inscriptions, calendrier, présences, dons, finances, formations, certifications,
bibliothèque, tableau de bord, connexion, création d'église — 7 à 8 versets chacune).
`getDailyVerse(contexte, slot?)` choisit de façon déterministe (jour UTC = heure d'Abidjan, décalage propre
à chaque contexte) : même verset toute la journée pour tout le monde, rien à stocker. `PageHero` prend
`verseContext` ; les versets secondaires (cartes latérales de Services, Prière, Ouvriers, Formations)
utilisent `slot = 1` pour différer du verset de la bannière. Les layouts de connexion/création d'église
appellent `connection()` pour ne pas figer le verset au build. Pour ajouter un verset, l'ajouter à la
liste du contexte concerné.

### Annonces et messages (`/communication`) et « Nouvelle annonce »

**Page** : bannière avec « Nouvelle annonce », 4 KPI (annonces publiées, messages envoyés, membres touchés,
taux de lecture moyen = lecteurs distincts / membres actifs, moyenné sur les annonces publiées), onglets
Toutes / Annonces / Messages / Brouillons / Planifiées, tableau unifié annonces + messages (vignette, type,
destinataires, date, statut, vues, actions Lire / Modifier / Supprimer), panneaux Répartition par type,
Destinataires et Annonces récentes. Les « vues » d'une annonce comptent les utilisateurs qui l'ont ouverte
(`announcement_reads`, une fois chacun) ; pour un message, les destinataires l'ayant lu. Une annonce
programmée dont l'heure est passée est affichée comme publiée (aucune tâche planifiée requise). Les anciens
onglets (Modèles, Composer, Historique) restent accessibles par les liens sous les onglets.

**Formulaire** (`/communication/new`, `/communication/[id]/edit`) : 4 sections (infos : titre, type, catégorie,
importance, contenu avec mise en forme **gras** / _italique_ / ++souligné++ / listes / liens ; médias :
image 5 Mo, vidéo MP4 ou document PDF/DOCX 50 Mo, envoi direct navigateur → Storage ; destinataires : tous
ou groupes/ministères ; publication : immédiate, brouillon ou programmée) + aperçus de l'annonce et des
réseaux sociaux.

**Publication sur les réseaux sociaux** (Paramètres > Réseaux sociaux, `/settings/social`, admin/propriétaire) :
- **Facebook (Page)** et **Instagram (compte Business)** via la Graph API de Meta : on connecte un compte en
  saisissant son identifiant et un jeton d'accès longue durée ; le couple est vérifié auprès de Meta, le jeton
  est **chiffré** (AES-256-GCM, variable `SOCIAL_TOKEN_KEY` = `openssl rand -base64 32`, à ajouter sur Vercel)
  puis stocké ; il ne quitte jamais le serveur. Facebook : publication immédiate ou programmation native (10 min
  à 30 jours). Instagram : image obligatoire, pas de programmation (limite de l'API).
- **WhatsApp** : pas d'API de publication vers un groupe ; le bouton ouvre WhatsApp avec le texte prérempli.
- La publication sociale est tentée après l'enregistrement : un échec chez Meta est affiché par compte
  (`announcement_social_posts`) sans annuler l'annonce. Non testée contre les vraies API (aucun jeton ici).

**Migrations à appliquer** : [`2026-10-08-announcements-redesign.sql`](db/migrations/2026-10-08-announcements-redesign.sql)
et [`2026-10-09-announcement-composer.sql`](db/migrations/2026-10-09-announcement-composer.sql) (idempotentes,
incluses dans `db/schema.sql`).

### Messages (SMS/Email) (`/communication/messages`) et Médias (`/communication/media`)

Menu Communication : **Annonces**, **Messages (SMS/Email)**, **Médias**. La page Messages suit la maquette : 3 KPI
(messages envoyés avec variation vs mois dernier, destinataires uniques, taux de délivrance), onglets Tous / SMS /
Email / Brouillons / Planifiés (+ lien Modèles, recherche), tableau paginé (titre, destinataires, canal, date, statut,
statistiques ✓ / ✗, menu Modifier / Envoyer maintenant / Dupliquer / Supprimer) et composeur « Nouveau message » en 3
étapes : destinataires (tous les membres actifs, groupes / ministères, liste personnalisée de personnes ; compteur de
destinataires joignables), contenu (modèle, compteur 160 caractères pour un SMS, variables `{{prenom}}` / `{{nom}}`),
planification (maintenant ou date + heure) et boutons Brouillon / Envoyer. **Aucune migration** : tout repose sur
les tables `messages` et `notifications` existantes (une ligne `notifications` par destinataire).

- **SMS** : API REST Twilio (`src/lib/sms/twilio.ts`). Variables à ajouter : `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `TWILIO_FROM` (ou `TWILIO_MESSAGING_SERVICE_SID`) et, si besoin, `SMS_DEFAULT_COUNTRY_CODE` (225 par défaut) pour
  compléter les numéros locaux. Sans elles, la page affiche un bandeau et l'envoi est refusé (le message reste en brouillon).
- **Email** : Resend (`RESEND_API_KEY`), comme avant.
- **Messages planifiés** : aucun planificateur interne. Appeler `GET /api/cron/send-messages` avec l'en-tête
  `Authorization: Bearer $CRON_SECRET` (variable `CRON_SECRET` à définir) toutes les ~5 minutes (Vercel Cron ou autre) ; sans
  cela, un message planifié reste en attente (« Envoyer maintenant » le déclenche à la main). L'envoi est protégé contre le double envoi.
- Le taux de délivrance compte les envois acceptés par le fournisseur (pas de webhook de remise).
- Écarts avec la maquette : pas de bouton « Filtres » séparé ; pas de pagination par taille de page.

Vérifié par typecheck/lint/build uniquement — jamais essayé avec de vrais comptes Twilio / Resend.

### Médias (`/communication/media`)

D'après la maquette : 4 KPI (photos, vidéos, audios, documents, avec variation vs mois dernier) + stockage utilisé
(sur 10 Go, constante `MEDIA_STORAGE_QUOTA_BYTES`), onglets Tous / Photos / Vidéos / Audios / Documents + recherche
(titre, tags), grille de 12 médias paginée et panneau de détail (aperçu, téléchargement, partage = copie du lien,
suppression, informations, tags modifiables, titre modifiable).

- **Vidéos = celles de la chaîne YouTube de l'église** (aucun téléversement de vidéo). Un administrateur clique sur « Relier YouTube »
  et colle l'URL de la chaîne (`youtube.com/@nom`, `/channel/UC…` ou `/c/nom`) ; elle est stockée dans
  `media_youtube_channels`. Les 150 dernières vidéos publiques sont lues via l'API YouTube Data v3 (playlist « uploads », durée et vues
  comprises), mises en cache 15 min, et lues dans un lecteur intégré (`youtube-nocookie`). Variable à ajouter : **`YOUTUBE_API_KEY`**
  (clé API « YouTube Data API v3 » créée dans Google Cloud ; aucune authentification OAuth requise, la chaîne doit être publique).
  Le compteur « Vidéos » utilise le total de la chaîne.
- **Photos, audios (MP3 / M4A / WAV / OGG) et documents (PDF / DOCX)** : « Ajouter un média » (jusqu'à 20 fichiers, 100 Mo chacun, envoi direct navigateur → bucket public
  `churchos-media`). Les images et documents joints aux annonces apparaissent aussi (lecture seule) ; les vidéos d'annonce ne sont pas listées.
- Droits : `communication.view` pour consulter, `communication.manage` pour ajouter / modifier / supprimer, administrateur pour relier la chaîne.
- **Migration à appliquer** : [`db/migrations/2026-10-10-media-library.sql`](db/migrations/2026-10-10-media-library.sql) (idempotente, incluse dans
  `db/schema.sql` et `2026-10-all-migrations.sql`) : tables `media_items`, `media_youtube_channels`, bucket `churchos-media`.
- Écarts avec la maquette : pas d'onglet **Albums** ni d'action **Déplacer** (aucun modèle d'album), pas de « Ajouté par », pas de bouton « Filtres », pas de durée des audios ni de forme d'onde.

Vérifié par typecheck/lint/build uniquement — jamais essayé avec une vraie clé YouTube ni un vrai bucket.

### Salles & équipements (`/resources`)

Refonte d'après la maquette : bannière (1 Corinthiens 14:40, contexte de verset `resources`), 4 KPI (salles et équipements avec
le nombre ajouté ce mois, réservations ce mois avec variation %, taux d'occupation avec variation en points), onglets
**Salles / Équipements / Réservations / Calendrier** (+ recherche dans l'URL), bouton bleu à menu **Nouvelle salle / Nouvel équipement**.

- **Salles** : tableau paginé (nom, capacité, type en pastille, localisation, statut, icônes d'équipements +N, menu Réserver / Modifier / Supprimer)
  et panneau de détail de la salle sélectionnée (photo ou visuel par défaut avec carrousel si `metadata.photos`, capacité, localisation,
  type, description, équipements affectés avec « Voir tout (n) », 3 prochaines réservations avec statut, boutons Modifier / Réserver cette salle).
  Statut affiché « Réservée » quand une réservation active (en attente / confirmée) couvre l'instant présent, « En maintenance » si la salle l'est.
- **Équipements** (équipements, véhicules et autres) : catégorie, quantité, salle d'affectation, statut ; filtrable par salle (`?room=`).
- **Réservations** : toutes les réservations (60 jours passés à 1 an à venir), statut modifiable par le gestionnaire ou le demandeur (règles inchangées).
- **Calendrier** : vue mensuelle (`?month=YYYY-MM`) des réservations non annulées.
- **Taux d'occupation** = heures réservées des salles sur 30 jours ÷ (salles disponibles × 30 j × 12 h d'ouverture, 8 h – 20 h), comparé aux 30 jours précédents.
- **Formulaires pleine page** (menu du bouton bleu) : `/resources/new-room` (4 sections : infos générales ; disponibilité et paramètres — statut, réservable par,
  autoriser les réservations, validation requise, calendrier public ; équipements cochables ; photos) et `/resources/new-equipment` (5 sections : infos ; détails —
  marque, modèle, n° de série, état, date et valeur d'achat ; affectation — salle et responsable ; garantie, fournisseur, référence facture ; photo et documents),
  chacun avec **aperçu en direct** à droite, « Enregistrer en brouillon » (statut `draft`, visible des seuls gestionnaires, hors indicateurs, non réservable) et
  « Créer ». Modification : `/resources/[id]/edit` (même formulaire). Le fil d'Ariane affiche le groupe du menu (« Ressources › Salles & équipements › Nouvelle salle »).
- **Migration à appliquer** : [`db/migrations/2026-10-11-resources-forms.sql`](db/migrations/2026-10-11-resources-forms.sql) (idempotente, incluse dans `db/schema.sql` et
  `2026-10-all-migrations.sql` ; testée deux fois sur Postgres 16) : colonnes de `resources` (capacité, type de salle, équipements, réservable par, options de réservation,
  notes, catégorie, marque, modèle, série, état, achat, salle d'affectation, responsable, garantie, fournisseur, facture, photos, documents), statut `draft`, et deux buckets :
  `churchos-resources` (photos, public, 5 Mo) et `churchos-resource-docs` (documents PDF/JPG/PNG, privé, URL signée, 5 Mo). Les valeurs déjà rangées dans `metadata`
  (capacité, type, catégorie, salle) sont reprises. Sans la migration, les pages affichent « Mise à jour de la base de données requise ».
- Les réservations respectent désormais les réglages de la salle : désactivées si « Autoriser les réservations » est coupé, « Réservable par » (membres / responsables / administrateurs),
  et « Validation requise » (réservation « En attente » ; sinon « Confirmée » d'emblée). Les ressources existantes gardent la validation requise.
- Écarts avec la maquette : champ **Quantité** ajouté au formulaire d'équipement (sans lui, impossible de saisir « 200 chaises »), liste « Équipements » du panneau de salle =
  cases cochées + catégories des équipements installés, pas de bouton « Filtres », pas d'actions groupées, pas de sélecteur de taille de page, pas de photo recommandée imposée
  (indication seulement). Les documents d'équipement ne se téléchargent que depuis le formulaire de modification.

Vérifié par typecheck/lint/build uniquement — rendu à contrôler en conditions réelles.

### Création d'un utilisateur par un administrateur (Paramètres > Utilisateurs)

« Créer un utilisateur » (prénom, nom, email, rôle, fonction) remplace l'ancienne invitation par email. `POST /api/organizations/members/create` (permission
`settings.manage`, client admin Supabase côté serveur uniquement) **génère un mot de passe aléatoire** (14 caractères, CSPRNG, conforme à la politique :
majuscule, minuscule, chiffre, caractère spécial ; caractères ambigus 0/O/1/l/I exclus — `src/lib/auth/password.ts`), crée le compte (email confirmé) et le
rattache à l'église avec son rôle. L'administrateur voit **une seule fois** l'identifiant et le mot de passe (boutons Copier) ; ils sont aussi envoyés par
email à l'utilisateur si `RESEND_API_KEY` est configurée. Le mot de passe n'est jamais stocké en clair. À sa première connexion (`/login` → son église),
l'utilisateur est redirigé vers `/reset-password/update` et doit choisir un nouveau mot de passe (drapeau `user_metadata.must_change_password`, levé par
`updatePassword`). Si l'email a déjà un compte ChurchOS (autre église), il est simplement rattaché à cette église sans toucher à son mot de passe. En cas
d'échec du rattachement, le compte tout juste créé est supprimé. Pas de migration. Vérifié par typecheck/lint/build uniquement — jamais essayé contre un vrai
projet Supabase. Non fait : bouton « Réinitialiser le mot de passe » d'un utilisateur existant (l'utilisateur peut passer par « Mot de passe oublié »).

### Page Vitrine animée (`/`)

Animations en CSS pur + un petit composant `Reveal` (IntersectionObserver), sans dépendance : entrée échelonnée du hero (badge, titre au mot « ChurchOS » en dégradé
animé, texte, boutons), halos lumineux flottants, image de l'église en lent zoom avec trois cartes d'interface qui flottent, apparition au défilement des modules,
fonctionnalités (qui arrivent de la gauche), aperçu du tableau de bord (de la droite, avec l'aperçu mobile flottant), cartes « pourquoi », tarifs (le prix
se ré-anime au changement mensuel / annuel), témoignages (étoiles animées au survol) ; FAQ à ouverture animée ; bannière finale avec reflet et bouton pulsant ;
barre de navigation qui prend de l'ombre au défilement, soulignement animé des liens, menu mobile qui glisse ; défilement doux vers les ancres.
`prefers-reduced-motion` désactive toutes les animations, et sans JavaScript tout reste visible (`<noscript>`). Les keyframes sont dans `tailwind.config.ts`,
les classes `.reveal` dans `globals.css`. Vérifié dans Chromium (Playwright) : entrée du hero, révélation de toutes les sections au défilement, ombre de la barre,
mode « mouvement réduit ».
Correction au passage : la palette `blue` de Tailwind était entièrement remplacée par la teinte de marque, donc `bg-blue-100`, `text-blue-600`… n'existaient pas
(pastilles et icônes bleues sans couleur dans toute l'application) ; la palette standard est rétablie, `bg-blue` gardant la teinte de marque.

### Menu filtré par permissions et changement de rôle

- **Menu** : chaque entrée de `src/lib/navigation.ts` porte la permission que vérifie sa page (`permission`) ; le layout résout les permissions du membre
  (`getAllowedNavHrefs`) et le menu (bureau, mobile, menu du compte) n'affiche que les modules autorisés ; une section sans entrée disparaît avec son titre.
  Tableau de bord, ChurchOS AI, Profil et Notifications restent visibles par tous (l'IA filtre elle-même ses outils par permission) ; les pages restent protégées côté
  serveur. Exemples : un `MEMBER` voit 14 entrées, un `FINANCE_MANAGER` 14, un administrateur 40. Les permissions étant lues à chaque requête, un changement de rôle
  agit dès le prochain chargement de page. Limite : le Tableau de bord vérifie `members.view` ; un rôle sans cette permission voit « accès refusé » sur cette page.
- **Changer le rôle d'un utilisateur** (Paramètres > Utilisateurs, liste déroulante « Rôle » de la ligne) : `updateMemberRole` vérifie que le membre et le rôle sont de
  l'église, interdit de modifier son propre rôle, réserve l'attribution / le retrait d'un rôle d'administrateur aux administrateurs, empêche de rétrograder le dernier
  administrateur, et ajoute le nouveau rôle avant de retirer les anciens (jamais de membre sans rôle). Confirmation « Rôle mis à jour » affichée sous la liste.

### Permissions par module (Paramètres > Rôles)

Le catalogue passe de 61 à 70 permissions : certifications, bibliothèque, messages SMS/Email, médias, salles et équipements ont désormais **leurs propres permissions**
(avant, ils dépendaient de `training.*`, `communication.*` et `resources.*`) : `certifications.view`, `library.view` / `library.manage`, `messages.view` / `messages.send`,
`media.view` / `media.manage`, `rooms.view` / `rooms.manage` / `rooms.reserve`, `equipment.view` / `equipment.manage` / `equipment.reserve`. Les pages, actions serveur, le menu
et la matrice des rôles les utilisent ; la matrice affiche un libellé pour chaque module. Annonces : `communication.*` (sans `communication.send`, remplacée par `messages.send`) ;
cours : `training.*`. Dans Salles & équipements, chaque onglet, KPI, bouton et réservation respecte le droit du type concerné (un rôle qui n'a que `equipment.*` ne voit
pas les salles, et inversement ; les brouillons ne sont visibles que de qui gère le type).
**Migration à appliquer** : [`db/migrations/2026-10-12-permissions-modules.sql`](db/migrations/2026-10-12-permissions-modules.sql) (idempotente, incluse dans `db/schema.sql` et
`2026-10-all-migrations.sql`, testée deux fois sur Postgres 16) : ajoute les nouvelles permissions, **reprend les droits déjà accordés** (un rôle qui avait `training.view` reçoit `certifications.view`
et `library.view`, `communication.view` → `messages.view` + `media.view`, `resources.*` → `rooms.*` + `equipment.*`, etc.) puis supprime `communication.send` et `resources.*`. À exécuter AVANT
de déployer : sans elle, les rôles personnalisés perdent l'accès à ces modules (les administrateurs gardent tout) et la matrice n'affiche pas les nouvelles lignes.

### Migrations manquantes : message explicite au lieu d'une page en erreur

Les pages `/training`, `/training/certifications`, `/library`, `/communication` (et ses pages de
formulaire) et `/settings/social` détectent une base sans la migration attendue (erreur Postgres
« colonne / table inexistante », `src/lib/db/schema-guard.ts`) et affichent « Mise à jour de la base de
données requise » avec le fichier à exécuter, au lieu de l'erreur React #441 (message masqué en
production). Le fichier **`db/migrations/2026-10-all-migrations.sql`** regroupe les migrations du 3 au
9 octobre (formulaire de cours, catégories de cours, certifications, bibliothèque, annonces) : à
exécuter une fois dans le SQL Editor Supabase (idempotent) ; `2026-10-07-library-pdf-docx.sql` reste
à part si la bibliothèque avait été créée avant la restriction PDF/DOCX. YouTube a été retiré du
formulaire d'annonce (seuls Facebook, Instagram et le partage WhatsApp restent).

### Récapitulatif : à appliquer après chaque déploiement

| Quoi | Où | Pour |
| --- | --- | --- |
| `db/migrations/2026-10-all-migrations.sql` (idempotent) | SQL Editor Supabase | Cours, catégories de cours, certifications, bibliothèque, annonces, médias, salles & équipements, permissions par module (3 au 12 oct.) |
| `db/migrations/2026-10-07-library-pdf-docx.sql` | SQL Editor Supabase | Seulement si `2026-10-06-library.sql` avait été exécutée avant la restriction PDF/DOCX |
| `SOCIAL_TOKEN_KEY` (`openssl rand -base64 32`) | Variables Vercel | Connecter Facebook / Instagram (Paramètres > Réseaux sociaux) |
| `YOUTUBE_API_KEY` + migration `2026-10-10-media-library.sql` (+ `2026-10-11-resources-forms.sql` pour Salles & équipements) | Variables Vercel / SQL Editor | Page Médias (vidéos de la chaîne YouTube, téléversements) |
| `TWILIO_*`, `CRON_SECRET` + appel périodique de `/api/cron/send-messages` | Variables Vercel / planificateur | Envoi de SMS et messages planifiés |

Migrations plus anciennes (mai–sept.) : `db/migrations/*.sql` par ordre de date, toutes incluses dans
`db/schema.sql`. Une page dont la migration manque affiche un message explicite (voir ci-dessus).

### Reste à faire

- **Page de l'utilisateur connecté (`/settings/profile`)** : écrite (infos personnelles, préférences, changement de mot de passe avec réauthentification), vérifiée par typecheck/lint uniquement — à tester en conditions réelles.
- **Tout ce qui est décrit comme « vérifié par typecheck/lint/build uniquement » ci-dessus** (Training, Certifications, Bibliothèque, Annonces, publication Facebook/Instagram, versets du jour) est à tester en conditions réelles ; la publication Meta n'a jamais été essayée avec de vrais jetons.
- Refonte selon les maquettes des modules restants : Documents, Analytics, Reports,
  Settings, AI, Teams. 
- Finir la vérification live des Phases 14 et 15, puis les marquer ✅.
- Reporté volontairement : paiements mobiles (Orange Money, MTN, Wave), RAG/pgvector, streaming des
  réponses IA, `lib/feature-flags/`, alertes de paiement en retard, publication YouTube (l'API ne
  permet pas de publier du texte), publication WhatsApp automatique (pas d'API vers un groupe).
