import { Warehouse } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { getResourceReservations, getResources } from "@/features/resources/queries";
import { createResource } from "@/features/resources/actions";
import { ResourceFormDialog } from "@/features/resources/components/resource-form-dialog";
import { ResourceRow } from "@/features/resources/components/resource-row";

export default async function ResourcesPage() {
  const check = await checkPermission("resources.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Salles & équipements" description="Salles, équipements, véhicules, matériels et réservations." />
        <PermissionDenied requiredPermission="resources.view" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  const canManage = check.context.isAdmin || check.context.permissions.has("resources.manage");
  const canReserve = check.context.isAdmin || check.context.permissions.has("resources.reserve");

  const resources = await getResources(organizationId);
  const reservationsByResource: Record<string, Awaited<ReturnType<typeof getResourceReservations>>> = {};
  await Promise.all(
    resources.map(async (r) => {
      reservationsByResource[r.id] = await getResourceReservations(organizationId, r.id);
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Salles & équipements"
        description="Salles, équipements, véhicules, matériels et réservations."
        actions={canManage ? <ResourceFormDialog action={createResource} /> : undefined}
      />

      <Card>
        <CardContent className="pt-5">
          {resources.length === 0 ? (
            <EmptyState icon={Warehouse} title="Aucune ressource" description="Créez la première salle ou le premier équipement." className="border-0" />
          ) : (
            <div className="flex flex-col gap-2">
              {resources.map((resource) => (
                <ResourceRow
                  key={resource.id}
                  resource={resource}
                  reservations={reservationsByResource[resource.id] ?? []}
                  currentUserId={check.user.id}
                  canManage={canManage}
                  canReserve={canReserve}
                  isAdmin={check.context.isAdmin}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
