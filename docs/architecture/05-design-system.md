# Design System ChurchOS

## Positionnement

SaaS premium, moderne, professionnel, chaleureux — spirituel sans être kitsch. Beaucoup d'espace
blanc, cartes arrondies, ombres très légères, typographie claire, tableaux professionnels,
dashboards riches mais lisibles.

À éviter : esthétique religieuse ou dorée excessive, interfaces surchargées, gradients agressifs,
animations gratuites.

## Couleurs

Définies comme tokens Tailwind (`tailwind.config.ts` → `theme.extend.colors`) et variables CSS
(`src/styles/`) pour supporter un thème par organisation plus tard (white-label ENTERPRISE).

```ts
colors: {
  navy:    '#0B2A4A',  // ChurchOS Navy — headers, sidebar
  blue:    '#1F3F6D',  // ChurchOS Blue — accents secondaires
  gold:    '#EED58E',  // ChurchOS Gold — highlights ponctuels, badges premium (usage rare)
  primary: '#2563EB',  // actions principales, liens, focus ring
  success: '#16A34A',
  warning: '#F59E0B',
  danger:  '#DC2626',
  background: '#F5F8FC',
}
```

Règle d'usage : Navy/Blue pour la structure (sidebar, topbar, titres), Primary pour les actions
interactives, Gold utilisé avec parcimonie (badges plan ENTERPRISE, accents de célébration —
jamais en fond de page ni en couleur de texte principale). Success/Warning/Danger réservés aux
statuts et retours système (jamais comme couleur décorative).

## Typographie

- Police système/Inter via `next/font` (pas de FOUT, poids 400/500/600/700 chargés).
- Échelle : `text-xs` (labels, meta) → `text-sm` (corps de tableau) → `text-base` (corps de
  texte) → `text-lg/xl` (titres de section) → `text-2xl/3xl` (titres de page, KPIs).
- Contraste AA minimum sur `background` (#F5F8FC) et sur `navy` (#0B2A4A) en fond sombre.

## Composants de base (shadcn/ui + wrappers ChurchOS)

- Cartes : `rounded-xl border border-slate-200 shadow-sm bg-white` — jamais d'ombre forte.
- Boutons : primary (`bg-primary`), secondary (outline navy), destructive (`bg-danger`), ghost.
- Badges de statut : couleur dérivée du statut métier (ex. `followup_status`: NEW=slate,
  IN_PROGRESS=blue, TO_FOLLOW_UP=warning, COMPLETED=success, ARCHIVED=slate-400).
- Formulaires : React Hook Form + Zod, erreurs inline sous le champ, jamais de `alert()`.

## Layout global

```text
┌───────────────────────────────────────────────────────┐
│ Sidebar │ Topbar (org switcher, search, notifications, │
│         │        avatar menu)                          │
│         ├─────────────────────────────────────────────┤
│         │ Breadcrumb                                   │
│         │ Page Header (titre + actions principales)    │
│         │ Content                                      │
│         │ Footer (version, support)                    │
└───────────────────────────────────────────────────────┘
```

### Sidebar

```text
ChurchOS

TABLEAU DE BORD

MEMBRES         Membres · Familles · Visiteurs · Groupes
PASTORAL        Suivi pastoral · Sujets de prière · Visites · Conseil pastoral
MINISTÈRES      Ministères · Équipes & ouvriers · Services · Plannings
ÉVÉNEMENTS      Événements · Inscriptions · Présences · Calendrier
FINANCES        Dons & offrandes · Dépenses · Budgets · Rapports financiers
FORMATIONS      Cours & discipolat · Certifications · Bibliothèque
COMMUNICATION   Annonces · Messages · Médias
RESSOURCES      Documents · Salles & équipements
ANALYTICS       Rapports · Tableaux de bord · Statistiques
```

Chaque entrée de sidebar est filtrée par permission (`<module>.view`) et par feature flag — un
utilisateur ne voit jamais une section à laquelle il n'a pas accès.

### Responsive

| Breakpoint | Comportement |
|---|---|
| Desktop (≥1280px) | Sidebar complète, labels visibles |
| Tablet (768–1279px) | Sidebar réduite (icônes + tooltip), topbar compacte |
| Mobile (<768px) | Sidebar en drawer (overlay), bottom actions pour les actions principales de page |

## États UI obligatoires

Chaque page doit gérer explicitement, via des composants réutilisables dans
`components/shared/` :

```text
LoadingState        skeleton adapté au type de contenu (liste, carte, formulaire)
EmptyState           icône + message + action principale ("Ajouter un membre")
ErrorState            message + bouton "réessayer"
PermissionDenied       message clair, jamais un simple 404 trompeur
Skeleton               primitives de chargement pour DataTable, cartes KPI
ConfirmDialog          confirmation pour toute action destructive (delete, cancel)
```

+ `NoResultsState` (recherche/filtre sans résultat, distinct de `EmptyState`) et `OfflineBanner`
(détection `navigator.onLine`, pertinent pour usage mobile en zone de faible connectivité).

## DataTable générique

Composant unique `components/shared/DataTable` (`features/*/components/*Table.tsx` le
consomment) supportant : tri, recherche serveur (debounced), filtres, pagination serveur,
sélection multiple + actions groupées, colonnes configurables (visibilité, ordre persistés en
`localStorage` via Zustand), export (CSV/Excel/PDF via Route Handler dédié), responsive (colonnes
prioritaires conservées en mobile, reste dans un panneau de détail).

## Accessibilité (WCAG 2.1 AA)

- Navigation clavier complète (sidebar, tables, dialogs — focus trap sur les modales).
- `focus-visible` stylé explicitement (pas de `outline: none` sans remplacement).
- `aria-label` sur les boutons icône-seul, `aria-live` sur les toasts/notifications.
- Contrastes vérifiés (Primary #2563EB sur blanc = AA ; texte sur `background` #F5F8FC = AA).
- Tailles de texte redimensionnables (unités `rem`, pas de `px` figés sur le texte).
