"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PlanningActionState } from "@/features/planning/actions";
import { PlanningFormFields } from "@/features/planning/components/planning-form-fields";
import type { getPlanningSlots } from "@/features/planning/queries";

const initialState: PlanningActionState = {};

type SlotRow = Awaited<ReturnType<typeof getPlanningSlots>>[number];

export function PlanningFormDialog({
  action,
  workers,
  slot,
  trigger,
}: {
  action: (prev: PlanningActionState, formData: FormData) => Promise<PlanningActionState>;
  workers: { id: string; name: string }[];
  slot?: SlotRow;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: PlanningActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Nouveau créneau
        </Button>
      )}
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{slot ? `Modifier ${slot.title}` : "Nouveau créneau de planning"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <PlanningFormFields slot={slot} workers={workers} idPrefix={slot ? `edit-planning-${slot.id}` : "new-planning"} />
          {state.error && (
            <p className="flex items-start gap-1.5 text-sm text-danger">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : slot ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
