import { getAttendanceRecords } from "@/features/attendance/queries";
import type { getAttendanceSessions } from "@/features/attendance/queries";
import { AttendanceRecordsDialog } from "@/features/attendance/components/attendance-records-dialog";

type Session = Awaited<ReturnType<typeof getAttendanceSessions>>[number];

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" }).format(new Date(value));
}

export async function AttendanceSessionRow({
  organizationId,
  session,
  people,
  canManage,
}: {
  organizationId: string;
  session: Session;
  people: { id: string; name: string }[];
  canManage: boolean;
}) {
  const records = await getAttendanceRecords(organizationId, session.id);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-navy">{session.title}</p>
        <p className="text-sm text-slate-400">
          {formatDateTime(session.startsAt)}
          {session.eventTitle ? ` · ${session.eventTitle}` : ""}
          {session.serviceTitle ? ` · ${session.serviceTitle}` : ""}
        </p>
      </div>
      <AttendanceRecordsDialog sessionId={session.id} sessionTitle={session.title} records={records} people={people} canManage={canManage} />
    </div>
  );
}
