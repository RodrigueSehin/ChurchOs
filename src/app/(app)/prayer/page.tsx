import Link from "next/link";
import { Plus, HandHeart } from "lucide-react";

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
import { getPrayerRequests } from "@/features/prayer/queries";
import { PRAYER_STATUS_LABELS } from "@/features/prayer/schemas";
import { PrayerTable } from "@/features/prayer/components/prayer-table";

export default async function PrayerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const check = await checkPermission("prayer.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Sujets de prière" description="Suivi des sujets de prière de l'église." />
        <PermissionDenied requiredPermission="prayer.view" />
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

  const { rows, total, pageSize } = await getPrayerRequests({
    organizationId,
    ctx,
    search: params.q,
    status: params.status,
    page,
  });

  const hasFilters = Boolean(params.q || params.status);
  const canCreate = check.context.permissions.has("prayer.create") || check.context.isAdmin;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sujets de prière"
        description="Suivi des sujets de prière de l'église."
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/prayer/new">
                <Plus className="size-4" />
                Nouveau sujet
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBox initialValue={params.q ?? ""} placeholder="Rechercher un sujet..." />
        <StatusFilterForm
          initialStatus={params.status ?? ""}
          options={Object.entries(PRAYER_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          allLabel="Tous les statuts"
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          hasFilters ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState
              icon={HandHeart}
              title="Aucun sujet de prière"
              description="Créez le premier sujet de prière de votre église."
              action={
                canCreate ? (
                  <Button asChild>
                    <Link href="/prayer/new">
                      <Plus className="size-4" />
                      Nouveau sujet
                    </Link>
                  </Button>
                ) : undefined
              }
              className="border-0"
            />
          )
        ) : (
          <>
            <PrayerTable rows={rows} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.status) sp.set("status", params.status);
                sp.set("page", String(p));
                return `/prayer?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
