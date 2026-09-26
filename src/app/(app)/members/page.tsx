import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMembers } from "@/features/members/queries";
import { MembersTable } from "@/features/members/components/members-table";
import { MembersFilters } from "@/features/members/components/members-filters";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const check = await checkPermission("members.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Membres" description="Annuaire des membres de l'église." />
        <PermissionDenied requiredPermission="members.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { rows, total, pageSize } = await getMembers({
    organizationId: check.organization.organization.id,
    search: params.q,
    status: params.status,
    page,
  });

  const hasFilters = Boolean(params.q || params.status);
  const canCreate = check.context.permissions.has("members.create") || check.context.isAdmin;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Membres"
        description="Annuaire des membres de l'église."
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/members/new">
                <Plus className="size-4" />
                Nouveau membre
              </Link>
            </Button>
          ) : undefined
        }
      />

      <MembersFilters initialSearch={params.q ?? ""} initialStatus={params.status ?? ""} />

      <Card>
        {rows.length === 0 ? (
          hasFilters ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState
              icon={Users}
              title="Aucun membre"
              description="Commencez par ajouter le premier membre de votre église."
              action={
                canCreate ? (
                  <Button asChild>
                    <Link href="/members/new">
                      <Plus className="size-4" />
                      Nouveau membre
                    </Link>
                  </Button>
                ) : undefined
              }
              className="border-0"
            />
          )
        ) : (
          <>
            <MembersTable rows={rows} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.status) sp.set("status", params.status);
                sp.set("page", String(p));
                return `/members?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
