import { CalendarRange } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { getCalendarItems } from "@/features/calendar/queries";
import { CalendarAgenda } from "@/features/calendar/components/calendar-agenda";
import { CalendarItemFormDialog } from "@/features/calendar/components/calendar-item-form-dialog";

export default async function CalendarPage() {
  const check = await checkPermission("calendar.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Calendrier" description="Vue agrégée des événements, services et créneaux de planning." />
        <PermissionDenied requiredPermission="calendar.view" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  const canManage = check.context.isAdmin || check.context.permissions.has("calendar.manage");

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 60);

  const entries = await getCalendarItems({ organizationId, from, to });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendrier"
        description="Vue agrégée des événements, services et créneaux de planning des 60 prochains jours."
        actions={canManage ? <CalendarItemFormDialog /> : undefined}
      />

      {entries.length === 0 ? (
        <EmptyState icon={CalendarRange} title="Aucun événement à venir" description="Rien de prévu dans les 60 prochains jours." />
      ) : (
        <CalendarAgenda entries={entries} canManage={canManage} />
      )}
    </div>
  );
}
