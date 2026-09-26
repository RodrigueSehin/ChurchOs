import "server-only";

/**
 * Façade publique de `features/rbac` — c'est le seul point d'entrée que les autres modules
 * doivent utiliser pour lire des données rbac (jamais `features/rbac/queries` directement),
 * voir la règle de dépendances dans docs/architecture/01-project-structure.md.
 */
export { getAssignableMembers, getOrganizationMembers } from "@/features/rbac/queries";
export type { OrganizationMember } from "@/features/rbac/queries";
