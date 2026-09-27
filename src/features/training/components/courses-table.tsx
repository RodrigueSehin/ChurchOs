import Link from "next/link";
import { Clock, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { COURSE_STATUS_LABELS } from "@/features/training/schemas";
import type { getCourses } from "@/features/training/queries";

type CourseRow = Awaited<ReturnType<typeof getCourses>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "secondary"> = {
  draft: "secondary",
  published: "success",
  archived: "secondary",
};

export function CoursesTable({ rows }: { rows: CourseRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Cours</th>
            <th className="px-3 py-2.5 font-medium">Formateur</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="px-3 py-2.5 font-medium">Durée</th>
            <th className="px-3 py-2.5 font-medium">Inscrits</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <Link href={`/training/${row.id}`} className="font-medium text-navy hover:underline">
                  {row.title}
                </Link>
              </td>
              <td className="px-3 py-3 text-slate-500">
                {row.instructorFirstName ? `${row.instructorFirstName} ${row.instructorLastName}` : "—"}
              </td>
              <td className="px-3 py-3">
                <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{COURSE_STATUS_LABELS[row.status] ?? row.status}</Badge>
              </td>
              <td className="px-3 py-3 text-slate-500">
                {row.durationMinutes ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {row.durationMinutes} min
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-3 text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {row.enrollmentCount}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
