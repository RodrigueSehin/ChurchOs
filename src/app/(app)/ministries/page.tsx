import { Church } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { Card } from "@/components/ui/card";
import { getMinistries } from "@/features/ministries/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { createMinistry } from "@/features/ministries/actions";
import { MinistriesTable } from "@/features/ministries/components/ministries-table";
import { MinistryFormDialog } from "@/features/ministries/components/ministry-form-dialog";

export default async function MinistriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const check = await checkPermission("ministries.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Ministères" description="Les ministères et départements de votre église." />
        <PermissionDenied requiredPermission="ministries.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("ministries.create") || check.context.isAdmin;

  const [{ rows, total, pageSize }, people] = await Promise.all([
    getMinistries({ organizationId, search: params.q, page }),
    canCreate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ministères"
        description="Les ministères et départements de votre église."
        actions={canCreate ? <MinistryFormDialog action={createMinistry} people={people} /> : undefined}
      />

      <SearchBox initialValue={params.q ?? ""} placeholder="Rechercher un ministère..." />

      <Card>
        {rows.length === 0 ? (
          params.q ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState icon={Church} title="Aucun ministère" description="Créez le premier ministère de votre église." className="border-0" />
          )
        ) : (
          <>
            <MinistriesTable rows={rows} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                sp.set("page", String(p));
                return `/ministries?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
