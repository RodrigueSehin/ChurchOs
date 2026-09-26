import { SearchX } from "lucide-react";

import { cn } from "@/lib/utils";

interface NoResultsStateProps {
  title?: string;
  description?: string;
  className?: string;
}

/** Distinct de `EmptyState` : la liste n'est pas vide, une recherche/un filtre ne retourne
 * juste rien — voir docs/architecture/05-design-system.md. */
export function NoResultsState({
  title = "Aucun résultat",
  description = "Aucun élément ne correspond à votre recherche ou vos filtres.",
  className,
}: NoResultsStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <SearchX className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-navy">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}
