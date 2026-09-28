import { CalendarDays, Coins, HandHeart, UserPlus, Users, UsersRound } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAverageRecentAttendance, getMembershipGrowth, getNewMembersLast30Days } from "@/features/analytics/services";
import { getUpcomingEvents } from "@/features/events/services";
import {
  getEventsKpi,
  getFamiliesKpi,
  getFinanceOverview,
  getGivingKpi,
  getMemberAgeBreakdown,
  getMembersKpi,
  getMyPendingTasks,
  getPrayerKpi,
  getRecentActivity,
  getVisitorsKpi,
  type RecentActivityKind,
} from "@/features/dashboard/queries";
import { AiInsightsCard } from "@/features/dashboard/components/ai-insights-card";
import { AgeBreakdownChart } from "@/features/dashboard/components/age-breakdown-chart";
import { FinanceOverviewCard } from "@/features/dashboard/components/finance-overview-card";
import { GrowthChart } from "@/features/dashboard/components/growth-chart";
import { HeroBanner } from "@/features/dashboard/components/hero-banner";
import { KpiCard } from "@/components/shared/kpi-card";
import { MyTasksList } from "@/features/dashboard/components/my-tasks-list";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { RecentActivityList } from "@/features/dashboard/components/recent-activity-list";
import { UpcomingEventsList } from "@/features/dashboard/components/upcoming-events-list";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function DashboardPage() {
  const check = await checkPermission("members.view");
  const organizationId = check.organization.organization.id;
  const perms = check.context.permissions;
  const firstName = check.user.profile?.firstName || check.user.email.split("@")[0] || "Administrateur";

  const canMembers = perms.has("members.view");
  const canEvents = perms.has("events.view");
  const canAttendance = perms.has("attendance.view");
  const canFinance = perms.has("finance.view");
  const canPrayer = perms.has("prayer.view");
  const canVisits = perms.has("visits.view");
  const canRegistrations = perms.has("registrations.view");
  const canCreateMember = perms.has("members.create");
  const canCreateEvent = perms.has("events.create");
  const canCreateFinance = perms.has("finance.create");
  const canManageCommunication = perms.has("communication.manage");
  const canCreatePrayer = perms.has("prayer.create");
  const canViewReports = perms.has("reports.view");

  const [membersKpi, familiesKpi, visitorsKpi, eventsKpi, givingKpi, prayerKpi] = await Promise.all([
    canMembers ? getMembersKpi(organizationId) : Promise.resolve(null),
    canMembers ? getFamiliesKpi(organizationId) : Promise.resolve(null),
    canMembers ? getVisitorsKpi(organizationId) : Promise.resolve(null),
    canEvents ? getEventsKpi(organizationId) : Promise.resolve(null),
    canFinance ? getGivingKpi(organizationId) : Promise.resolve(null),
    canPrayer ? getPrayerKpi(organizationId) : Promise.resolve(null),
  ]);

  const [growthData, ageBreakdown, newMembers30d] = await Promise.all([
    canMembers ? getMembershipGrowth(organizationId) : Promise.resolve([]),
    canMembers ? getMemberAgeBreakdown(organizationId) : Promise.resolve([]),
    canMembers ? getNewMembersLast30Days(organizationId) : Promise.resolve(0),
  ]);

  const upcomingEvents = canEvents ? await getUpcomingEvents(organizationId, 3) : [];
  const financeOverview = canFinance ? await getFinanceOverview(organizationId) : null;
  const avgAttendance = canAttendance ? await getAverageRecentAttendance(organizationId) : null;

  const allowedActivityKinds = new Set<RecentActivityKind>();
  if (canMembers) allowedActivityKinds.add("member");
  if (canVisits) allowedActivityKinds.add("visit");
  if (canRegistrations) allowedActivityKinds.add("registration");
  if (canFinance) allowedActivityKinds.add("offering");
  if (canPrayer) allowedActivityKinds.add("prayer");
  const recentActivity = await getRecentActivity(organizationId, allowedActivityKinds);

  const myTasks = await getMyPendingTasks(organizationId, check.user.id, 5);

  const insights: string[] = [];
  if (canAttendance && avgAttendance !== null) insights.push(`Présence moyenne récente : ${n(avgAttendance)} personne(s) par session.`);
  if (canMembers) insights.push(`${n(newMembers30d)} nouveau(x) membre(s) actif(s) ces 30 derniers jours.`);
  if (myTasks.length > 0) insights.push(`${myTasks.length} suivi(s) pastoral(aux) vous attend(ent).`);
  if (canPrayer && prayerKpi) insights.push(`${n(prayerKpi.value)} sujet(s) de prière actif(s) actuellement.`);

  return (
    <div className="flex flex-col gap-6">
      <HeroBanner firstName={firstName} organizationName={check.organization.organization.name} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {membersKpi && (
          <KpiCard
            icon={Users}
            iconClassName="bg-blue-100 text-blue-600"
            label="Membres"
            value={n(membersKpi.value)}
            delta={membersKpi.deltaPct ?? 0}
            periodLabel="vs mois dernier"
          />
        )}
        {familiesKpi && (
          <KpiCard
            icon={UsersRound}
            iconClassName="bg-purple-100 text-purple-600"
            label="Familles"
            value={n(familiesKpi.value)}
            delta={familiesKpi.deltaPct ?? 0}
            periodLabel="vs mois dernier"
          />
        )}
        {visitorsKpi && (
          <KpiCard
            icon={UserPlus}
            iconClassName="bg-green-100 text-green-600"
            label="Visiteurs"
            value={n(visitorsKpi.value)}
            delta={visitorsKpi.deltaPct ?? 0}
            periodLabel="vs mois dernier"
          />
        )}
        {eventsKpi && (
          <KpiCard
            icon={CalendarDays}
            iconClassName="bg-orange-100 text-orange-600"
            label="Événements"
            value={n(eventsKpi.value)}
            delta={eventsKpi.deltaAbs ?? 0}
            deltaSuffix=""
            periodLabel="ce mois-ci"
          />
        )}
        {givingKpi && (
          <KpiCard
            icon={Coins}
            iconClassName="bg-amber-100 text-amber-600"
            label="Dons & offrandes"
            value={n(givingKpi.value)}
            delta={givingKpi.deltaPct ?? 0}
            extraSuffix="FCFA"
            periodLabel="vs mois dernier"
          />
        )}
        {prayerKpi && (
          <KpiCard
            icon={HandHeart}
            iconClassName="bg-pink-100 text-pink-600"
            label="Sujets de prière"
            value={n(prayerKpi.value)}
            delta={prayerKpi.deltaPct ?? 0}
            periodLabel="ce mois-ci"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-5">
          {canMembers && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Croissance des membres</CardTitle>
                <span className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-500">6 derniers mois</span>
              </CardHeader>
              <CardContent>
                <GrowthChart data={growthData} currentTotal={membersKpi?.value ?? 0} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Activités récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentActivityList items={recentActivity} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          {canMembers && (
            <Card>
              <CardHeader>
                <CardTitle>Répartition des membres</CardTitle>
              </CardHeader>
              <CardContent>
                <AgeBreakdownChart data={ageBreakdown} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Mes tâches</CardTitle>
            </CardHeader>
            <CardContent>
              <MyTasksList items={myTasks} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-3">
          {canEvents && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Prochains événements</CardTitle>
              </CardHeader>
              <CardContent>
                <UpcomingEventsList events={upcomingEvents} />
              </CardContent>
            </Card>
          )}

          <AiInsightsCard firstName={firstName} insights={insights} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {financeOverview && (
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle>Finances - Vue d&apos;ensemble</CardTitle>
            </CardHeader>
            <CardContent>
              <FinanceOverviewCard overview={financeOverview} />
            </CardContent>
          </Card>
        )}

        <Card className={financeOverview ? "lg:col-span-5" : "lg:col-span-12"}>
          <CardHeader>
            <CardTitle>Raccourcis rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <QuickActions
              canCreateMember={canCreateMember}
              canCreateEvent={canCreateEvent}
              canCreateFinance={canCreateFinance}
              canManageCommunication={canManageCommunication}
              canCreatePrayer={canCreatePrayer}
              canViewReports={canViewReports}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
