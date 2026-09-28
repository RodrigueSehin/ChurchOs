import "server-only";

/**
 * Façade publique de `features/analytics` — voir la règle de dépendances dans
 * docs/architecture/01-project-structure.md. Utilisée par `features/ai` (Phase 15) pour les
 * outils de l'assistant (statistiques membres/présence/finances).
 */
export {
  getActiveMembersCount,
  getAverageRecentAttendance,
  getFinanceMonthlyTrend,
  getGivingThisMonth,
  getNewMembersLast30Days,
} from "@/features/analytics/queries";
