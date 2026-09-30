import Link from "next/link";

import { pastelStyleFor } from "@/lib/color-hash";
import type { getRegistrationsByEvent } from "@/features/registrations/queries";

type Row = Awaited<ReturnType<typeof getRegistrationsByEvent>>[number];

export function RegistrationsByEventBars({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Aucune inscription pour le moment.</p>;
  }

  const max = Math.max(...rows.map((r) => r.value));

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const style = pastelStyleFor(r.eventTitle);
        return (
          <Link key={r.eventId} href={`/registrations?eventId=${r.eventId}`} className="group flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-slate-600 group-hover:text-navy">{r.eventTitle}</span>
              <span className="shrink-0 font-medium text-navy">{r.value}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, backgroundColor: style.dot }} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
