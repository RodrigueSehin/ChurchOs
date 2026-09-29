import "server-only";

/**
 * Façade publique de `features/billing` — voir la règle de dépendances dans
 * docs/architecture/01-project-structure.md.
 */
export { getPlans } from "@/features/billing/queries";
