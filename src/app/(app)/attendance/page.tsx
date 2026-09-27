import { QrCode } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { getAttendanceSessions } from "@/features/attendance/queries";
import { getEventsForSelect } from "@/features/events/services";
import { getServices } from "@/features/services/services";
import { getPeopleForSelect } from "@/features/members/services";
import { AttendanceSessionFormDialog } from "@/features/attendance/components/attendance-session-form-dialog";
import { AttendanceSessionRow } from "@/features/attendance/components/attendance-session-row";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const check = await checkPermission("attendance.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Présences" description="Sessions de présence, check-in manuel et par QR code." />
        <PermissionDenied requiredPermission="attendance.view" />
      </div>
    );
  }

  const params = await searchParams;
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("attendance.create") || check.context.isAdmin;

  const [sessions, events, services, people] = await Promise.all([
    getAttendanceSessions({ organizationId, eventId: params.eventId }),
    getEventsForSelect(organizationId),
    getServices(organizationId),
    getPeopleForSelect(organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Présences"
        description="Sessions de présence, check-in manuel et par QR code."
        actions={
          canCreate ? (
            <AttendanceSessionFormDialog
              events={events}
              services={services.map((s) => ({ id: s.id, title: s.title }))}
              defaultEventId={params.eventId}
            />
          ) : undefined
        }
      />

      {sessions.length === 0 ? (
        <EmptyState icon={QrCode} title="Aucune session" description="Créez la première session de présence." />
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <AttendanceSessionRow key={session.id} organizationId={organizationId} session={session} people={people} canManage={canCreate} />
          ))}
        </div>
      )}
    </div>
  );
}
