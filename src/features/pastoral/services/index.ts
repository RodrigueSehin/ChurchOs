import "server-only";

/**
 * Façade publique de `features/pastoral` — voir la règle de dépendances dans
 * docs/architecture/01-project-structure.md. Utilisée par `features/ai` (Phase 15) pour le
 * résumé pastoral de l'assistant.
 */
export { getPastoralStatusSummary } from "@/features/pastoral/queries";
export type { ConfidentialityContext } from "@/lib/rbac/confidentiality";
