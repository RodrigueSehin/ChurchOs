import { Users, UserPlus, CalendarCheck, HandCoins } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getActiveMembersCount,
  getAttendanceTrend,
  getAverageRecentAttendance,
  getFinanceMonthlyTrend,
  getGivingThisMonth,
  getMemberStatusBreakdown,
  getMembershipGrowth,
  getNewMembersLast30Days,
} from "@/features/analytics/queries";
import { MembershipGrowthChart } from "@/features/analytics/components/membership-growth-chart";
import { AttendanceTrendChart } from "@/features/analytics/components/attendance-trend-chart";
import { MemberStatusChart } from "@/features/analytics/components/member-status-chart";
import { FinanceTrendChart } from "@/features/analytics/components/finance-trend-chart";

function formatAmount(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);
}

function KpiCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-navy">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AnalyticsPage() {
  const check = await checkPermission("reports.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Statistiques" description="Statistiques et graphiques : membres, présence, croissance, finances." />
        <PermissionDenied requiredPermission="reports.view" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  // Les agrégations financières sont gatées sur `finance.view` ici, jamais sur `reports.view` —
  // plusieurs rôles (SECRETARY, MINISTRY_LEADER) ont `reports.view` sans avoir accès aux finances,
  // exactement la leçon déjà appliquée à /finance/reports (Phase 9) et à la fiche membre (Phase 10).
  const canViewFinance = check.context.isAdmin || check.context.permissions.has("finance.view");

  const [activeMembers, newMembers, membershipGrowth, attendanceTrend, avgAttendance, statusBreakdown] =
    await Promise.all([
      getActiveMembersCount(organizationId),
      getNewMembersLast30Days(organizationId),
      getMembershipGrowth(organizationId),
      getAttendanceTrend(organizationId),
      getAverageRecentAttendance(organizationId),
      getMemberStatusBreakdown(organizationId),
    ]);

  const [givingThisMonth, financeTrend] = canViewFinance
    ? await Promise.all([getGivingThisMonth(organizationId), getFinanceMonthlyTrend(organizationId)])
    : [0, []];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Statistiques" description="Statistiques et graphiques : membres, présence, croissance, finances." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="Membres actifs" value={activeMembers} />
        <KpiCard icon={UserPlus} label="Nouveaux membres (30j)" value={newMembers} />
        <KpiCard icon={CalendarCheck} label="Présence moyenne récente" value={avgAttendance} />
        {canViewFinance && <KpiCard icon={HandCoins} label="Dons du mois" value={formatAmount(givingThisMonth)} />}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Croissance des membres</CardTitle>
          </CardHeader>
          <CardContent>
            <MembershipGrowthChart data={membershipGrowth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition des membres par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <MemberStatusChart data={statusBreakdown} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendance de présence</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart data={attendanceTrend} />
          </CardContent>
        </Card>

        {canViewFinance && (
          <Card>
            <CardHeader>
              <CardTitle>Finances mensuelles</CardTitle>
            </CardHeader>
            <CardContent>
              <FinanceTrendChart data={financeTrend} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
