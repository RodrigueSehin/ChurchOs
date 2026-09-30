import { QrCode } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ATTENDANCE_SOURCE_LABELS, ATTENDANCE_STATUS_LABELS, attendanceSourceOf } from "@/features/attendance/schemas";
import { AttendanceRecordRowActions } from "@/features/attendance/components/attendance-record-row-actions";
import type { getAttendanceRecordsList } from "@/features/attendance/queries";

type Row = Awaited<ReturnType<typeof getAttendanceRecordsList>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  present: "success",
  absent: "danger",
  excused: "secondary",
  late: "warning",
};

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function AttendanceTable({ rows, canUpdate, canDelete }: { rows: Row[]; canUpdate: boolean; canDelete: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Nom et prénoms</th>
            <th className="px-3 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 font-medium">Événement</th>
            <th className="px-3 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Heure</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const name = `${row.firstName} ${row.lastName}`;
            const source = attendanceSourceOf(row);
            return (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5 font-medium text-navy">
                    <Avatar className="size-7">
                      {row.photoUrl && <AvatarImage src={row.photoUrl} alt="" />}
                      <AvatarFallback className="text-[10px]">{initialsOf(row.firstName, row.lastName)}</AvatarFallback>
                    </Avatar>
                    {name}
                    {row.method === "qr" && <QrCode className="size-3.5 text-slate-400" />}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Badge variant="secondary">{ATTENDANCE_SOURCE_LABELS[source]}</Badge>
                </td>
                <td className="px-3 py-3 text-slate-500">{row.sessionTitle}</td>
                <td className="px-3 py-3 text-slate-500">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(row.sessionStartsAt)}</td>
                <td className="px-3 py-3 text-slate-500">{new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(row.sessionStartsAt)}</td>
                <td className="px-3 py-3">
                  <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{ATTENDANCE_STATUS_LABELS[row.status] ?? row.status}</Badge>
                </td>
                <td className="px-3 py-3">
                  <AttendanceRecordRowActions recordId={row.id} name={name} status={row.status} canUpdate={canUpdate} canDelete={canDelete} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
