"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteService, updateService } from "@/features/services/actions";
import { ServiceFormDialog } from "@/features/services/components/service-form-dialog";
import { ServiceAssignmentsDialog } from "@/features/services/components/service-assignments-dialog";
import type { getServiceAssignments, getServiceTypes, getServicesList } from "@/features/services/queries";

type ServiceRow = Awaited<ReturnType<typeof getServicesList>>["rows"][number];
type ServiceType = Awaited<ReturnType<typeof getServiceTypes>>[number];

export function ServiceRowActions({
  service,
  assignments,
  types,
  workers,
  canManage,
  isAdmin,
}: {
  service: ServiceRow;
  assignments: Awaited<ReturnType<typeof getServiceAssignments>>;
  types: ServiceType[];
  workers: { id: string; name: string }[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteService(service.id);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Actions" disabled={isPending}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setAssignmentsOpen(true)}>
            <Users className="size-4" />
            Affectations ({assignments.length})
          </DropdownMenuItem>
          {canManage && (
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Modifier
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-danger">
              <Trash2 className="size-4" />
              Supprimer
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ServiceAssignmentsDialog
        serviceId={service.id}
        serviceTitle={service.title}
        assignments={assignments}
        workers={workers}
        canManage={canManage}
        isAdmin={isAdmin}
        trigger={<span className="hidden" />}
        open={assignmentsOpen}
        onOpenChange={setAssignmentsOpen}
      />

      {canManage && (
        <ServiceFormDialog
          action={updateService.bind(null, service.id)}
          types={types}
          service={service}
          trigger={<span className="hidden" />}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      {isAdmin && (
        <ConfirmDialog
          trigger={<span className="hidden" />}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Supprimer ce service ?"
          description={`« ${service.title} » et ses affectations seront définitivement supprimés.`}
          confirmLabel="Supprimer"
          variant="destructive"
          onConfirm={handleDelete}
        />
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
