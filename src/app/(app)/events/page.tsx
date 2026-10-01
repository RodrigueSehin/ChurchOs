import Link from "next/link";
import { CalendarClock, CalendarDays, Percent, Plus, UsersRound } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMonthGrid, parseMonthParam } from "@/features/calendar/lib/month";
import { MiniMonthCalendar } from "@/features/calendar/components/mini-month-calendar";
import { UpcomingEventsList } from "@/features/dashboard/components/upcoming-events-list";
import {
  getEventCategories,
  getEventDatesInRange,
  getEventLocations,
  getEvents,
  getEventsKpis,
  getEventsTabCounts,
  getUpcomingEvents,
} from "@/features/events/queries";
import { EventsTable } from "@/features/events/components/events-table";
import { EventsFilters } from "@/features/events/components/events-filters";
import { EventsTabs } from "@/features/events/components/events-tabs";
import { EventCategoryManager } from "@/features/events/components/event-category-manager";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; categoryId?: string; location?: string; view?: string; page?: string }>;
}) {
  const check = await checkPermission("events.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Événements"
          description="Organisez et suivez tous les événements de votre église."
          verseContext="events"
        />
        <PermissionDenied requiredPermission="events.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const userId = check.user.id;
  const canCreate = check.context.isAdmin || check.context.permissions.has("events.create");
  const canUpdate = check.context.isAdmin || check.context.permissions.has("events.update");
  const canDelete = check.context.isAdmin;

  const { year, month } = parseMonthParam();
  const days = buildMonthGrid(year, month);
  const gridStart = days[0]!;
  const gridEnd = new Date(days[days.length - 1]!.getTime() + 24 * 3600 * 1000);

  const [kpis, tabCounts, categories, locations, upcoming, daysWithEntries] = await Promise.all([
    getEventsKpis(organizationId),
    getEventsTabCounts(organizationId, userId),
    getEventCategories(organizationId),
    getEventLocations(organizationId),
    getUpcomingEvents(organizationId, 4),
    getEventDatesInRange(organizationId, gridStart, gridEnd),
  ]);

  const { rows, total, pageSize } = await getEvents({
    organizationId,
    search: params.q,
    status: params.status,
    categoryId: params.categoryId,
    location: params.location,
    view: params.view,
    userId,
    page,
  });

  const hasFilters = Boolean(params.q || params.status || params.categoryId || params.location);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Événements"
        description="Organisez et suivez tous les événements de votre église."
        verseContext="events"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={CalendarDays}
          iconClassName="bg-blue-100 text-blue-600"
          label="Événements"
          value={n(kpis.total.value)}
          delta={kpis.total.deltaPct}
          periodLabel="vs année dernière"
        />
        <KpiCard
          icon={UsersRound}
          iconClassName="bg-purple-100 text-purple-600"
          label="Participants"
          value={n(kpis.participants.value)}
          delta={kpis.participants.deltaPct}
          periodLabel="vs année dernière"
        />
        <KpiCard
          icon={Percent}
          iconClassName="bg-green-100 text-green-600"
          label="Taux de participation"
          value={`${n(kpis.participationRate.value)}%`}
          delta={kpis.participationRate.deltaPct}
          periodLabel="vs année dernière"
        />
        <KpiCard
          icon={CalendarClock}
          iconClassName="bg-pink-100 text-pink-600"
          label="À venir ce mois"
          value={n(kpis.upcomingThisMonth.value)}
          delta={kpis.upcomingThisMonth.deltaPct}
          periodLabel="vs mois dernier"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <EventsTabs activeView={params.view ?? ""} counts={tabCounts} />
            {canCreate && (
              <div className="flex items-center gap-2">
                <EventCategoryManager categories={categories} />
                <Button asChild size="sm">
                  <Link href="/events/new">
                    <Plus className="size-4" />
                    Nouvel événement
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <EventsFilters
            initialSearch={params.q ?? ""}
            initialCategoryId={params.categoryId ?? ""}
            initialStatus={params.status ?? ""}
            initialLocation={params.location ?? ""}
            categories={categories}
            locations={locations}
          />

          <Card>
            {rows.length === 0 ? (
              hasFilters ? (
                <NoResultsState className="border-0" />
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title="Aucun événement"
                  description="Créez le premier événement de votre église."
                  action={
                    canCreate ? (
                      <Button asChild>
                        <Link href="/events/new">
                          <Plus className="size-4" />
                          Nouvel événement
                        </Link>
                      </Button>
                    ) : undefined
                  }
                  className="border-0"
                />
              )
            ) : (
              <>
                <EventsTable rows={rows} categories={categories} canUpdate={canUpdate} canDelete={canDelete} />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  hrefForPage={(p) => {
                    const sp = new URLSearchParams();
                    if (params.q) sp.set("q", params.q);
                    if (params.status) sp.set("status", params.status);
                    if (params.categoryId) sp.set("categoryId", params.categoryId);
                    if (params.location) sp.set("location", params.location);
                    if (params.view) sp.set("view", params.view);
                    sp.set("page", String(p));
                    return `/events?${sp.toString()}`;
                  }}
                />
              </>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="pt-5">
              <MiniMonthCalendar year={year} month={month} days={days} daysWithEntries={daysWithEntries} view="month" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prochains événements</CardTitle>
            </CardHeader>
            <CardContent>
              <UpcomingEventsList events={upcoming} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {canCreate && (
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/events/new">
                    <Plus className="size-4" />
                    Nouvel événement
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="justify-start">
                <Link href="/calendar">
                  <CalendarDays className="size-4" />
                  Voir le calendrier
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
