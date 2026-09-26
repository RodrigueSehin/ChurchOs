import { ListChecks } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { SearchBox } from "@/components/shared/search-box";
import { Card } from "@/components/ui/card";
import { getPlanningSlots } from "@/features/planning/queries";
import { getActiveWorkersForSelect } from "@/features/workers/services";
import { createPlanningSlot } from "@/features/planning/actions";
import { PlanningFormDialog } from "@/features/planning/components/planning-form-dialog";
import { PlanningTable } from "@/features/planning/components/planning-table";

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const check = await checkPermission("planning.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Plannings" description="Créneaux de service et affectation des ouvriers." />
        <PermissionDenied requiredPermission="planning.view" />
      </div>
    );
  }

  const params = await searchParams;
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("planning.create") || check.context.isAdmin;
  const canUpdate = check.context.permissions.has("planning.update") || check.context.isAdmin;

  const [rows, workers] = await Promise.all([
    getPlanningSlots({ organizationId, search: params.q }),
    getActiveWorkersForSelect(organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Plannings"
        description="Créneaux de service et affectation des ouvriers — les conflits d'horaire sont détectés automatiquement."
        actions={canCreate ? <PlanningFormDialog action={createPlanningSlot} workers={workers} /> : undefined}
      />

      <SearchBox initialValue={params.q ?? ""} placeholder="Rechercher un créneau..." />

      <Card>
        {rows.length === 0 ? (
          params.q ? (
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
