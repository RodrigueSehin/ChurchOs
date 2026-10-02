import Link from "next/link";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  Download,
  GraduationCap,
  HandCoins,
  Heart,
  Home,
  Smile,
  Baby,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildRange, formatRangeLabel, parsePeriod } from "@/features/analytics/period";
import {
  getActivitiesByCategory,
  getAgeDistribution,
  getAttendanceEvolution,
  getEngagement,
  getGivingStats,
  getNewMembersByMonth,
  getPeopleBreakdown,
  getReservationStatus,
  getRoomUsage,
  getStatsKpis,
  getTopEvents,
  type StatKpi,
} from "@/features/analytics/queries/statistics";
import { monthLabel } from "@/features/analytics/components/month-label";
import { PeriodSelect } from "@/features/analytics/components/period-select";
import { StatsAttendanceChart } from "@/features/analytics/components/stats-attendance-chart";
import { StatsBarChart } from "@/features/analytics/components/stats-bar-chart";
import { StatsDonut } from "@/features/analytics/components/stats-donut";

const PALETTE = ["#3B82F6", "#A855F7", "#16A34A", "#F59E0B", "#DC2626", "#94A3B8"];

const RESERVATION_STATUS: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmées", color: "#16A34A" },
  pending: { label: "En attente", color: "#F59E0B" },
  cancelled: { label: "Annulées", color: "#DC2626" },
  completed: { label: "Terminées", color: "#94A3B8" },
};

const ROOM_BAR_COLORS = ["#3B82F6", "#A855F7", "#16A34A", "#F59E0B", "#DC2626", "#38BDF8"];

function formatAmount(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);
}

