import "server-only";

/**
 * Façade publique de `features/attendance` — les autres modules doivent importer d'ici, jamais
 * de `features/attendance/queries` directement (voir la règle de dépendances dans
 * docs/architecture/01-project-structure.md). Utilisée par `features/reports` pour le rapport de
 * présence.
 */
export { getAttendanceSessions } from "@/features/attendance/queries";
