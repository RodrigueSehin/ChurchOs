export function parseMonthParam(month?: string): { year: number; month: number } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    return { year: y!, month: m! - 1 };
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
}

export function monthParamFor(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

/** Grille complète (semaines entières, lundi en premier) couvrant le mois demandé — inclut donc
 * quelques jours du mois précédent/suivant pour remplir la première/dernière semaine, comme sur
 * la maquette (ex. "31" et "1, 2, 3, 4" en fin de grille de septembre). */
export function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  const startOffset = (first.getUTCDay() + 6) % 7;
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - startOffset);
  const endOffset = 6 - ((last.getUTCDay() + 6) % 7);
  const end = new Date(last);
  end.setUTCDate(last.getUTCDate() + endOffset);

  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
