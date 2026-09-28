import { CalendarCheck, CalendarClock, Percent, UsersRound } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getServiceAssignmentsForServices,
  getServiceTypeDistribution,
  getServiceTypes,
  getServicesKpis,
  getServicesList,
  getServicesTabCounts,
  getUpcomingServices,
} from "@/features/services/queries";
import { getActiveWorkersForSelect } from "@/features/workers/services";
import { createService } from "@/features/services/actions";
import { ServicesTable } from "@/features/services/components/services-table";
import { ServicesFilters } from "@/features/services/components/services-filters";
import { ServicesTabs } from "@/features/services/components/services-tabs";
import { ServiceFormDialog } from "@/features/services/components/service-form-dialog";
import { ServiceTypeManager } from "@/features/services/components/service-type-manager";
import { ServiceTypeDonut } from "@/features/services/components/service-type-donut";
import { UpcomingEventsList } from "@/features/dashboard/components/upcoming-events-list";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; serviceTypeId?: string; page?: string }>;
}) {
  const check = await checkPermission("services.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Services"
          description="Gérez les différents services de l'église et organisez la vie communautaire."
          quote="Tout se fasse avec bienséance et avec ordre."
          verseRef="1 Corinthiens 14:40"
        />
        <PermissionDenied requiredPermission="services.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canManage = check.context.isAdmin || check.context.permissions.has("services.create") || check.context.permissions.has("services.update");
  const isAdmin = check.context.isAdmin;

  const [kpis, tabCounts, types, typeDistribution, upcomingServices, workers] = await Promise.all([
    getServicesKpis(organizationId),
    getServicesTabCounts(organizationId),
    getServiceTypes(organizationId),
    getServiceTypeDistribution(organizationId),
    getUpcomingServices(organizationId, 4),
    getActiveWorkersForSelect(organizationId),
  ]);

  const { rows, total, pageSize } = await getServicesList({
    organizationId,
    search: params.q,
    status: params.status,
    serviceTypeId: params.serviceTypeId,
    page,
  });

  const assignmentsByService = await getServiceAssignmentsForServices(organizationId, rows.map((r) => r.id));

  const hasFilters = Boolean(params.q || params.status || params.serviceTypeId);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Services"
        description="Gérez les différents services de l'église et organisez la vie communautaire."
        quote="Tout se fasse avec bienséance et avec ordre."
        verseRef="1 Corinthiens 14:40"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={CalendarClock}
          iconClassName="bg-blue-100 text-blue-600"
          label="Services"
          value={n(kpis.total.value)}
          delta={kpis.total.deltaPct}
          periodLabel="vs année dernière"
        />
        <KpiCard
          icon={UsersRound}
          iconClassName="bg-purple-100 text-purple-600"
          label="Participants (moyenne)"
          value={n(kpis.avgAttendance.value)}
          delta={kpis.avgAttendance.deltaPct}
          periodLabel="vs année dernière"
        />
        <KpiCard
          icon={Percent}
          iconClassName="bg-green-100 text-green-600"
          label="Taux de présence"
          value={`${n(kpis.attendanceRate.value)}%`}
          delta={kpis.attendanceRate.deltaPct}
          periodLabel="vs année dernière"
        />
        <KpiCard
          icon={CalendarCheck}
          iconClassName="bg-pink-100 text-pink-600"
          label="Équipes impliquées"
          value={n(kpis.teamsInvolved.value)}
          delta={kpis.teamsInvolved.deltaPct}
          periodLabel="vs année dernière"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <ServicesTabs activeStatus={params.status ?? ""} counts={tabCounts} />
            {canManage && (
              <div className="flex items-center gap-2">
                <ServiceTypeManager types={types} />
                <ServiceFormDialog action={createService} types={types} />
              </div>
            )}
          </div>

          <ServicesFilters
            initialSearch={params.q ?? ""}
            initialStatus={params.status ?? ""}
            initialServiceTypeId={params.serviceTypeId ?? ""}
            types={types}
          />

          <Card>
            {rows.length === 0 ? (
              hasFilters ? (
                <NoResultsState className="border-0" />
              ) : (
                <EmptyState icon={CalendarClock} title="Aucun service" description="Créez le premier service de votre église." className="border-0" />
              )
            ) : (
              <>
                <ServicesTable
                  rows={rows}
                  assignmentsByService={assignmentsByService}
                  types={types}
                  workers={workers}
                  canManage={canManage}
                  isAdmin={isAdmin}
                />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  hrefForPage={(p) => {
                    const sp = new URLSearchParams();
                    if (params.q) sp.set("q", params.q);
                    if (params.status) sp.set("status", params.status);
                    if (params.serviceTypeId) sp.set("serviceTypeId", params.serviceTypeId);
                    sp.set("page", String(p));
                    return `/services?${sp.toString()}`;
                  }}
                />
              </>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Prochains services</CardTitle>
            </CardHeader>
            <CardContent>
              <UpcomingEventsList events={upcomingServices} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Répartition des services</CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceTypeDonut data={typeDistribution} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <p className="italic text-slate-600">
                « Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d&apos;eux. »
              </p>
              <p className="mt-2 text-xs text-slate-400">Matthieu 18:20</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
