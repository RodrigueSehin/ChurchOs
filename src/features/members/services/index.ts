import "server-only";

/**
 * Façade publique de `features/members` — les autres modules doivent importer d'ici, jamais de
 * `features/members/queries` directement (voir la règle de dépendances dans
 * docs/architecture/01-project-structure.md).
 */
export { getPeopleForSelect } from "@/features/members/queries/people";
