import { pastelStyleFor } from "@/lib/color-hash";
import type { getWorkerAffiliationStats } from "@/features/workers/queries";

type AffiliationStats = Awaited<ReturnType<typeof getWorkerAffiliationStats>>;

export function WorkerAffiliationStats({ stats }: { stats: AffiliationStats }) {
  if (stats.length === 0) {
    return <p className="py-4 text-center text-sm text-slate-400">Aucun ouvrier affecté à une équipe ou un ministère pour le moment.</p>;
  }

  const max = Math.max(...stats.map((s) => s.value));

  return (
    <div className="flex flex-col gap-3">
      {stats.map((s) => {
        const style = pastelStyleFor(s.name);
        return (
          <div key={s.name} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: style.dot }} />
            <span className="w-28 shrink-0 truncate text-slate-600">{s.name}</span>
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
