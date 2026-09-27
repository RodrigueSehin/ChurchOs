import { ClipboardList } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { Card } from "@/components/ui/card";
import { getRegistrations } from "@/features/registrations/queries";
import { getEventsForSelect } from "@/features/events/services";
import { getPeopleForSelect } from "@/features/members/services";
import { RegistrationsTable } from "@/features/registrations/components/registrations-table";
import { RegistrationFormDialog } from "@/features/registrations/components/registration-form-dialog";

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; eventId?: string; page?: string }>;
}) {
  const check = await checkPermission("registrations.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Inscriptions" description="Les inscriptions aux événements de votre église." />
        <PermissionDenied requiredPermission="registrations.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("registrations.create") || check.context.isAdmin;
  const canUpdate = check.context.permissions.has("registrations.update") || check.context.isAdmin;

  const [{ rows, total, pageSize }, events, people] = await Promise.all([
    getRegistrations({ organizationId, eventId: params.eventId, search: params.q, page }),
    getEventsForSelect(organizationId),
    canCreate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
  ]);

  const hasFilters = Boolean(params.q || params.eventId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inscriptions"
        description="Les inscriptions aux événements de votre église."
        actions={
          canCreate ? (
            <RegistrationFormDialog events={events} people={people} defaultEventId={params.eventId} />
          ) : undefined
        }
      />

      <SearchBox initialValue={params.q ?? ""} placeholder="Rechercher un participant..." />

      <Card>
        {rows.length === 0 ? (
          hasFilters ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState icon={ClipboardList} title="Aucune inscription" description="Inscrivez le premier participant à un événement." className="border-0" />
          )
        ) : (
          <>
            <RegistrationsTable rows={rows} canUpdate={canUpdate} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.eventId) sp.set("eventId", params.eventId);
                sp.set("page", String(p));
                return `/registrations?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
