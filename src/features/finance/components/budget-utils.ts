const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];

/** « Jan - Déc 2026 » (même année) ou « Jul 2026 - Mar 2027 » (à cheval sur deux années). */
export function formatBudgetPeriod(startsOn: string, endsOn: string) {
  const [sy, sm] = startsOn.split("-").map(Number) as [number, number];
  const [ey, em] = endsOn.split("-").map(Number) as [number, number];
  if (sy === ey) return `${MONTHS[sm - 1]} - ${MONTHS[em - 1]} ${ey}`;
  return `${MONTHS[sm - 1]} ${sy} - ${MONTHS[em - 1]} ${ey}`;
}

/** Couleur de la barre d'exécution : dépassement en rouge, proche du plafond en ambre. */
export function executionColor(pct: number) {
  if (pct > 100) return "#DC2626";
  if (pct >= 90) return "#F59E0B";
  return "#2563EB";
}
