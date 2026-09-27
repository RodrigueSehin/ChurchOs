import Link from "next/link";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EVENT_STATUS_LABELS } from "@/features/events/schemas";
import type { getEvents } from "@/features/events/queries";

type Row = Awaited<ReturnType<typeof getEvents>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger" | "default"> = {
  draft: "secondary",
  published: "success",
  cancelled: "danger",
  completed: "default",
  archived: "secondary",
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function EventsTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Événement</th>
            <th className="px-3 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="px-3 py-2.5 font-medium">Inscriptions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <Link href={`/events/${row.id}`} className="font-medium text-navy hover:underline">
                  {row.title}
                </Link>
                {row.categoryName && (
                  <div className="mt-0.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {row.categoryName}
                    </Badge>
                  </div>
                )}
              </td>
              <td className="px-3 py-3 text-slate-500">{formatDateTime(row.startsAt)}</td>
              <td className="px-3 py-3">
                <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{EVENT_STATUS_LABELS[row.status] ?? row.status}</Badge>
              </td>
              <td className="px-3 py-3 text-slate-500">
                {row.registrationEnabled ? (
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" />
                    {row.registrationCount}
                  </span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
