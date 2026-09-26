/** Pays/devises/formats de date : données génériques, partagées avec `features/organizations`
 * (paramètres d'église) — voir `lib/constants/reference-data.ts`. */
export {
  COUNTRIES,
  getCountry,
  DATE_FORMATS,
  CURRENCIES,
  type CountryOption,
} from "@/lib/constants/reference-data";

export const CHURCH_TYPES = [
  { value: "local", label: "Église locale" },
  { value: "network", label: "Réseau d'églises" },
  { value: "campus", label: "Antenne / campus" },
  { value: "ministry", label: "Ministère / association" },
] as const;

export const ADMIN_ROLES = [
  { value: "senior_pastor", label: "Pasteur principal" },
  { value: "associate_pastor", label: "Pasteur associé" },
  { value: "administrator", label: "Administrateur" },
  { value: "treasurer", label: "Trésorier" },
  { value: "secretary", label: "Secrétaire" },
  { value: "other", label: "Autre responsable" },
] as const;

export const SERVICE_DAYS = [
  { value: "sunday", label: "Dimanche" },
  { value: "saturday", label: "Samedi" },
  { value: "friday", label: "Vendredi" },
  { value: "other", label: "Autre / variable" },
] as const;

export interface ModuleOption {
  /** Clé locale utilisée par le formulaire d'onboarding. */
  key: string;
  label: string;
  description: string;
  /** Clé(s) `public.feature_flags.key` réellement activées en base pour ce module — un
   * regroupement UI peut correspondre à plusieurs flags (ex. "Suivi pastoral" couvre aussi
   * les sujets de prière). Vide = fonctionnalité cœur, toujours incluse (pas de flag dédié). */
  flags: string[];
  /** Pas de flag dédié : toujours actif, affiché désactivé plutôt que comme un faux bouton. */
  alwaysOn?: boolean;
}

/** Modules proposés à l'activation en configuration — miroir de `public.feature_flags`
 * (db/schema.sql §21), regroupés par usage réel (voir `docs/architecture/05-design-system.md`
 * §Sidebar). */
export const MODULE_OPTIONS: ModuleOption[] = [
  { key: "members", label: "Gestion des membres", description: "Membres, familles, visiteurs", flags: ["members"] },
  { key: "pastoral", label: "Suivi pastoral", description: "Prières, visites, counseling", flags: ["pastoral", "prayer"] },
  { key: "ministries", label: "Ministères", description: "Équipes, ouvriers, plannings", flags: [], alwaysOn: true },
  { key: "events", label: "Événements", description: "Cultes, séminaires, inscriptions", flags: ["events", "attendance"] },
  { key: "finance", label: "Finances", description: "Dons, offrandes, dépenses", flags: ["finance"] },
  { key: "training", label: "Formations", description: "Cours, discipolat, certificats", flags: ["training"] },
  { key: "communication", label: "Communication", description: "Annonces, SMS, emails, WhatsApp", flags: ["communication"] },
  { key: "documents", label: "Ressources", description: "Documents, équipements", flags: ["documents"] },
  { key: "analytics", label: "Analytics & Rapports", description: "Statistiques, tableaux de bord", flags: ["analytics"] },
];

export const DEFAULT_MODULES = ["members", "pastoral", "ministries", "events", "finance", "communication", "analytics"];