function nf(value: number) {
  return value.toLocaleString("fr-FR");
}

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DeltaRow({ label, kpi }: { label: string; kpi: StatKpi }) {
  const positive = kpi.delta >= 0;
  return (
    <li className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-slate-100 py-2.5 text-sm last:border-0">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-navy">{nf(kpi.value)}</span>
      <span className={positive ? "w-14 text-right text-xs font-medium text-success" : "w-14 text-right text-xs font-medium text-danger"}>
        {positive ? "▲" : "▼"} {positive ? "+" : ""}
        {kpi.delta}%
      </span>
    </li>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const check = await checkPermission("reports.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Statistiques" description="Suivez les indicateurs clés de votre église pour une meilleure prise de décision." />
        <PermissionDenied requiredPermission="reports.view" />
      </div>
    );
  }

  const { period } = await searchParams;
  const range = buildRange(parsePeriod(period));
  const organizationId = check.organization.organization.id;
  const has = (code: string) => check.context.isAdmin || check.context.permissions.has(code);
  // Les dons sont une donnée financière : gatés sur `finance.view`, jamais sur `reports.view`
  // (plusieurs rôles ont `reports.view` sans accès aux finances — leçon des Phases 9 et 13).
  const canViewFinance = has("finance.view");
  const canExport = has("reports.export");

  const [kpis, attendance, ages, people, activities, newMembers, rooms, reservations, topEvents, engagement, giving] = await Promise.all([
    getStatsKpis(organizationId, range),
    getAttendanceEvolution(organizationId, range),
    getAgeDistribution(organizationId),
    getPeopleBreakdown(organizationId),
    getActivitiesByCategory(organizationId, range),
    getNewMembersByMonth(organizationId, range),
    getRoomUsage(organizationId, range),
    getReservationStatus(organizationId, range),
    getTopEvents(organizationId, range),
    getEngagement(organizationId, range),
    canViewFinance ? getGivingStats(organizationId, range) : Promise.resolve(null),
  ]);

  const rangeLabel = formatRangeLabel(range);
  const vs = "vs période précédente";
  const exports = [
    { type: "members", label: "Membres", allowed: has("members.view") },
    { type: "attendance", label: "Présences", allowed: has("attendance.view") },
    { type: "registrations", label: "Inscriptions", allowed: has("registrations.view") },
    { type: "finance", label: "Finances", allowed: canViewFinance },
  ].filter((e) => e.allowed);

  const ageColors = ["#F59E0B", "#A855F7", "#3B82F6", "#16A34A", "#94A3B8"];
  const reservationRows = Object.entries(RESERVATION_STATUS)
    .map(([status, meta]) => ({ key: status, label: meta.label, color: meta.color, value: reservations.find((r) => r.status === status)?.value ?? 0 }))
    .filter((r) => r.value > 0);
  const totalNewMembers = newMembers.reduce((s, m) => s + m.value, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Statistiques"
        description="Suivez les indicateurs clés de votre église pour une meilleure prise de décision."
        actions={
          <>
            <span className="hidden text-xs text-slate-500 md:inline">{rangeLabel}</span>
            <PeriodSelect value={range.key} label={rangeLabel} />
            {canExport && exports.length > 0 && (
              <details className="relative">
                <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm hover:bg-primary/90">
                  <Download className="size-4" />
                  Exporter
                  <ChevronDown className="size-4" />
                </summary>
                <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                  {exports.map((e) => (
                    <a key={e.type} href={`/api/reports/${e.type}?format=xlsx`} download className="block rounded px-3 py-2 text-sm text-navy hover:bg-slate-50">
                      {e.label} (Excel)
                    </a>
                  ))}
                </div>
              </details>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={Users} iconClassName="bg-blue-100 text-blue-600" label="Membres actifs" value={nf(kpis.activeMembers.value)} delta={kpis.activeMembers.delta} extraSuffix="depuis le début" />
        <KpiCard icon={UserPlus} iconClassName="bg-purple-100 text-purple-600" label="Nouveaux membres" value={nf(kpis.newMembers.value)} delta={kpis.newMembers.delta} extraSuffix={vs} />
        <KpiCard icon={CalendarDays} iconClassName="bg-rose-100 text-rose-600" label="Événements organisés" value={nf(kpis.events.value)} delta={kpis.events.delta} extraSuffix={vs} />
        <KpiCard icon={ShieldCheck} iconClassName="bg-green-100 text-green-600" label="Taux de présence" value={`${kpis.attendanceRate.value}%`} delta={kpis.attendanceRate.delta} deltaSuffix=" pt" extraSuffix={vs} />
        {giving ? (
          <KpiCard icon={Heart} iconClassName="bg-red-100 text-red-500" label="Dons et offrandes" value={formatAmount(giving.total)} delta={giving.delta} extraSuffix={vs} />
        ) : (
          <KpiCard icon={HandCoins} iconClassName="bg-slate-100 text-slate-400" label="Dons et offrandes" value="—" />
        )}
        <KpiCard icon={UsersRound} iconClassName="bg-amber-100 text-amber-600" label="Visiteurs" value={nf(kpis.visitors.value)} delta={kpis.visitors.delta} extraSuffix={vs} />
        <KpiCard icon={Baby} iconClassName="bg-sky-100 text-sky-600" label="Enfants" value={nf(kpis.children.value)} delta={kpis.children.delta} extraSuffix="depuis le début" />
        <KpiCard icon={Smile} iconClassName="bg-violet-100 text-violet-600" label="Jeunes" value={nf(kpis.youth.value)} delta={kpis.youth.delta} extraSuffix="depuis le début" />
        <KpiCard icon={UserCheck} iconClassName="bg-emerald-100 text-emerald-600" label="Ouvriers/Serviteurs" value={nf(kpis.workers.value)} delta={kpis.workers.delta} extraSuffix="depuis le début" />
        <KpiCard icon={GraduationCap} iconClassName="bg-blue-100 text-blue-700" label="Formations organisées" value={nf(kpis.courses.value)} delta={kpis.courses.delta} extraSuffix={vs} />
        <KpiCard icon={Home} iconClassName="bg-pink-100 text-pink-600" label="Familles" value={nf(kpis.families.value)} delta={kpis.families.delta} extraSuffix="depuis le début" />
        <KpiCard icon={Building2} iconClassName="bg-indigo-100 text-indigo-600" label="Salles utilisées" value={`${kpis.roomsUsed.value}%`} delta={kpis.roomsUsed.delta} deltaSuffix=" pt" extraSuffix={vs} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel title="Évolution des présences" className="xl:col-span-5">
          <StatsAttendanceChart data={attendance} />
        </Panel>
        <Panel title="Répartition des membres par tranche d'âge" className="xl:col-span-4">
          <StatsDonut
            centerLabel="Membres"
            emptyMessage="Aucun membre actif avec une date de naissance renseignée."
            rows={ages.rows.map((r, i) => ({
              key: r.bucket,
              label: r.bucket === "61+" ? "61 ans +" : `${r.bucket.replace("-", " - ")} ans`,
              value: r.value,
              color: ageColors[i]!,
            }))}
          />
          {ages.unknown > 0 && <p className="mt-3 text-xs text-slate-400">{ages.unknown} membre(s) sans date de naissance ne sont pas répartis.</p>}
        </Panel>
        <Panel title="Répartition des membres par groupe" className="xl:col-span-3">
          <StatsDonut
            stacked
            centerLabel="Personnes"
            rows={[
              { key: "adults", label: "Adultes", value: people.adults, color: "#3B82F6" },
              { key: "youth", label: "Jeunes", value: people.youth, color: "#A855F7" },
              { key: "children", label: "Enfants", value: people.children, color: "#F59E0B" },
              { key: "workers", label: "Ouvriers", value: people.workers, color: "#16A34A" },
              { key: "visitors", label: "Visiteurs suivis", value: people.visitors, color: "#94A3B8" },
            ]}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel title="Activités principales" className="xl:col-span-4">
          <StatsBarChart
            valueLabels
            tooltipLabel="Événements"
            data={activities.map((a, i) => ({ label: a.name, value: a.value, color: PALETTE[i % PALETTE.length] }))}
          />
        </Panel>
        <Panel title="Dons et offrandes" className="xl:col-span-5">
          {giving ? (
            <>
              <StatsBarChart compactAxis tooltipLabel="Dons" tooltipSuffix=" F CFA" data={giving.byMonth.map((m) => ({ label: monthLabel(m.month), value: m.value }))} />
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-[11px] text-slate-500">Total des dons</p>
                  <p className="text-sm font-bold text-navy">{formatAmount(giving.total)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-[11px] text-slate-500">Moyenne mensuelle</p>
                  <p className="text-sm font-bold text-navy">{formatAmount(giving.monthlyAverage)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-[11px] text-slate-500">{vs}</p>
                  <p className={giving.delta >= 0 ? "text-sm font-bold text-success" : "text-sm font-bold text-danger"}>
                    {giving.delta >= 0 ? "▲ +" : "▼ "}
                    {giving.delta}%
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="flex h-[200px] items-center justify-center text-center text-sm text-slate-400">Réservé aux rôles ayant accès aux finances.</p>
          )}
        </Panel>
        <Panel title="Utilisation des salles" className="xl:col-span-3">
          {rooms.length === 0 ? (
            <p className="flex h-[200px] items-center justify-center text-center text-sm text-slate-400">Aucune salle enregistrée.</p>
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {rooms.map((r, i) => (
                  <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-2 text-xs">
                    <span className="truncate text-slate-600">{r.name}</span>
                    <span className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: ROOM_BAR_COLORS[i % ROOM_BAR_COLORS.length] }} />
                    </span>
                    <span className="w-9 text-right font-semibold text-navy">{r.pct}%</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-slate-400">Jours avec une réservation confirmée ÷ jours écoulés de la période.</p>
            </>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel
          title="Top 5 des événements"
          className="xl:col-span-3"
          action={
            <Link href="/events" className="text-xs font-medium text-primary hover:underline">
              Voir tout
            </Link>
          }
        >
          {topEvents.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Aucun événement sur cette période.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="pb-2 pr-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Événement</th>
                  <th className="pb-2 text-right font-medium">Participants</th>
                </tr>
              </thead>
              <tbody>
                {topEvents.map((e, i) => (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-2 text-slate-400">{i + 1}</td>
                    <td className="max-w-0 truncate py-2 pr-2 text-navy">
                      <Link href={`/events/${e.id}`} className="hover:underline">
                        {e.title}
                      </Link>
                    </td>
                    <td className="py-2 text-right font-semibold text-navy">{nf(e.participants)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Nouveaux membres" className="xl:col-span-3">
          <StatsBarChart color="#A855F7" height={170} tooltipLabel="Nouveaux membres" data={newMembers.map((m) => ({ label: monthLabel(m.month), value: m.value }))} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 p-2.5">
              <p className="text-lg font-bold text-navy">{nf(totalNewMembers)}</p>
              <p className="text-[11px] text-slate-500">Nouveaux membres</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <p className={kpis.newMembers.delta >= 0 ? "text-lg font-bold text-success" : "text-lg font-bold text-danger"}>
                {kpis.newMembers.delta >= 0 ? "+" : ""}
                {kpis.newMembers.delta}%
              </p>
              <p className="text-[11px] text-slate-500">{vs}</p>
            </div>
          </div>
        </Panel>
        <Panel title="Statut des réservations de salles" className="xl:col-span-3">
          <StatsDonut stacked centerLabel="Réservations" rows={reservationRows} emptyMessage="Aucune réservation sur cette période." />
        </Panel>
        <Panel title="Engagement et communication" className="xl:col-span-3">
          <ul>
            <DeltaRow label="Messages envoyés" kpi={engagement.messagesSent} />
            <DeltaRow label="Destinataires uniques" kpi={engagement.recipients} />
            <DeltaRow label="Annonces publiées" kpi={engagement.announcementsPublished} />
            <DeltaRow label="Publications réseaux sociaux" kpi={engagement.socialPosts} />
            <DeltaRow label="Lectures d'annonces" kpi={engagement.announcementReads} />
          </ul>
        </Panel>
      </div>
    </div>
  );
}
