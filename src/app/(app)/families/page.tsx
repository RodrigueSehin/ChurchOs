import { Users } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { Card } from "@/components/ui/card";
import { getFamilies } from "@/features/families/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { createFamily } from "@/features/families/actions";
import { FamiliesTable } from "@/features/families/components/families-table";
import { FamilyFormDialog } from "@/features/families/components/family-form-dialog";

export default async function FamiliesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const check = await checkPermission("members.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Familles" description="Foyers et cellules familiales de l'église." />
        <PermissionDenied requiredPermission="members.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const [{ rows, total, pageSize }, people] = await Promise.all([
    getFamilies({ organizationId, search: params.q, page }),
    check.context.permissions.has("members.create") || check.context.isAdmin
      ? getPeopleForSelect(organizationId)
      : Promise.resolve([]),
  ]);

  const canCreate = check.context.permissions.has("members.create") || check.context.isAdmin;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Familles"
        description="Foyers et cellules familiales de l'église."
        actions={canCreate ? <FamilyFormDialog action={createFamily} people={people} /> : undefined}
      />

      <SearchBox initialValue={params.q ?? ""} placeholder="Rechercher une famille..." />

      <Card>
        {rows.length === 0 ? (
          params.q ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState icon={Users} title="Aucune famille" description="Créez la première famille de votre église." className="border-0" />
          )
        ) : (
          <>
            <FamiliesTable rows={rows} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                sp.set("page", String(p));
                return `/families?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
