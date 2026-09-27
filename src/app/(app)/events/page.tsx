import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { StatusFilterForm } from "@/components/shared/status-filter-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getEventCategories, getEvents } from "@/features/events/queries";
import { EVENT_STATUS_LABELS } from "@/features/events/schemas";
import { EventsTable } from "@/features/events/components/events-table";
import { EventCategoryManager } from "@/features/events/components/event-category-manager";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const check = await checkPermission("events.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Événements" description="Les événements de votre église." />
        <PermissionDenied requiredPermission="events.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("events.create") || check.context.isAdmin;

  const [{ rows, total, pageSize }, categories] = await Promise.all([
    getEvents({ organizationId, search: params.q, status: params.status, page }),
    getEventCategories(organizationId),
  ]);

  const hasFilters = Boolean(params.q || params.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Événements"
        description="Les événements de votre église."
        actions={
          canCreate ? (
            <div className="flex items-center gap-2">
              <EventCategoryManager categories={categories} />
              <Button asChild>
                <Link href="/events/new">
                  <Plus className="size-4" />
                  Nouvel événement
                </Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBox initialValue={params.q ?? ""} placeholder="Rechercher un événement..." />
        <StatusFilterForm
          initialStatus={params.status ?? ""}
          options={Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          allLabel="Tous les statuts"
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          hasFilters ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="Aucun événement"
              description="Créez le premier événement de votre église."
              action={
                canCreate ? (
                  <Button asChild>
                    <Link href="/events/new">
                      <Plus className="size-4" />
                      Nouvel événement
                    </Link>
                  </Button>
                ) : undefined
              }
              className="border-0"
            />
          )
        ) : (
          <>
            <EventsTable rows={rows} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.status) sp.set("status", params.status);
                sp.set("page", String(p));
                return `/events?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
