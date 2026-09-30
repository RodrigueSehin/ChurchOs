import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { getTodaySessions } from "@/features/attendance/queries";

type Row = Awaited<ReturnType<typeof getTodaySessions>>[number];

const LIVE_LABEL: Record<Row["liveStatus"], { label: string; variant: "success" | "secondary" | "default" }> = {
  live: { label: "En cours", variant: "success" },
  upcoming: { label: "À venir", variant: "default" },
  ended: { label: "Terminée", variant: "secondary" },
};

function formatTimeRange(startsAt: Date, endsAt: Date | null) {
  const fmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const start = fmt.format(startsAt).replace(":", "h");
  if (!endsAt) return start;
  return `${start} - ${fmt.format(endsAt).replace(":", "h")}`;
}

export function TodaySessionsList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Aucune session aujourd&apos;hui.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => {
        const live = LIVE_LABEL[r.liveStatus];
        return (
          <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-navy">{r.title}</p>
              <p className="mt-0.5 text-xs text-slate-400">{formatTimeRange(r.startsAt, r.endsAt)}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Users className="size-3" />
                {r.presentCount}
                {r.capacity ? ` / ${r.capacity}` : ""}
              </p>
            </div>
            <Badge variant={live.variant} className="shrink-0">
              {live.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
