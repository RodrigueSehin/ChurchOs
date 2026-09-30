/** Utilitaires partagés du module finance (requêtes de liste, KPI, rapports). */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Vrai pour une date ISO `YYYY-MM-DD` qui existe réellement (refuse `2026-02-31`, `2026-13-45`) :
 * un simple test de format laisserait Postgres lever « date/time field value out of range ». */
export function isValidIsoDate(value: string | undefined | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Variation en % entre deux valeurs (100 si on part de zéro vers une valeur positive). */
export function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
