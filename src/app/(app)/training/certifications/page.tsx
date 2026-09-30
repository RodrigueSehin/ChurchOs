import { Award, BookOpen, TrendingUp, Users } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCertificationStats,
  getCertificationsByProgram,
  getCertificationsList,
  getCoursesForSelect,
  getPersonIdForUser,
  getRecentCertifications,
} from "@/features/training/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { CertificationFormDialog } from "@/features/training/components/certification-form-dialog";
import { CertificationStatusBadge } from "@/features/training/components/certification-status-badge";
import { CertificationsTable } from "@/features/training/components/certifications-table";
import { CertificationsToolbar } from "@/features/training/components/certifications-toolbar";
import { DonutChart } from "@/features/training/components/donut-chart";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatDate(value: string | null) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

const HERO = {
  title: "Certifications",
  description: "Suivez les certifications et les reconnaissances des membres de votre église.",
  quote: "Reste ferme dans ce que tu as appris et dont tu as été convaincu.",
  verseRef: "2 Timothée 3:14",
};

export default async function CertificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const check = await checkPermission("training.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero {...HERO} />
        <PermissionDenied requiredPermission="training.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = ["pending", "obtained", "expired"].includes(params.status ?? "") ? (params.status as string) : "";
  const organizationId = check.organization.organization.id;
  const canCertify = check.context.isAdmin || check.context.permissions.has("training.certify");
  const canSeeAll = canCertify || check.context.permissions.has("training.manage");

  const personId = await getPersonIdForUser(organizationId, check.user.email);
  const viewer = { canSeeAll, personId };

  const [stats, list, byProgram, recent, people, courses] = await Promise.all([
    getCertificationStats(organizationId, viewer),
    getCertificationsList({ organizationId, viewer, search: params.q, status, page }),
    getCertificationsByProgram(organizationId, viewer),
    getRecentCertifications(organizationId, viewer, 3),
    canCertify ? getPeopleForSelect(organizationId) : Promise.resolve([]),
    canCertify ? getCoursesForSelect(organizationId) : Promise.resolve([]),
  ]);

  const counts = { all: stats.total, pending: stats.pending, obtained: stats.obtained, expired: stats.expired };
  const pct = (value: number) => (stats.total === 0 ? 0 : Math.round((value / stats.total) * 100));
  const bars = [
    { label: "Obtenues", value: stats.obtained, color: "bg-success" },
    { label: "En cours", value: stats.pending, color: "bg-amber-400" },
    { label: "Expirées", value: stats.expired, color: "bg-danger" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        {...HERO}
        actions={
          canCertify ? (
            <CertificationFormDialog organizationId={organizationId} people={people} courses={courses} />
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Award}
          iconClassName="bg-purple-100 text-purple-600"
          label="Certifications délivrées"
          value={n(stats.total)}
          delta={stats.yearDeltaPct ?? undefined}
          periodLabel="vs année précédente"
        />
        <KpiCard icon={Users} iconClassName="bg-green-100 text-green-600" label="Membres certifiés" value={n(stats.members)} />
        <KpiCard icon={BookOpen} iconClassName="bg-amber-100 text-amber-600" label="Programmes de certification" value={n(stats.programs)} />
        <KpiCard
          icon={TrendingUp}
          iconClassName="bg-blue-100 text-blue-600"
          label="Taux de réussite"
          value={`${stats.successRate}%`}
          periodLabel="certifications obtenues"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-5">
            <CertificationsToolbar status={status} initialSearch={params.q ?? ""} counts={counts} />
            {list.rows.length === 0 ? (
              params.q || status ? (
                <NoResultsState className="border-0" />
              ) : (
                <EmptyState icon={Award} title="Aucune certification" description="Enregistrez la première certification d'un membre." className="border-0" />
              )
            ) : (
              <CertificationsTable rows={list.rows} isAdmin={check.context.isAdmin && canCertify} />
            )}
            <Pagination
              page={page}
              pageSize={list.pageSize}
              total={list.total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (status) sp.set("status", status);
                sp.set("page", String(p));
                return `/training/certifications?${sp.toString()}`;
              }}
            />
          </CardContent>
        </Card>

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Répartition par programme</CardTitle>
            </CardHeader>
            <CardContent>
              {byProgram.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune donnée pour le moment.</p>
              ) : (
                <DonutChart data={byProgram} centerLabel="Certifications" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statut des certifications</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {bars.map((b) => (
                <div key={b.label} className="grid grid-cols-[70px_minmax(0,1fr)_70px] items-center gap-3 text-sm">
                  <span className="text-slate-600">{b.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${b.color}`} style={{ width: `${pct(b.value)}%` }} />
                  </div>
                  <span className="text-right text-xs text-slate-500">{b.value} ({pct(b.value)}%)</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Certifications récentes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {recent.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune certification.</p>
              ) : (
                recent.map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <Avatar className="size-10">
                      {r.photoUrl && <AvatarImage src={r.photoUrl} alt="" />}
                      <AvatarFallback>{`${r.firstName[0] ?? ""}${r.lastName[0] ?? ""}`.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy">{r.firstName} {r.lastName}</p>
                      <p className="truncate text-xs text-slate-500">{r.name}</p>
                      <p className="text-xs text-slate-400">{formatDate(r.issuedAt)}</p>
                    </div>
                    <CertificationStatusBadge status={r.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
