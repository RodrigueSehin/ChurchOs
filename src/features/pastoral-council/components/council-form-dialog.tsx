"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCouncil, updateCouncil, type CouncilActionState } from "@/features/pastoral-council/actions";
import { CouncilFormFields } from "@/features/pastoral-council/components/council-form-fields";
import type { pastoralCouncils } from "@/lib/db/schema";

const initialState: CouncilActionState = {};

export function CouncilFormDialog({ council }: { council?: typeof pastoralCouncils.$inferSelect }) {
  const [open, setOpen] = useState(false);
  const boundAction = council ? updateCouncil.bind(null, council.id) : createCouncil;
  const [state, formAction, pending] = useActionState(async (prev: CouncilActionState, formData: FormData) => {
    const result = await boundAction(prev, formData);
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {council ? (
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="size-4" />
          Modifier
        </Button>
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Nouvelle réunion
        </Button>
      )}
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{council ? "Modifier la réunion" : "Nouvelle réunion du conseil pastoral"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <CouncilFormFields council={council} idPrefix={council ? `edit-council-${council.id}` : "new-council"} />
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
