import Link from "next/link";
import { Plus, Footprints } from "lucide-react";

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
import { getAssignableUsers, getVisits } from "@/features/visits/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { VISIT_STATUS_LABELS } from "@/features/visits/schemas";
import { VisitsTable } from "@/features/visits/components/visits-table";

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const check = await checkPermission("visits.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Visites" description="Suivi des visites pastorales, à domicile et à l'hôpital." />
        <PermissionDenied requiredPermission="visits.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("visits.create") || check.context.isAdmin;
  const canUpdate = check.context.permissions.has("visits.update") || check.context.isAdmin;

  const [{ rows, total, pageSize }, people, assignableUsers] = await Promise.all([
    getVisits({ organizationId, search: params.q, status: params.status, page }),
    canUpdate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
    canUpdate ? getAssignableUsers(organizationId) : Promise.resolve([]),
  ]);

  const hasFilters = Boolean(params.q || params.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Visites"
        description="Suivi des visites pastorales, à domicile et à l'hôpital."
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/visits/new">
                <Plus className="size-4" />
                Nouvelle visite
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBox initialValue={params.q ?? ""} placeholder="Rechercher une visite..." />
        <StatusFilterForm
          initialStatus={params.status ?? ""}
          options={Object.entries(VISIT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          allLabel="Tous les statuts"
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          hasFilters ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState
              icon={Footprints}
              title="Aucune visite"
              description="Enregistrez la première visite de votre église."
              action={
                canCreate ? (
                  <Button asChild>
                    <Link href="/visits/new">
                      <Plus className="size-4" />
                      Nouvelle visite
                    </Link>
                  </Button>
                ) : undefined
              }
              className="border-0"
            />
          )
        ) : (
          <>
            <VisitsTable rows={rows} people={people} assignableUsers={assignableUsers} canUpdate={canUpdate} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.status) sp.set("status", params.status);
                sp.set("page", String(p));
                return `/visits?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
