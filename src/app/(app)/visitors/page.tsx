import { UserPlus } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { Card } from "@/components/ui/card";
import { getVisitors } from "@/features/visitors/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { createVisitor } from "@/features/visitors/actions";
import { VISITOR_STATUS_LABELS } from "@/features/visitors/schemas";
import { VisitorsTable } from "@/features/visitors/components/visitors-table";
import { VisitorFormDialog } from "@/features/visitors/components/visitor-form-dialog";
import { StatusFilterForm } from "@/components/shared/status-filter-form";

export default async function VisitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const check = await checkPermission("members.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Visiteurs" description="Suivi des visiteurs et de leur intégration." />
        <PermissionDenied requiredPermission="members.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("members.create") || check.context.isAdmin;

  const [{ rows, total, pageSize }, inviters] = await Promise.all([
    getVisitors({ organizationId, search: params.q, status: params.status, page }),
    canCreate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Visiteurs"
        description="Suivi des visiteurs et de leur intégration."
        actions={canCreate ? <VisitorFormDialog action={createVisitor} inviters={inviters} /> : undefined}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBox initialValue={params.q ?? ""} placeholder="Rechercher un visiteur..." />
        <StatusFilterForm
          initialStatus={params.status ?? ""}
          options={Object.entries(VISITOR_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          allLabel="Tous les statuts"
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          params.q || params.status ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState icon={UserPlus} title="Aucun visiteur" description="Enregistrez le premier visiteur de votre église." className="border-0" />
          )
        ) : (
          <>
            <VisitorsTable rows={rows} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.status) sp.set("status", params.status);
                sp.set("page", String(p));
                return `/visitors?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
