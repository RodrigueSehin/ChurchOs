import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, HandHeart, Plus } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPrayerCategories, getPrayerKpis, getPrayerRequests, getPrayerTabCounts } from "@/features/prayer/queries";
import { PrayerTable } from "@/features/prayer/components/prayer-table";
import { PrayerFilters } from "@/features/prayer/components/prayer-filters";
import { PrayerTabs } from "@/features/prayer/components/prayer-tabs";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function PrayerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; view?: string; page?: string }>;
}) {
  const check = await checkPermission("prayer.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Sujets de prières"
          description="Centralisez, suivez et priez ensemble pour les sujets qui comptent."
          quote="Persévérez dans la prière, veillez-y avec actions de grâces."
          verseRef="Colossiens 4:2"
        />
        <PermissionDenied requiredPermission="prayer.view" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  const ctx = {
    userId: check.user.id,
    isAdmin: check.context.isAdmin,
    canViewConfidential: check.context.permissions.has("pastoral.view_confidential"),
  };
  const canCreate = check.context.permissions.has("prayer.create") || check.context.isAdmin;
  const canDelete = check.context.permissions.has("prayer.update") || check.context.isAdmin;

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [kpis, tabCounts, categories] = await Promise.all([
    getPrayerKpis(organizationId, ctx),
    getPrayerTabCounts(organizationId, ctx),
    getPrayerCategories(organizationId),
  ]);

  const { rows, total, pageSize } = await getPrayerRequests({
    organizationId,
    ctx,
    search: params.q,
    status: params.status,
    category: params.category,
    view: params.view,
    page,
  });

  const hasFilters = Boolean(params.q || params.status || params.category || params.view);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Sujets de prières"
        description="Centralisez, suivez et priez ensemble pour les sujets qui comptent."
        quote="Persévérez dans la prière, veillez-y avec actions de grâces."
        verseRef="Colossiens 4:2"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={HandHeart}
          iconClassName="bg-purple-100 text-purple-600"
          label="Sujets de prières"
          value={n(kpis.total.value)}
          delta={kpis.total.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={CheckCircle2}
          iconClassName="bg-blue-100 text-blue-600"
          label="Sujets exaucés"
          value={n(kpis.answered.value)}
          delta={kpis.answered.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={Clock}
          iconClassName="bg-amber-100 text-amber-600"
          label="En cours de prière"
          value={n(kpis.active.value)}
          delta={kpis.active.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={AlertTriangle}
          iconClassName="bg-pink-100 text-pink-600"
          label="Sujets urgents"
          value={n(kpis.urgent.value)}
          delta={kpis.urgent.deltaPct}
          periodLabel="vs mois dernier"
        />
        <div className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-5">
          <p className="italic text-slate-600">« Demandez, et l&apos;on vous donnera ; cherchez, et l&apos;on vous trouvera ; frappez, et l&apos;on vous ouvrira. »</p>
          <p className="mt-2 text-xs text-slate-400">Matthieu 7:7</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PrayerTabs activeView={params.view ?? ""} counts={tabCounts} />
        {canCreate && (
          <Button asChild>
            <Link href="/prayer/new">
              <Plus className="size-4" />
              Nouveau sujet de prière
            </Link>
          </Button>
        )}
      </div>

      <PrayerFilters
        initialSearch={params.q ?? ""}
        initialStatus={params.status ?? ""}
        initialCategory={params.category ?? ""}
        categories={categories}
      />

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
            <PrayerTable rows={rows} canDelete={canDelete} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.status) sp.set("status", params.status);
                if (params.category) sp.set("category", params.category);
                if (params.view) sp.set("view", params.view);
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
