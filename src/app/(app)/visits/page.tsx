import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, HeartHandshake, Plus, Users } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAssignableUsers, getVisits, getVisitsKpis, getVisitsTabCounts } from "@/features/visits/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { VisitsTable } from "@/features/visits/components/visits-table";
import { VisitsFilters } from "@/features/visits/components/visits-filters";
import { VisitsTabs } from "@/features/visits/components/visits-tabs";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; visitType?: string; assignedToUserId?: string; view?: string; page?: string }>;
}) {
  const check = await checkPermission("visits.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Visites pastorales"
          description="Planifiez, suivez et enregistrez vos visites pour rester proche de votre communauté."
          verseContext="visits"
        />
        <PermissionDenied requiredPermission="visits.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("visits.create") || check.context.isAdmin;
  const canUpdate = check.context.permissions.has("visits.update") || check.context.isAdmin;

  const [kpis, tabCounts, people, assignableUsers] = await Promise.all([
    getVisitsKpis(organizationId),
    getVisitsTabCounts(organizationId),
    canUpdate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
    getAssignableUsers(organizationId),
  ]);

  const { rows, total, pageSize } = await getVisits({
    organizationId,
    search: params.q,
    status: params.status,
    visitType: params.visitType,
    assignedToUserId: params.assignedToUserId,
    view: params.view,
    page,
  });

  const hasFilters = Boolean(params.q || params.status || params.visitType || params.assignedToUserId || params.view);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Visites pastorales"
        description="Planifiez, suivez et enregistrez vos visites pour rester proche de votre communauté."
        verseContext="visits"
        cta={{ icon: HeartHandshake, line1: "Aller vers les autres", line2: "comme Christ nous a aimés." }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          iconClassName="bg-green-100 text-green-600"
          label="Visites réalisées"
          value={n(kpis.done.value)}
          delta={kpis.done.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={CalendarClock}
          iconClassName="bg-blue-100 text-blue-600"
          label="Visites prévues"
          value={n(kpis.upcoming.value)}
          delta={kpis.upcoming.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={CheckCircle2}
          iconClassName="bg-amber-100 text-amber-600"
          label="Visites en cours"
          value={n(kpis.inProgress.value)}
          delta={kpis.inProgress.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={AlertTriangle}
          iconClassName="bg-pink-100 text-pink-600"
          label="Visites en retard"
          value={n(kpis.overdue.value)}
          delta={kpis.overdue.deltaPct}
          periodLabel="vs mois dernier"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <VisitsTabs activeView={params.view ?? ""} counts={tabCounts} />
        {canCreate && (
          <Button asChild>
            <Link href="/visits/new">
              <Plus className="size-4" />
              Nouvelle visite
            </Link>
          </Button>
        )}
      </div>

      <VisitsFilters
        initialSearch={params.q ?? ""}
        initialVisitType={params.visitType ?? ""}
        initialStatus={params.status ?? ""}
        initialAssignedToUserId={params.assignedToUserId ?? ""}
        assignableUsers={assignableUsers}
      />

      <Card>
        {rows.length === 0 ? (
          hasFilters ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState
              icon={Users}
              title="Aucune visite"
              description="Enregistrez la première visite de votre église."
              action={
                canCreate ? (
                  <Button asChild>
                    <Link href="/visits/new">
                      <Plus className="size-4" />
                      Nouvelle visite
                    </Link>
                  </Button>
                ) : undefined
              }
              className="border-0"
            />
          )
        ) : (
          <>
            <VisitsTable rows={rows} people={people} assignableUsers={assignableUsers} canUpdate={canUpdate} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.status) sp.set("status", params.status);
                if (params.visitType) sp.set("visitType", params.visitType);
                if (params.assignedToUserId) sp.set("assignedToUserId", params.assignedToUserId);
                if (params.view) sp.set("view", params.view);
                sp.set("page", String(p));
                return `/visits?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
