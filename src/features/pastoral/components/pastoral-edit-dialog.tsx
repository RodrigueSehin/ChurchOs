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
import { updatePastoralFollowup, type PastoralActionState } from "@/features/pastoral/actions";
import { PastoralFormFields } from "@/features/pastoral/components/pastoral-form-fields";
import type { pastoralFollowups } from "@/lib/db/schema";

const initialState: PastoralActionState = {};

export function PastoralEditDialog({
  followup,
  people,
  assignableUsers,
}: {
  followup: typeof pastoralFollowups.$inferSelect;
  people: { id: string; name: string }[];
  assignableUsers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const boundAction = updatePastoralFollowup.bind(null, followup.id);
  const [state, formAction, pending] = useActionState(async (prev: PastoralActionState, formData: FormData) => {
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
          <DialogTitle>Modifier le suivi</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <PastoralFormFields followup={followup} people={people} assignableUsers={assignableUsers} idPrefix="edit-pastoral" />
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
