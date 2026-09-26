"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateVisit, type VisitActionState } from "@/features/visits/actions";
import { VisitFormFields } from "@/features/visits/components/visit-form-fields";
import type { getVisits } from "@/features/visits/queries";

type Row = Awaited<ReturnType<typeof getVisits>>["rows"][number];

const initialState: VisitActionState = {};

export function VisitEditDialog({
  visit,
  people,
  assignableUsers,
}: {
  visit: Row;
  people: { id: string; name: string }[];
  assignableUsers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const boundAction = updateVisit.bind(null, visit.id);
  const [state, formAction, pending] = useActionState(async (prev: VisitActionState, formData: FormData) => {
    const result = await boundAction(prev, formData);
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
        Modifier
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la visite</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <VisitFormFields visit={visit} people={people} assignableUsers={assignableUsers} idPrefix={`edit-visit-${visit.id}`} />
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
