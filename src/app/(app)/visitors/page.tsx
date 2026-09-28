import { CalendarCheck, HeartHandshake, Repeat, UserCheck, UserPlus } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Card } from "@/components/ui/card";
import {
  getVisitors,
  getVisitorsConvertedKpi,
  getVisitorSources,
  getVisitorsKpi,
  getVisitorsStatusKpis,
  getVisitorsTabCounts,
} from "@/features/visitors/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { createVisitor } from "@/features/visitors/actions";
import { VisitorsTable } from "@/features/visitors/components/visitors-table";
import { VisitorsFilters } from "@/features/visitors/components/visitors-filters";
import { VisitorsTabs } from "@/features/visitors/components/visitors-tabs";
import { VisitorFormDialog } from "@/features/visitors/components/visitor-form-dialog";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function VisitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; source?: string; page?: string }>;
}) {
  const check = await checkPermission("members.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Visiteurs"
          description="Accueillez, suivez et accompagnez vos visiteurs avec amour et efficacité."
          quote="N'oubliez pas l'hospitalité, car c'est par elle que quelques-uns, à leur insu, ont logé des anges."
          verseRef="Hébreux 13:2"
        />
        <PermissionDenied requiredPermission="members.view" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("members.create") || check.context.isAdmin;

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [visitorsKpi, statusKpis, convertedKpi, tabCounts, sources, inviters] = await Promise.all([
    getVisitorsKpi(organizationId),
    getVisitorsStatusKpis(organizationId),
    getVisitorsConvertedKpi(organizationId),
    getVisitorsTabCounts(organizationId),
    getVisitorSources(organizationId),
    canCreate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
  ]);

  const { rows, total, pageSize } = await getVisitors({
    organizationId,
    search: params.q,
    status: params.status,
    source: params.source,
    page,
  });

  const hasFilters = Boolean(params.q || params.status || params.source);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Visiteurs"
        description="Accueillez, suivez et accompagnez vos visiteurs avec amour et efficacité."
        quote="N'oubliez pas l'hospitalité, car c'est par elle que quelques-uns, à leur insu, ont logé des anges."
        verseRef="Hébreux 13:2"
        cta={{ icon: HeartHandshake, line1: "Chaque visiteur compte !", line2: "Accueillir aujourd'hui, bâtir demain." }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={UserPlus}
          iconClassName="bg-green-100 text-green-600"
          label="Visiteurs"
          value={n(visitorsKpi.value)}
          delta={visitorsKpi.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={CalendarCheck}
          iconClassName="bg-blue-100 text-blue-600"
          label="Premières visites"
          value={n(statusKpis.firstVisit.value)}
          delta={statusKpis.firstVisit.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={Repeat}
          iconClassName="bg-purple-100 text-purple-600"
          label="Visites répétées"
          value={n(statusKpis.repeat.value)}
          delta={statusKpis.repeat.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={UserCheck}
          iconClassName="bg-amber-100 text-amber-600"
          label="En cours de suivi"
          value={n(statusKpis.followUp.value)}
          delta={statusKpis.followUp.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={HeartHandshake}
          iconClassName="bg-pink-100 text-pink-600"
          label="Convertis en membres"
          value={n(convertedKpi.value)}
          delta={convertedKpi.deltaPct}
          periodLabel="ce mois-ci"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <VisitorsTabs activeStatus={params.status ?? ""} counts={tabCounts} />
        {canCreate && <VisitorFormDialog action={createVisitor} inviters={inviters} />}
      </div>

      <VisitorsFilters
        initialSearch={params.q ?? ""}
        initialStatus={params.status ?? ""}
        initialSource={params.source ?? ""}
        sources={sources}
      />

      <Card>
        {rows.length === 0 ? (
          hasFilters ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState icon={UserPlus} title="Aucun visiteur" description="Enregistrez le premier visiteur de votre église." className="border-0" />
          )
        ) : (
          <>
            <VisitorsTable rows={rows} canConvert={canCreate} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.status) sp.set("status", params.status);
                if (params.source) sp.set("source", params.source);
                sp.set("page", String(p));
                return `/visitors?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
