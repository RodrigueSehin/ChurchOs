import Link from "next/link";
import { BarChart3, ClipboardList, HeartHandshake, UserCheck, Users } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAttendanceKpis,
  getAttendanceRecordsList,
  getAttendanceSessionOptions,
  getAttendanceTabCounts,
  getTodayPresenceBreakdown,
  getTodaySessions,
} from "@/features/attendance/queries";
import { getEventsForSelect } from "@/features/events/services";
import { getServices } from "@/features/services/services";
import { getPeopleForSelect } from "@/features/members/services";
import { AttendanceTable } from "@/features/attendance/components/attendance-table";
import { AttendanceFilters } from "@/features/attendance/components/attendance-filters";
import { AttendanceTabs } from "@/features/attendance/components/attendance-tabs";
import { RecordAttendanceDialog } from "@/features/attendance/components/record-attendance-dialog";
import { AttendanceSessionFormDialog } from "@/features/attendance/components/attendance-session-form-dialog";
import { TodayPresenceDonut } from "@/features/attendance/components/today-presence-donut";
import { TodaySessionsList } from "@/features/attendance/components/today-sessions-list";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; source?: string; sessionId?: string; period?: string; page?: string }>;
}) {
  const check = await checkPermission("attendance.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Présences"
          description="Suivez la participation aux cultes, réunions et activités de l'église."
          verseContext="attendance"
        />
        <PermissionDenied requiredPermission="attendance.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.isAdmin || check.context.permissions.has("attendance.create");
  const canDelete = check.context.isAdmin;
  const period = params.period ?? "week";

  const [kpis, tabCounts, sessionOptions, events, services, people, todayBreakdown, todaySessions] = await Promise.all([
    getAttendanceKpis(organizationId),
    getAttendanceTabCounts(organizationId),
    getAttendanceSessionOptions(organizationId),
    getEventsForSelect(organizationId),
    getServices(organizationId),
    canCreate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
    getTodayPresenceBreakdown(organizationId),
    getTodaySessions(organizationId),
  ]);

  const { rows, total, pageSize } = await getAttendanceRecordsList({
    organizationId,
    search: params.q,
    status: params.status,
    source: params.source,
    sessionId: params.sessionId,
    period,
    page,
  });

  const hasFilters = Boolean(params.q || params.status || params.sessionId || (params.period && params.period !== "week"));
  const servicesForSelect = services.map((s) => ({ id: s.id, title: s.title }));

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Présences"
        description="Suivez la participation aux cultes, réunions et activités de l'église."
        verseContext="attendance"
        cta={{ icon: HeartHandshake, line1: "Chaque présence compte", line2: "pour bâtir une église vivante." }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          iconClassName="bg-blue-100 text-blue-600"
          label="Présences cette semaine"
          value={n(kpis.presentThisWeek.value)}
          delta={kpis.presentThisWeek.deltaPct}
          periodLabel="vs semaine dernière"
        />
        <KpiCard icon={UserCheck} iconClassName="bg-green-100 text-green-600" label="Membres présents" value={n(kpis.membersPresent.value)} />
        <KpiCard icon={Users} iconClassName="bg-purple-100 text-purple-600" label="Visiteurs présents" value={n(kpis.visitorsPresent.value)} />
        <KpiCard
          icon={HeartHandshake}
          iconClassName="bg-red-100 text-red-600"
          label="Taux de présence global"
          value={`${n(kpis.presenceRate.value)}%`}
          delta={kpis.presenceRate.deltaPct}
          periodLabel="vs mois dernier"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <AttendanceTabs activeSource={params.source ?? ""} counts={tabCounts} />
            {canCreate && (
              <div className="flex items-center gap-2">
                <AttendanceSessionFormDialog events={events} services={servicesForSelect} />
                <RecordAttendanceDialog sessions={sessionOptions} people={people} events={events} services={servicesForSelect} />
              </div>
            )}
          </div>

          <AttendanceFilters
            initialSearch={params.q ?? ""}
            initialSessionId={params.sessionId ?? ""}
            initialPeriod={period}
            initialStatus={params.status ?? ""}
            sessions={sessionOptions}
          />

          <Card>
            {rows.length === 0 ? (
              hasFilters ? (
                <NoResultsState className="border-0" />
              ) : (
                <EmptyState
                  icon={ClipboardList}
                  title="Aucune présence"
                  description="Enregistrez la première présence."
                  action={canCreate ? <RecordAttendanceDialog sessions={sessionOptions} people={people} events={events} services={servicesForSelect} /> : undefined}
                  className="border-0"
                />
              )
            ) : (
              <>
                <AttendanceTable rows={rows} canUpdate={canCreate} canDelete={canDelete} />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  hrefForPage={(p) => {
                    const sp = new URLSearchParams();
                    if (params.q) sp.set("q", params.q);
                    if (params.status) sp.set("status", params.status);
                    if (params.source) sp.set("source", params.source);
                    if (params.sessionId) sp.set("sessionId", params.sessionId);
                    if (params.period) sp.set("period", params.period);
                    sp.set("page", String(p));
                    return `/attendance?${sp.toString()}`;
                  }}
                />
              </>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Présences du jour</CardTitle>
            </CardHeader>
            <CardContent>
              <TodayPresenceDonut breakdown={todayBreakdown} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Événements du jour</CardTitle>
            </CardHeader>
            <CardContent>
              <TodaySessionsList rows={todaySessions} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild variant="outline" className="justify-start">
                <a href="/api/reports/attendance?format=csv" download>
                  <ClipboardList className="size-4" />
                  Exporter les présences
                </a>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/reports">
                  <BarChart3 className="size-4" />
                  Voir les statistiques
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
