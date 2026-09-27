"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateResource } from "@/features/resources/actions";
import { RESOURCE_STATUS_LABELS, RESOURCE_TYPE_LABELS } from "@/features/resources/schemas";
import { ResourceFormDialog } from "@/features/resources/components/resource-form-dialog";
import { DeleteResourceButton } from "@/features/resources/components/delete-resource-button";
import { ReservationPanel } from "@/features/resources/components/reservation-panel";
import type { getResourceReservations, getResources } from "@/features/resources/queries";

type Resource = Awaited<ReturnType<typeof getResources>>[number];
type Reservation = Awaited<ReturnType<typeof getResourceReservations>>[number];

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning"> = {
  available: "success",
  maintenance: "warning",
  retired: "secondary",
};

export function ResourceRow({
  resource,
  reservations,
  currentUserId,
  canManage,
  canReserve,
  isAdmin,
}: {
  resource: Resource;
  reservations: Reservation[];
  currentUserId: string;
  canManage: boolean;
  canReserve: boolean;
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setExpanded((v) => !v)}>
          <span className="truncate text-sm font-medium text-navy">{resource.name}</span>
          <Badge variant="secondary" className="text-[10px]">
            {RESOURCE_TYPE_LABELS[resource.type] ?? resource.type}
          </Badge>
          <Badge variant={STATUS_VARIANT[resource.status] ?? "secondary"} className="text-[10px]">
            {RESOURCE_STATUS_LABELS[resource.status] ?? resource.status}
          </Badge>
          {resource.location && <span className="truncate text-xs text-slate-400">{resource.location}</span>}
        </button>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">Qté {resource.quantity}</span>
          {canManage && (
            <ResourceFormDialog
              action={updateResource.bind(null, resource.id)}
              resource={resource}
              trigger={
                <Button type="button" variant="ghost" size="sm">
                  <Pencil className="size-4" />
                </Button>
              }
            />
          )}
          {isAdmin && <DeleteResourceButton resourceId={resource.id} resourceName={resource.name} />}
        </div>
      </div>
      {expanded && (
        <ReservationPanel
          resourceId={resource.id}
          reservations={reservations}
          currentUserId={currentUserId}
          canManage={canManage}
          canReserve={canReserve}
        />
      )}
    </div>
  );
}
