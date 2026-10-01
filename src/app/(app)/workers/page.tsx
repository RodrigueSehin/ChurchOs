import Link from "next/link";
import { CheckCircle2, HardHat, Link2, UserPlus, UsersRound, UserX } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { getDailyVerse } from "@/lib/verses";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getWorkerAffiliationOptions,
  getWorkerAffiliationStats,
  getWorkers,
  getWorkersKpis,
  getWorkersTabCounts,
} from "@/features/workers/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { getUpcomingEvents } from "@/features/events/services";
import { createWorker } from "@/features/workers/actions";
import { WorkersTable } from "@/features/workers/components/workers-table";
import { WorkersFilters } from "@/features/workers/components/workers-filters";
import { WorkersTabs } from "@/features/workers/components/workers-tabs";
import { WorkerFormDialog } from "@/features/workers/components/worker-form-dialog";
import { WorkerAffiliationStats } from "@/features/workers/components/worker-affiliation-stats";
import { UpcomingEventsList } from "@/features/dashboard/components/upcoming-events-list";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function WorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; affiliation?: string; page?: string }>;
}) {
  const check = await checkPermission("workers.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Ouvriers"
          description="Des hommes et des femmes au service de la vision de Dieu."
          verseContext="workers"
        />
        <PermissionDenied requiredPermission="workers.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("workers.create") || check.context.isAdmin;
  const canUpdate = check.context.permissions.has("workers.update") || check.context.isAdmin;
  const canSeeEvents = check.context.permissions.has("events.view") || check.context.isAdmin;

  const [kpis, tabCounts, affiliationOptions, affiliationStats, people, upcomingEvents] = await Promise.all([
    getWorkersKpis(organizationId),
    getWorkersTabCounts(organizationId),
    getWorkerAffiliationOptions(organizationId),
    getWorkerAffiliationStats(organizationId),
    canCreate || canUpdate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
    canSeeEvents ? getUpcomingEvents(organizationId, 3) : Promise.resolve([]),
  ]);

  const { rows, total, pageSize } = await getWorkers({
    organizationId,
    search: params.q,
    status: params.status,
    affiliation: params.affiliation,
    page,
  });

  const existingWorkerPersonIds = new Set(rows.map((r) => r.personId));
  const availablePeople = people.filter((p) => !existingWorkerPersonIds.has(p.id));

  const hasFilters = Boolean(params.q || params.status || params.affiliation);

  const sideVerse = getDailyVerse("workers", 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Ouvriers"
        description="Des hommes et des femmes au service de la vision de Dieu."
        verseContext="workers"
        cta={{ icon: UsersRound, line1: "Servir ensemble,", line2: "pour un plus grand impact." }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={HardHat}
          iconClassName="bg-blue-100 text-blue-600"
          label="Ouvriers actifs"
          value={n(kpis.active.value)}
          delta={kpis.active.deltaPct}
          periodLabel="vs année dernière"
        />
        <KpiCard
          icon={UsersRound}
          iconClassName="bg-purple-100 text-purple-600"
          label="Équipes / Services"
          value={n(kpis.teams.value)}
          delta={kpis.teams.deltaPct}
          periodLabel="vs année dernière"
        />
        <KpiCard
          icon={CheckCircle2}
          iconClassName="bg-green-100 text-green-600"
          label="Nouveaux ouvriers"
          value={n(kpis.newThisYear.value)}
          delta={kpis.newThisYear.deltaPct}
          periodLabel="cette année"
        />
        <KpiCard
          icon={UserX}
          iconClassName="bg-pink-100 text-pink-600"
          label="En attente d'affectation"
          value={n(kpis.unassigned.value)}
          delta={kpis.unassigned.deltaPct}
          periodLabel="vs mois dernier"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <WorkersTabs activeStatus={params.status ?? ""} counts={tabCounts} />
            {canCreate && <WorkerFormDialog action={createWorker} people={availablePeople} />}
          </div>

          <WorkersFilters
            initialSearch={params.q ?? ""}
            initialAffiliation={params.affiliation ?? ""}
            affiliationOptions={affiliationOptions}
          />

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
                    if (params.affiliation) sp.set("affiliation", params.affiliation);
                    sp.set("page", String(p));
                    return `/workers?${sp.toString()}`;
                  }}
                />
              </>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {canCreate && (
                <WorkerFormDialog
                  action={createWorker}
                  people={availablePeople}
                  trigger={
                    <button
                      type="button"
                      className="flex w-full flex-col items-center gap-2 rounded-xl bg-blue-50 px-3 py-4 text-center text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      <UserPlus className="size-5" />
                      Nouvel ouvrier
                    </button>
                  }
                />
              )}
              <Link
                href="/teams"
                className="flex flex-col items-center gap-2 rounded-xl bg-purple-50 px-3 py-4 text-center text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100"
              >
                <UsersRound className="size-5" />
                Nouvelle équipe
              </Link>
              <Link
                href="/teams"
                className="flex flex-col items-center gap-2 rounded-xl bg-cyan-50 px-3 py-4 text-center text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-100"
              >
                <Link2 className="size-5" />
                Affecter un ouvrier
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Répartition par équipe</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkerAffiliationStats stats={affiliationStats} />
            </CardContent>
          </Card>

          {canSeeEvents && (
            <Card>
              <CardHeader>
                <CardTitle>Prochains rendez-vous</CardTitle>
              </CardHeader>
              <CardContent>
                <UpcomingEventsList events={upcomingEvents} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-5">
              <p className="italic text-slate-600">
                « {sideVerse.text} »
              </p>
              <p className="mt-2 text-xs text-slate-400">{sideVerse.ref}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
