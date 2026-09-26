import { HardHat } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { StatusFilterForm } from "@/components/shared/status-filter-form";
import { Card } from "@/components/ui/card";
import { getWorkers } from "@/features/workers/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { createWorker } from "@/features/workers/actions";
import { WORKER_STATUS_LABELS } from "@/features/workers/schemas";
import { WorkersTable } from "@/features/workers/components/workers-table";
import { WorkerFormDialog } from "@/features/workers/components/worker-form-dialog";

export default async function WorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const check = await checkPermission("workers.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Ouvriers" description="Les ouvriers disponibles pour les services et le planning." />
        <PermissionDenied requiredPermission="workers.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("workers.create") || check.context.isAdmin;
  const canUpdate = check.context.permissions.has("workers.update") || check.context.isAdmin;

  const [{ rows, total, pageSize }, people] = await Promise.all([
    getWorkers({ organizationId, search: params.q, status: params.status, page }),
    canCreate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
  ]);

  const existingWorkerPersonIds = new Set(rows.map((r) => r.personId));
  const availablePeople = people.filter((p) => !existingWorkerPersonIds.has(p.id));

  const hasFilters = Boolean(params.q || params.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ouvriers"
        description="Les ouvriers disponibles pour les services et le planning."
        actions={canCreate ? <WorkerFormDialog action={createWorker} people={availablePeople} /> : undefined}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBox initialValue={params.q ?? ""} placeholder="Rechercher un ouvrier..." />
        <StatusFilterForm
          initialStatus={params.status ?? ""}
          options={Object.entries(WORKER_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          allLabel="Tous les statuts"
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          hasFilters ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState icon={HardHat} title="Aucun ouvrier" description="Enregistrez le premier ouvrier de votre église." className="border-0" />
          )
        ) : (
          <>
            <WorkersTable rows={rows} people={availablePeople} canUpdate={canUpdate} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.status) sp.set("status", params.status);
                sp.set("page", String(p));
                return `/workers?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
