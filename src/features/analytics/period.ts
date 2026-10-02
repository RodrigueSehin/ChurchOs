/** Périodes proposées par le sélecteur de la page Statistiques. */
export const PERIOD_OPTIONS = [
  { value: "12m", label: "12 derniers mois" },
  { value: "6m", label: "6 derniers mois" },
  { value: "ytd", label: "Année en cours" },
] as const;

export type PeriodKey = (typeof PERIOD_OPTIONS)[number]["value"];

export function parsePeriod(value: string | undefined): PeriodKey {
  return PERIOD_OPTIONS.some((o) => o.value === value) ? (value as PeriodKey) : "12m";
}

export interface StatsRange {
  key: PeriodKey;
  /** Mois couverts, du plus ancien au courant (`YYYY-MM`). */
  months: string[];
  /** Bornes `[from, to)` de la période (jours entiers UTC). */
  from: Date;
  to: Date;
  /** Période précédente de même durée : `[prevFrom, from)`. */
  prevFrom: Date;
  /** Fin effective des mesures « écoulées » : maintenant (jamais dans le futur). */
  until: Date;
  /** Nombre de jours écoulés entre `from` et `until` (≥ 1). */
  elapsedDays: number;
}

function monthStart(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1));
}

export function monthKey(d: Date) {
  return d.toISOString().slice(0, 7);
}

export function buildRange(key: PeriodKey, now = new Date()): StatsRange {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const count = key === "12m" ? 12 : key === "6m" ? 6 : month + 1;
  const from = monthStart(year, month - (count - 1));
  const to = monthStart(year, month + 1);
  const prevFrom = monthStart(year, month - (count - 1) - count);
  const months = Array.from({ length: count }, (_, i) => monthKey(monthStart(year, month - (count - 1) + i)));
  const elapsedDays = Math.max(1, Math.ceil((now.getTime() - from.getTime()) / 86_400_000));
  return { key, months, from, to, prevFrom, until: now, elapsedDays };
}

export function formatRangeLabel(range: StatsRange) {
  const fmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  const last = new Date(range.to.getTime() - 1);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return `${cap(fmt.format(range.from))} - ${cap(fmt.format(last))}`;
}
