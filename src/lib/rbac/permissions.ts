/**
 * Catalogue de permissions et rôles système, miroir exact de ce qui est réellement
 * seedé par db/schema.sql §21 (SEED RBAC) et par le trigger `bootstrap_organization()`
 * (§4B) sur le projet Supabase live. `role_permissions` (association rôle → permission)
 * n'est PAS encore seedée côté base — c'est fait par db/seed/index.ts (Phase 3+),
 * en utilisant ROLE_PERMISSIONS ci-dessous comme unique source de vérité côté code.
 */

export const SYSTEM_ROLES = [
  "SUPER_ADMIN",
  "CHURCH_OWNER",
  "PASTOR",
  "PASTORAL_LEADER",
  "MINISTRY_LEADER",
  "FINANCE_MANAGER",
  "SECRETARY",
  "WORKER",
  "MEMBER",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export interface PermissionDef {
  code: string;
  name: string;
  module: string;
  description: string;
}

/** Exactement les lignes de db/schema.sql §21 (insert into public.permissions ...). */
export const PERMISSIONS: PermissionDef[] = [
  { code: "members.view", name: "Voir les membres", module: "members", description: "Consulter les membres" },
  { code: "members.create", name: "Créer des membres", module: "members", description: "Créer un membre" },
  { code: "members.update", name: "Modifier les membres", module: "members", description: "Modifier un membre" },
  { code: "members.delete", name: "Supprimer les membres", module: "members", description: "Supprimer un membre" },
  { code: "pastoral.view", name: "Voir le pastoral", module: "pastoral", description: "Consulter le suivi pastoral" },
  { code: "pastoral.create", name: "Créer un suivi pastoral", module: "pastoral", description: "Créer un suivi" },
  { code: "pastoral.update", name: "Modifier le pastoral", module: "pastoral", description: "Modifier un suivi" },
  { code: "pastoral.delete", name: "Supprimer le pastoral", module: "pastoral", description: "Supprimer un suivi" },
  { code: "pastoral.view_confidential", name: "Voir le pastoral confidentiel", module: "pastoral", description: "Voir les suivis pastoraux et sujets de prière marqués confidentiels" },
  { code: "prayer.view", name: "Voir les prières", module: "prayer", description: "Consulter les sujets de prière" },
  { code: "prayer.create", name: "Créer une prière", module: "prayer", description: "Créer un sujet" },
  { code: "prayer.update", name: "Modifier les prières", module: "prayer", description: "Modifier un sujet" },
  { code: "visits.view", name: "Voir les visites", module: "visits", description: "Consulter les visites pastorales" },
  { code: "visits.create", name: "Créer des visites", module: "visits", description: "Planifier ou enregistrer une visite" },
  { code: "visits.update", name: "Modifier les visites", module: "visits", description: "Modifier une visite" },
  { code: "pastoral_council.view", name: "Voir le conseil pastoral", module: "pastoral_council", description: "Consulter les réunions du conseil pastoral" },
  { code: "pastoral_council.manage", name: "Gérer le conseil pastoral", module: "pastoral_council", description: "Créer/modifier les réunions, membres et actions du conseil pastoral" },
  { code: "ministries.view", name: "Voir les ministères", module: "ministries", description: "Consulter les ministères" },
  { code: "ministries.create", name: "Créer des ministères", module: "ministries", description: "Créer un ministère" },
  { code: "ministries.update", name: "Modifier les ministères", module: "ministries", description: "Modifier un ministère" },
  { code: "teams.view", name: "Voir les équipes", module: "teams", description: "Consulter les équipes" },
  { code: "teams.create", name: "Créer des équipes", module: "teams", description: "Créer une équipe" },
  { code: "teams.update", name: "Modifier les équipes", module: "teams", description: "Modifier une équipe" },
  { code: "workers.view", name: "Voir les ouvriers", module: "workers", description: "Consulter les ouvriers" },
  { code: "workers.create", name: "Créer des ouvriers", module: "workers", description: "Enregistrer un ouvrier" },
  { code: "workers.update", name: "Modifier les ouvriers", module: "workers", description: "Modifier un ouvrier" },
  { code: "services.view", name: "Voir les services", module: "services", description: "Consulter les services (cultes)" },
  { code: "services.create", name: "Créer des services", module: "services", description: "Créer un service et ses affectations" },
  { code: "services.update", name: "Modifier les services", module: "services", description: "Modifier un service ou ses affectations" },
  { code: "planning.view", name: "Voir les plannings", module: "planning", description: "Consulter les créneaux de planning" },
  { code: "planning.create", name: "Créer des créneaux de planning", module: "planning", description: "Créer un créneau de planning" },
  { code: "planning.update", name: "Modifier les plannings", module: "planning", description: "Modifier un créneau de planning" },
  { code: "events.view", name: "Voir les événements", module: "events", description: "Consulter les événements" },
  { code: "events.create", name: "Créer des événements", module: "events", description: "Créer un événement" },
  { code: "events.update", name: "Modifier les événements", module: "events", description: "Modifier un événement" },
  { code: "events.delete", name: "Supprimer les événements", module: "events", description: "Supprimer un événement" },
  { code: "attendance.view", name: "Voir les présences", module: "attendance", description: "Consulter les présences" },
  { code: "attendance.create", name: "Saisir les présences", module: "attendance", description: "Enregistrer une présence" },
  { code: "registrations.view", name: "Voir les inscriptions", module: "registrations", description: "Consulter les inscriptions aux événements" },
  { code: "registrations.create", name: "Créer des inscriptions", module: "registrations", description: "Inscrire une personne ou un invité à un événement" },
  { code: "registrations.update", name: "Modifier les inscriptions", module: "registrations", description: "Modifier le statut d'une inscription" },
  { code: "calendar.view", name: "Voir le calendrier", module: "calendar", description: "Consulter le calendrier agrégé" },
  { code: "calendar.manage", name: "Gérer le calendrier", module: "calendar", description: "Créer/modifier des entrées de calendrier manuelles" },
  { code: "finance.view", name: "Voir les finances", module: "finance", description: "Consulter les finances" },
  { code: "finance.create", name: "Créer une opération financière", module: "finance", description: "Créer une opération" },
  { code: "finance.approve", name: "Approuver une opération", module: "finance", description: "Approuver une opération" },
  { code: "reports.view", name: "Voir les rapports", module: "reports", description: "Consulter les rapports" },
  { code: "reports.export", name: "Exporter les rapports", module: "reports", description: "Exporter les rapports" },
  { code: "settings.manage", name: "Gérer les paramètres", module: "settings", description: "Administrer ChurchOS" },
];

export type PermissionCode = (typeof PERMISSIONS)[number]["code"];

const ALL = PERMISSIONS.map((p) => p.code);

function only(...codes: string[]): string[] {
  return codes;
}

/**
 * Pas encore seedée en base (voir note d'en-tête) — c'est la proposition ChurchOS,
 * appliquée par db/seed/index.ts. `is_org_admin()` (SUPER_ADMIN/CHURCH_OWNER) contourne
 * de toute façon `role_permissions` dans les policies RLS génériques (voir db/schema.sql
 * §20), donc ces deux rôles n'ont pas besoin d'y figurer pour avoir accès complet.
 */
export const ROLE_PERMISSIONS: Record<SystemRole, string[]> = {
  SUPER_ADMIN: ALL,
  CHURCH_OWNER: ALL,

  PASTOR: ALL.filter((c) => c !== "settings.manage"),

  PASTORAL_LEADER: only(
    "members.view",
    "pastoral.view",
    "pastoral.create",
    "pastoral.update",
    "pastoral.view_confidential",
    "prayer.view",
    "prayer.create",
    "prayer.update",
    "visits.view",
    "visits.create",
    "visits.update",
    "pastoral_council.view",
    "pastoral_council.manage",
    "events.view",
    "attendance.view",
    "reports.view",
  ),

  MINISTRY_LEADER: only(
    "members.view",
    "ministries.view",
    "ministries.create",
    "ministries.update",
    "teams.view",
    "teams.create",
    "teams.update",
    "workers.view",
    "workers.create",
    "workers.update",
    "services.view",
    "services.create",
    "services.update",
    "planning.view",
    "planning.create",
    "planning.update",
    "events.view",
    "events.create",
    "events.update",
    "attendance.view",
    "attendance.create",
    "registrations.view",
    "registrations.create",
    "registrations.update",
    "calendar.view",
    "calendar.manage",
    "reports.view",
  ),

  FINANCE_MANAGER: only(
    "members.view",
    "finance.view",
    "finance.create",
    "finance.approve",
    "reports.view",
    "reports.export",
  ),

  SECRETARY: only(
    "members.view",
    "members.create",
    "members.update",
    "events.view",
    "events.create",
    "events.update",
    "attendance.view",
    "attendance.create",
    "registrations.view",
    "registrations.create",
    "registrations.update",
    "calendar.view",
    "reports.view",
  ),

  WORKER: only(
    "members.view",
    "services.view",
    "planning.view",
    "events.view",
    "attendance.view",
    "attendance.create",
    "registrations.view",
    "calendar.view",
  ),

  MEMBER: only("events.view", "registrations.create", "calendar.view"),
};
