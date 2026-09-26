import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServiceAssignments } from "@/features/services/queries";
import type { getServices, getServiceTypes } from "@/features/services/queries";
import { updateService } from "@/features/services/actions";
import { ServiceFormDialog } from "@/features/services/components/service-form-dialog";
import { ServiceAssignmentsDialog } from "@/features/services/components/service-assignments-dialog";
import { DeleteServiceButton } from "@/features/services/components/delete-service-button";
import { SERVICE_STATUS_LABELS } from "@/features/services/schemas";

type Service = Awaited<ReturnType<typeof getServices>>[number];
type ServiceType = Awaited<ReturnType<typeof getServiceTypes>>[number];

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  planned: "secondary",
  confirmed: "success",
  completed: "success",
  cancelled: "danger",
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" }).format(new Date(value));
}

export async function ServiceRow({
  organizationId,
  service,
  types,
  workers,
  canManage,
  isAdmin,
}: {
  organizationId: string;
  service: Service;
  types: ServiceType[];
  workers: { id: string; name: string }[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  const assignments = await getServiceAssignments(organizationId, service.id);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-navy">{service.title}</p>
          <Badge variant={STATUS_VARIANT[service.status] ?? "secondary"}>{SERVICE_STATUS_LABELS[service.status] ?? service.status}</Badge>
          {service.serviceTypeName && <Badge variant="secondary">{service.serviceTypeName}</Badge>}
        </div>
        <p className="text-sm text-slate-400">
          {formatDateTime(service.startsAt)}
          {service.location ? ` · ${service.location}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ServiceAssignmentsDialog
          serviceId={service.id}
          serviceTitle={service.title}
          assignments={assignments}
          workers={workers}
          canManage={canManage}
          isAdmin={isAdmin}
        />
        {canManage && (
          <ServiceFormDialog
            action={updateService.bind(null, service.id)}
            types={types}
            service={service}
            trigger={
              <Button type="button" variant="secondary" size="sm">
                <Pencil className="size-4" />
                Modifier
              </Button>
            }
          />
        )}
        {isAdmin && <DeleteServiceButton serviceId={service.id} serviceTitle={service.title} />}
      </div>
    </div>
  );
}
