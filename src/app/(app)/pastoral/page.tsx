import Link from "next/link";
import { Plus, HeartHandshake } from "lucide-react";

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
import { getPastoralFollowups } from "@/features/pastoral/queries";
import { PASTORAL_STATUS_LABELS } from "@/features/pastoral/schemas";
import { PastoralTable } from "@/features/pastoral/components/pastoral-table";

export default async function PastoralPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const check = await checkPermission("pastoral.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Suivi pastoral" description="Suivis pastoraux : priorités, responsables, échéances et statut." />
        <PermissionDenied requiredPermission="pastoral.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const ctx = {
    userId: check.user.id,
    isAdmin: check.context.isAdmin,
    canViewConfidential: check.context.permissions.has("pastoral.view_confidential"),
  };

  const { rows, total, pageSize } = await getPastoralFollowups({
    organizationId,
    ctx,
    search: params.q,
    status: params.status,
    page,
  });

  const hasFilters = Boolean(params.q || params.status);
  const canCreate = check.context.permissions.has("pastoral.create") || check.context.isAdmin;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Suivi pastoral"
        description="Suivis pastoraux : priorités, responsables, échéances et statut."
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/pastoral/new">
                <Plus className="size-4" />
                Nouveau suivi
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBox initialValue={params.q ?? ""} placeholder="Rechercher un suivi..." />
        <StatusFilterForm
          initialStatus={params.status ?? ""}
          options={Object.entries(PASTORAL_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          allLabel="Tous les statuts"
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          hasFilters ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState
              icon={HeartHandshake}
              title="Aucun suivi pastoral"
              description="Créez le premier suivi pastoral de votre église."
              action={
                canCreate ? (
                  <Button asChild>
                    <Link href="/pastoral/new">
                      <Plus className="size-4" />
                      Nouveau suivi
                    </Link>
                  </Button>
                ) : undefined
              }
              className="border-0"
            />
          )
        ) : (
          <>
            <PastoralTable rows={rows} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.status) sp.set("status", params.status);
                sp.set("page", String(p));
                return `/pastoral?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
