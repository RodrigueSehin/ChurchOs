const PASTEL_STYLES = [
  { badge: "bg-purple-100 text-purple-700", dot: "#9333EA" },
  { badge: "bg-blue-100 text-blue-700", dot: "#2563EB" },
  { badge: "bg-amber-100 text-amber-700", dot: "#D97706" },
  { badge: "bg-red-100 text-red-700", dot: "#DC2626" },
  { badge: "bg-green-100 text-green-700", dot: "#16A34A" },
  { badge: "bg-pink-100 text-pink-700", dot: "#DB2777" },
  { badge: "bg-indigo-100 text-indigo-700", dot: "#4F46E5" },
  { badge: "bg-rose-100 text-rose-700", dot: "#E11D48" },
  { badge: "bg-cyan-100 text-cyan-700", dot: "#0891B2" },
] as const;

/** Couleur déterministe (hash du libellé) pour styliser une valeur texte libre sans taxonomie
 * fixe — purement cosmétique, ne fabrique aucune donnée. Partagé entre les modules qui affichent
 * une catégorie/affectation en texte libre (ministères, ouvriers...). */
export function pastelStyleFor(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return PASTEL_STYLES[hash % PASTEL_STYLES.length]!;
}
