"use client";

import { useActionState, useState, useTransition } from "react";
import { AlertTriangle, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  addServiceAssignment,
  removeServiceAssignment,
  updateServiceAssignmentStatus,
  type ServiceActionState,
} from "@/features/services/actions";
import { ASSIGNMENT_STATUS_LABELS } from "@/features/services/schemas";
import type { getServiceAssignments } from "@/features/services/queries";

type Assignment = Awaited<ReturnType<typeof getServiceAssignments>>[number];

const initialState: ServiceActionState = {};

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  assigned: "secondary",
  confirmed: "success",
  declined: "danger",
  completed: "success",
  cancelled: "secondary",
};

export function ServiceAssignmentsDialog({
  serviceId,
  serviceTitle,
  assignments,
  workers,
  canManage,
  isAdmin,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  serviceId: string;
  serviceTitle: string;
  assignments: Assignment[];
  workers: { id: string; name: string }[];
  canManage: boolean;
  isAdmin: boolean;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const boundAdd = addServiceAssignment.bind(null, serviceId);
  const [state, formAction, pending] = useActionState(boundAdd, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Users className="size-4" />
          Affectations ({assignments.length})
        </Button>
      )}
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Affectations — {serviceTitle}</DialogTitle>
        </DialogHeader>

        {assignments.length === 0 ? (
          <EmptyState icon={Users} title="Aucune affectation" description="Affectez des ouvriers à ce service." />
        ) : (
          <div className="flex flex-col gap-2">
            {assignments.map((a) => (
              <AssignmentRow key={a.id} assignment={a} canManage={canManage} isAdmin={isAdmin} />
            ))}
          </div>
        )}

        {canManage && (
          <form action={formAction} className="flex flex-col gap-4 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assignment-workerId">Ouvrier *</Label>
                <FormSelect id="assignment-workerId" name="workerId" required defaultValue="">
                  <option value="" disabled>
                    Choisir un ouvrier
                  </option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assignment-role">Rôle *</Label>
                <Input id="assignment-role" name="role" placeholder="Ex : Sonorisation" required />
              </div>
            </div>
            {state.error && (
              <p className="flex items-start gap-1.5 text-sm text-danger">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {state.error}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Affectation..." : "Affecter"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AssignmentRow({ assignment, canManage, isAdmin }: { assignment: Assignment; canManage: boolean; isAdmin: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatusChange(status: string) {
    startTransition(async () => {
      const res = await updateServiceAssignmentStatus(assignment.id, status);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const res = await removeServiceAssignment(assignment.id);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-navy">
            {assignment.firstName} {assignment.lastName}
          </p>
          <p className="text-xs text-slate-400">{assignment.role}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canManage ? (
            <FormSelect value={assignment.status} disabled={isPending} onChange={(e) => handleStatusChange(e.target.value)} className="w-auto sm:max-w-[150px]">
              {Object.entries(ASSIGNMENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FormSelect>
          ) : (
            <Badge variant={STATUS_VARIANT[assignment.status] ?? "secondary"}>{ASSIGNMENT_STATUS_LABELS[assignment.status] ?? assignment.status}</Badge>
          )}
          {isAdmin && (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="ghost" size="sm" disabled={isPending} className="text-danger hover:bg-danger/10">
                  Retirer
                </Button>
              }
              title="Retirer cette affectation ?"
              description={`${assignment.firstName} ${assignment.lastName} sera retiré(e) de ce service.`}
              confirmLabel="Retirer"
              variant="destructive"
              onConfirm={handleRemove}
            />
          )}
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
