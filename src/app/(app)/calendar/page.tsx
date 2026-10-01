import Link from "next/link";
import { CalendarRange, ChevronLeft, ChevronRight, DoorOpen, ListChecks, Plus } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCalendarItems, getCalendarKpis } from "@/features/calendar/queries";
import { addMonths, buildMonthGrid, dayKey, monthParamFor, parseMonthParam } from "@/features/calendar/lib/month";
import { CalendarItemFormDialog } from "@/features/calendar/components/calendar-item-form-dialog";
import { CalendarAgenda } from "@/features/calendar/components/calendar-agenda";
import { MonthCalendarGrid } from "@/features/calendar/components/month-calendar-grid";
import { MiniMonthCalendar } from "@/features/calendar/components/mini-month-calendar";
import { UpcomingCalendarList } from "@/features/calendar/components/upcoming-calendar-list";
import { CalendarLegend } from "@/features/calendar/components/calendar-legend";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>;
}) {
  const check = await checkPermission("calendar.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Calendrier"
          description="Visualisez et gérez tous les événements, réunions et activités de l'église."
          verseContext="calendar"
        />
        <PermissionDenied requiredPermission="calendar.view" />
      </div>
    );
  }

  const params = await searchParams;
  const organizationId = check.organization.organization.id;
  const canManage = check.context.isAdmin || check.context.permissions.has("calendar.manage");
  const view = params.view === "list" ? "list" : "month";

  const { year, month } = parseMonthParam(params.month);
  const monthParam = monthParamFor(year, month);
  const days = buildMonthGrid(year, month);
  const gridStart = days[0]!;
  const gridEnd = days[days.length - 1]!;

  const [kpis, gridEntries, upcoming] = await Promise.all([
    getCalendarKpis(organizationId),
    getCalendarItems({ organizationId, from: gridStart, to: gridEnd }),
    getCalendarItems({ organizationId, from: new Date(), to: new Date(new Date().getTime() + 30 * 24 * 3600 * 1000) }),
  ]);

  const entriesByDay = new Map<string, typeof gridEntries>();
  for (const entry of gridEntries) {
    const key = dayKey(entry.startsAt);
    const list = entriesByDay.get(key) ?? [];
    list.push(entry);
    entriesByDay.set(key, list);
  }
  const daysWithEntries = new Set(entriesByDay.keys());
  const monthOnlyEntries = gridEntries.filter((e) => e.startsAt.getUTCMonth() === month);

  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month, 1)));

  function viewHref(v: string, m = monthParam) {
    return `/calendar?month=${m}&view=${v}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Calendrier"
        description="Visualisez et gérez tous les événements, réunions et activités de l'église."
        verseContext="calendar"
        cta={{ icon: CalendarRange, line1: "Un agenda pour une église", line2: "plus connectée et plus efficace." }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={CalendarRange}
          iconClassName="bg-blue-100 text-blue-600"
          label="Événements ce mois"
          value={n(kpis.total.value)}
          delta={kpis.total.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={ListChecks}
          iconClassName="bg-green-100 text-green-600"
          label="Services"
          value={n(kpis.services.value)}
          delta={kpis.services.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={ListChecks}
          iconClassName="bg-purple-100 text-purple-600"
          label="Plannings"
          value={n(kpis.planning.value)}
          delta={kpis.planning.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={ListChecks}
          iconClassName="bg-pink-100 text-pink-600"
          label="Entrées manuelles"
          value={n(kpis.manual.value)}
          delta={kpis.manual.deltaPct}
          periodLabel="vs mois dernier"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Link href={viewHref(view, monthParamFor(new Date().getUTCFullYear(), new Date().getUTCMonth()))}>
                <Button type="button" variant="outline" size="sm">
                  Aujourd&apos;hui
                </Button>
              </Link>
              <div className="flex items-center gap-1">
                <Link href={viewHref(view, monthParamFor(prev.year, prev.month))} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                  <ChevronLeft className="size-4" />
                </Link>
                <Link href={viewHref(view, monthParamFor(next.year, next.month))} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                  <ChevronRight className="size-4" />
                </Link>
              </div>
              <p className="text-lg font-semibold capitalize text-navy">{monthLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 p-0.5">
                <Link
                  href={viewHref("month")}
                  className={cn("rounded-md px-3 py-1.5 text-sm font-medium", view === "month" ? "bg-navy text-white" : "text-slate-500 hover:bg-slate-50")}
                >
                  Mois
                </Link>
                <Link
                  href={viewHref("list")}
                  className={cn("rounded-md px-3 py-1.5 text-sm font-medium", view === "list" ? "bg-navy text-white" : "text-slate-500 hover:bg-slate-50")}
                >
                  Liste
                </Link>
              </div>
              <Button asChild size="sm">
                <Link href="/events/new">
                  <Plus className="size-4" />
                  Nouvel événement
                </Link>
              </Button>
            </div>
          </div>

          {monthOnlyEntries.length === 0 && view === "list" ? (
            <EmptyState icon={CalendarRange} title="Rien de prévu" description="Aucune activité ce mois-ci." />
          ) : view === "list" ? (
            <CalendarAgenda entries={monthOnlyEntries} canManage={canManage} />
          ) : (
            <Card className="overflow-hidden p-0">
              <MonthCalendarGrid days={days} currentMonth={month} entriesByDay={entriesByDay} today={new Date()} />
              <CalendarLegend entries={monthOnlyEntries} />
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="pt-5">
              <MiniMonthCalendar year={year} month={month} days={days} daysWithEntries={daysWithEntries} view={view} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Événements à venir</CardTitle>
            </CardHeader>
            <CardContent>
              <UpcomingCalendarList entries={upcoming.slice(0, 4)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild variant="outline" className="justify-start">
                <Link href="/events/new">
                  <Plus className="size-4" />
                  Nouvel événement
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/resources">
                  <DoorOpen className="size-4" />
                  Réserver une salle
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/planning">
                  <ListChecks className="size-4" />
                  Voir mes plannings
                </Link>
              </Button>
              {canManage && <CalendarItemFormDialog />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
