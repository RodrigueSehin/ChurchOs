/** Indicateur de langue courante. Une seule langue (français) est disponible pour l'instant —
 * volontairement un badge statique plutôt qu'un sélecteur qui n'aurait aucun effet réel. */
export function LanguageBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm">
      <span aria-hidden>🇫🇷</span>
      Français
    </span>
  );
}
