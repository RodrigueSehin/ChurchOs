import { CalendarClock } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { getServiceTypes, getServices } from "@/features/services/queries";
import { getActiveWorkersForSelect } from "@/features/workers/services";
import { createService } from "@/features/services/actions";
import { ServiceFormDialog } from "@/features/services/components/service-form-dialog";
import { ServiceTypeManager } from "@/features/services/components/service-type-manager";
import { ServiceRow } from "@/features/services/components/service-row";

export default async function ServicesPage() {
  const check = await checkPermission("services.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Services" description="Les cultes et services de votre église." />
        <PermissionDenied requiredPermission="services.view" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  const canManage = check.context.isAdmin || check.context.permissions.has("services.create") || check.context.permissions.has("services.update");

  const [services, types, workers] = await Promise.all([
    getServices(organizationId),
    getServiceTypes(organizationId),
    getActiveWorkersForSelect(organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Services"
        description="Les cultes et services de votre église, avec affectation des ouvriers."
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <ServiceTypeManager types={types} />
              <ServiceFormDialog action={createService} types={types} />
            </div>
          ) : undefined
        }
      />

      {services.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Aucun service" description="Créez le premier service de votre église." />
      ) : (
        <div className="flex flex-col gap-3">
          {services.map((service) => (
            <ServiceRow
              key={service.id}
              organizationId={organizationId}
              service={service}
              types={types}
              workers={workers}
              canManage={canManage}
              isAdmin={check.context.isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
