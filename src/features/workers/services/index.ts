import "server-only";

/**
 * Façade publique de `features/workers` — voir la règle de dépendances dans
 * docs/architecture/01-project-structure.md.
 */
export { getActiveWorkersForSelect } from "@/features/workers/queries";
