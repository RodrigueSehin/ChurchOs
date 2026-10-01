import { Church, Sparkles, Users } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMinistries,
  getMinistriesKpis,
  getMinistriesTabCounts,
  getMinistryCategories,
  getMinistryCategoryStats,
  getMinistryLeadersForSelect,
} from "@/features/ministries/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { getEventsThisYearKpi, getUpcomingEvents } from "@/features/events/services";
import { createMinistry } from "@/features/ministries/actions";
import { MinistriesTable } from "@/features/ministries/components/ministries-table";
import { MinistriesFilters } from "@/features/ministries/components/ministries-filters";
import { MinistriesTabs } from "@/features/ministries/components/ministries-tabs";
import { MinistryFormDialog } from "@/features/ministries/components/ministry-form-dialog";
import { MinistryCategoryStats } from "@/features/ministries/components/ministry-category-stats";
import { UpcomingEventsList } from "@/features/dashboard/components/upcoming-events-list";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function MinistriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; leaderPersonId?: string; page?: string }>;
}) {
  const check = await checkPermission("ministries.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Ministères"
          description="Découvrez, organisez et développez les différents ministères de l'église."
          verseContext="ministries"
        />
        <PermissionDenied requiredPermission="ministries.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("ministries.create") || check.context.isAdmin;
  const canDelete = check.context.isAdmin;
  const canSeeEvents = check.context.permissions.has("events.view") || check.context.isAdmin;

  const [kpis, tabCounts, categories, categoryStats, leaders, people, eventsKpi, upcomingEvents] = await Promise.all([
    getMinistriesKpis(organizationId),
    getMinistriesTabCounts(organizationId),
    getMinistryCategories(organizationId),
    getMinistryCategoryStats(organizationId),
    getMinistryLeadersForSelect(organizationId),
    canCreate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
    canSeeEvents ? getEventsThisYearKpi(organizationId) : Promise.resolve(null),
    canSeeEvents ? getUpcomingEvents(organizationId, 3) : Promise.resolve([]),
  ]);

  const { rows, total, pageSize } = await getMinistries({
    organizationId,
    search: params.q,
    status: params.status,
    category: params.category,
    leaderPersonId: params.leaderPersonId,
    page,
  });

  const hasFilters = Boolean(params.q || params.status || params.category || params.leaderPersonId);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Ministères"
        description="Découvrez, organisez et développez les différents ministères de l'église."
        verseContext="ministries"
      />

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${canSeeEvents ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        <KpiCard
          icon={Church}
          iconClassName="bg-orange-100 text-orange-600"
          label="Ministères"
          value={n(kpis.ministries.value)}
          delta={kpis.ministries.deltaPct}
          periodLabel="vs année dernière"
        />
        <KpiCard
          icon={Users}
          iconClassName="bg-blue-100 text-blue-600"
          label="Membres impliqués"
          value={n(kpis.membersInvolved.value)}
          delta={kpis.membersInvolved.deltaPct}
          periodLabel="vs année dernière"
        />
        {canSeeEvents && eventsKpi && (
          <KpiCard
            icon={Sparkles}
            iconClassName="bg-pink-100 text-pink-600"
            label="Événements cette année"
            value={n(eventsKpi.value)}
            delta={eventsKpi.deltaPct}
            periodLabel="vs année dernière"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <MinistriesTabs activeStatus={params.status ?? ""} counts={tabCounts} />
            {canCreate && <MinistryFormDialog action={createMinistry} people={people} categories={categories} />}
          </div>

          <MinistriesFilters
            initialSearch={params.q ?? ""}
            initialCategory={params.category ?? ""}
            initialLeaderPersonId={params.leaderPersonId ?? ""}
            categories={categories}
            leaders={leaders}
          />

          <Card>
            {rows.length === 0 ? (
              hasFilters ? (
                <NoResultsState className="border-0" />
              ) : (
                <EmptyState icon={Church} title="Aucun ministère" description="Créez le premier ministère de votre église." className="border-0" />
              )
            ) : (
              <>
                <MinistriesTable rows={rows} canDelete={canDelete} />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  hrefForPage={(p) => {
                    const sp = new URLSearchParams();
                    if (params.q) sp.set("q", params.q);
                    if (params.status) sp.set("status", params.status);
                    if (params.category) sp.set("category", params.category);
                    if (params.leaderPersonId) sp.set("leaderPersonId", params.leaderPersonId);
                    sp.set("page", String(p));
                    return `/ministries?${sp.toString()}`;
                  }}
                />
              </>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex items-start gap-3 pt-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy">
                <Users className="size-4.5" />
              </span>
              <div>
                <p className="font-semibold text-navy">Unis pour son œuvre</p>
                <p className="mt-1 text-sm text-slate-500">
                  Chaque ministère contribue à l&apos;édification du corps de Christ et à l&apos;accomplissement de la vision.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistiques par catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <MinistryCategoryStats stats={categoryStats} />
            </CardContent>
          </Card>

          {canSeeEvents && (
            <Card>
              <CardHeader>
                <CardTitle>Prochains événements</CardTitle>
              </CardHeader>
              <CardContent>
                <UpcomingEventsList events={upcomingEvents} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
