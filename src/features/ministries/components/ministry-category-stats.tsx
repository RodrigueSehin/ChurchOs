import { categoryStyle } from "@/features/ministries/schemas";
import type { getMinistryCategoryStats } from "@/features/ministries/queries";

type CategoryStats = Awaited<ReturnType<typeof getMinistryCategoryStats>>;

export function MinistryCategoryStats({ stats }: { stats: CategoryStats }) {
  if (stats.length === 0) {
    return <p className="py-4 text-center text-sm text-slate-400">Aucune catégorie renseignée pour le moment.</p>;
  }

  const max = Math.max(...stats.map((s) => s.value));

  return (
    <div className="flex flex-col gap-3">
      {stats.map((s) => {
        const style = categoryStyle(s.category);
        return (
          <div key={s.category} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: style.dot }} />
            <span className="w-24 shrink-0 truncate text-slate-600">{s.category}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span className="block h-full rounded-full" style={{ width: `${(s.value / max) * 100}%`, backgroundColor: style.dot }} />
            </span>
            <span className="w-5 shrink-0 text-right font-medium text-navy">{s.value}</span>
          </div>
        );
      })}
    </div>
  );
}
