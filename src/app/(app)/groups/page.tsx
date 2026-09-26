import { UsersRound } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { StatusFilterForm } from "@/components/shared/status-filter-form";
import { Card } from "@/components/ui/card";
import { getGroups } from "@/features/groups/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { createGroup } from "@/features/groups/actions";
import { GROUP_TYPE_LABELS } from "@/features/groups/schemas";
import { GroupsTable } from "@/features/groups/components/groups-table";
import { GroupFormDialog } from "@/features/groups/components/group-form-dialog";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
  const check = await checkPermission("members.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Groupes" description="Cellules, équipes et groupes de l'église." />
        <PermissionDenied requiredPermission="members.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("members.create") || check.context.isAdmin;

  const [{ rows, total, pageSize }, people] = await Promise.all([
    getGroups({ organizationId, search: params.q, type: params.type, page }),
    canCreate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Groupes"
        description="Cellules, équipes et groupes de l'église."
        actions={canCreate ? <GroupFormDialog action={createGroup} people={people} /> : undefined}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBox initialValue={params.q ?? ""} placeholder="Rechercher un groupe..." />
        <StatusFilterForm
          initialStatus={params.type ?? ""}
          paramName="type"
          options={Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          allLabel="Tous les types"
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          params.q || params.type ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState icon={UsersRound} title="Aucun groupe" description="Créez le premier groupe de votre église." className="border-0" />
          )
        ) : (
          <>
            <GroupsTable rows={rows} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.type) sp.set("type", params.type);
                sp.set("page", String(p));
                return `/groups?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
