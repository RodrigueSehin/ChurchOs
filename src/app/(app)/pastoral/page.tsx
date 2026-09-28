import Link from "next/link";
import { AlertTriangle, CalendarPlus, HeartHandshake, Plus, UserCog, Users } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPastoralFollowups, getPastoralKpis, getPastoralTabCounts, getAssignableUsers } from "@/features/pastoral/queries";
import { getVisitsThisMonthKpi } from "@/features/visits/services";
import { getPrayerRequestsThisMonthKpi } from "@/features/prayer/services";
import { PastoralTable } from "@/features/pastoral/components/pastoral-table";
import { PastoralFilters } from "@/features/pastoral/components/pastoral-filters";
import { PastoralTabs } from "@/features/pastoral/components/pastoral-tabs";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function PastoralPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; priority?: string; view?: string; assignedToUserId?: string; page?: string }>;
}) {
  const check = await checkPermission("pastoral.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Suivi pastoral"
          description="Accompagnez, écoutez et soutenez vos membres dans leur marche avec Dieu."
          quote="Portez les fardeaux les uns des autres, et vous accomplirez ainsi la loi de Christ."
          verseRef="Galates 6:2"
        />
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
  const canCreate = check.context.permissions.has("pastoral.create") || check.context.isAdmin;
  const canDelete = check.context.permissions.has("pastoral.delete") || check.context.isAdmin;

  const [kpis, visitsKpi, prayerKpi, tabCounts, assignableUsers] = await Promise.all([
    getPastoralKpis(organizationId, ctx),
    getVisitsThisMonthKpi(organizationId),
    getPrayerRequestsThisMonthKpi(organizationId),
    getPastoralTabCounts(organizationId, ctx),
    getAssignableUsers(organizationId),
  ]);

  const { rows, total, pageSize } = await getPastoralFollowups({
    organizationId,
    ctx,
    search: params.q,
    status: params.status,
    priority: params.priority,
    view: params.view,
    assignedToUserId: params.assignedToUserId,
    page,
  });

  const hasFilters = Boolean(params.q || params.status || params.priority || params.view || params.assignedToUserId);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Suivi pastoral"
        description="Accompagnez, écoutez et soutenez vos membres dans leur marche avec Dieu."
        quote="Portez les fardeaux les uns des autres, et vous accomplirez ainsi la loi de Christ."
        verseRef="Galates 6:2"
        cta={{ icon: HeartHandshake, line1: "Un cœur qui écoute,", line2: "une église qui grandit." }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={Users}
          iconClassName="bg-blue-100 text-blue-600"
          label="Membres suivis"
          value={n(kpis.membersFollowed.value)}
          delta={kpis.membersFollowed.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={AlertTriangle}
          iconClassName="bg-red-100 text-red-600"
          label="Situations sensibles"
          value={n(kpis.sensitive.value)}
          delta={kpis.sensitive.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={CalendarPlus}
          iconClassName="bg-green-100 text-green-600"
          label="Visites pastorales"
          value={n(visitsKpi.value)}
          delta={visitsKpi.deltaPct}
          periodLabel="ce mois-ci"
        />
        <KpiCard
          icon={HeartHandshake}
          iconClassName="bg-purple-100 text-purple-600"
          label="Sujets de prière"
          value={n(prayerKpi.value)}
          delta={prayerKpi.deltaPct}
          periodLabel="ce mois-ci"
        />
        <KpiCard icon={UserCog} iconClassName="bg-amber-100 text-amber-600" label="Accompagnements" value={n(kpis.inProgress)} periodLabel="en cours" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <PastoralTabs activeView={params.view ?? ""} counts={tabCounts} />
            {canCreate && (
              <Button asChild>
                <Link href="/pastoral/new">
                  <Plus className="size-4" />
                  Nouveau suivi
                </Link>
              </Button>
            )}
          </div>

          <PastoralFilters
            initialSearch={params.q ?? ""}
            initialStatus={params.status ?? ""}
            initialPriority={params.priority ?? ""}
            initialAssignedToUserId={params.assignedToUserId ?? ""}
            assignableUsers={assignableUsers}
          />

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
                <PastoralTable rows={rows} canDelete={canDelete} />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  hrefForPage={(p) => {
                    const sp = new URLSearchParams();
                    if (params.q) sp.set("q", params.q);
                    if (params.status) sp.set("status", params.status);
                    if (params.priority) sp.set("priority", params.priority);
                    if (params.view) sp.set("view", params.view);
                    if (params.assignedToUserId) sp.set("assignedToUserId", params.assignedToUserId);
                    sp.set("page", String(p));
                    return `/pastoral?${sp.toString()}`;
                  }}
                />
              </>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/visits/new">
                <CalendarPlus className="size-4" />
                Planifier une visite
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/prayer/new">
                <HeartHandshake className="size-4" />
                Ajouter un sujet de prière
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/pastoral-council">
                <Users className="size-4" />
                Conseil pastoral
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
