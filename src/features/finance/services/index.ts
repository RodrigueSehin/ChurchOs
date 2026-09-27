import "server-only";

/**
 * Façade publique de `features/finance` — les autres modules doivent importer d'ici, jamais de
 * `features/finance/queries` directement (voir la règle de dépendances dans
 * docs/architecture/01-project-structure.md). Utilisée par `features/reports` pour le rapport
 * financier — l'appelant doit vérifier `finance.view` avant d'appeler cette fonction (jamais
 * seulement `reports.view`, voir la leçon de la Phase 9).
 */
export { getFinanceReport } from "@/features/finance/queries";
