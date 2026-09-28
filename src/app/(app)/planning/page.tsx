import { CalendarClock, CheckCircle2, Clock, ListChecks } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { SearchBox } from "@/components/shared/search-box";
import { Card } from "@/components/ui/card";
import { getPlanningKpis, getPlanningSlots, getPlanningTabCounts } from "@/features/planning/queries";
import { getActiveWorkersForSelect } from "@/features/workers/services";
import { createPlanningSlot } from "@/features/planning/actions";
import { PlanningFormDialog } from "@/features/planning/components/planning-form-dialog";
import { PlanningTabs } from "@/features/planning/components/planning-tabs";
import { PlanningTable } from "@/features/planning/components/planning-table";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const check = await checkPermission("planning.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Plannings"
          description="Créneaux de service et affectation des ouvriers."
          quote="Il y a un temps pour chaque chose sous les cieux."
          verseRef="Ecclésiaste 3:1"
        />
        <PermissionDenied requiredPermission="planning.view" />
      </div>
    );
  }

  const params = await searchParams;
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("planning.create") || check.context.isAdmin;
  const canUpdate = check.context.permissions.has("planning.update") || check.context.isAdmin;

  const [kpis, tabCounts, rows, workers] = await Promise.all([
    getPlanningKpis(organizationId),
    getPlanningTabCounts(organizationId),
    getPlanningSlots({ organizationId, search: params.q, status: params.status }),
    getActiveWorkersForSelect(organizationId),
  ]);

  const hasFilters = Boolean(params.q || params.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Plannings"
        description="Créneaux de service et affectation des ouvriers — les conflits d'horaire sont détectés automatiquement."
        quote="Il y a un temps pour chaque chose sous les cieux."
        verseRef="Ecclésiaste 3:1"
        cta={{ icon: CalendarClock, line1: "Un temps pour chaque chose,", line2: "et chaque chose en son temps." }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard icon={ListChecks} iconClassName="bg-blue-100 text-blue-600" label="Créneaux" value={n(kpis.total)} periodLabel="au total" />
        <KpiCard icon={CheckCircle2} iconClassName="bg-green-100 text-green-600" label="Confirmés" value={n(kpis.confirmed)} periodLabel="au total" />
        <KpiCard icon={Clock} iconClassName="bg-amber-100 text-amber-600" label="En attente" value={n(kpis.pending)} periodLabel="au total" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PlanningTabs activeStatus={params.status ?? ""} counts={tabCounts} />
        {canCreate && <PlanningFormDialog action={createPlanningSlot} workers={workers} />}
      </div>

      <SearchBox initialValue={params.q ?? ""} placeholder="Rechercher un créneau..." />

      <Card>
        {rows.length === 0 ? (
          hasFilters ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState icon={ListChecks} title="Aucun créneau" description="Créez le premier créneau de planning." className="border-0" />
          )
        ) : (
          <PlanningTable rows={rows} workers={workers} canUpdate={canUpdate} isAdmin={check.context.isAdmin} />
        )}
      </Card>
    </div>
  );
}
