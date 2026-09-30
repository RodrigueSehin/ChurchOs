/** Montant lisible : « 200 000 FCFA » pour XOF/XAF (comme sur les maquettes), sinon devise ISO. */
export function formatMoney(amount: number | string, currency = "XOF") {
  const value = Number(amount);
  const grouped = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
  if (currency === "XOF" || currency === "XAF") return `${grouped} FCFA`;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

/** Montant compact pour le centre d'un graphique : « 24,5 M ». */
export function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (value >= 1_000) return `${(value / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k`;
  return String(Math.round(value));
}

export const DONUT_COLORS = ["#16A34A", "#F59E0B", "#9333EA", "#2563EB", "#94A3B8"];
