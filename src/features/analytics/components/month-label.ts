/** `2026-09` → « Sept » (mois abrégé français, sans point, première lettre en majuscule). */
export function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number) as [number, number];
  const s = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
