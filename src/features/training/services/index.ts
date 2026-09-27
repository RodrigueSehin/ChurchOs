import "server-only";

/**
 * Façade publique de `features/training` — les autres modules doivent importer d'ici, jamais de
 * `features/training/queries` directement (voir la règle de dépendances dans
 * docs/architecture/01-project-structure.md). Utilisée par la fiche membre pour afficher le
 * suivi de progression (critère de sortie explicite de cette phase).
 */
export { getTrainingSummaryForPerson } from "@/features/training/queries";
