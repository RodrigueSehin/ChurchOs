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
import { updatePrayerRequest, type PrayerActionState } from "@/features/prayer/actions";
import { PrayerFormFields } from "@/features/prayer/components/prayer-form-fields";
import type { prayerRequests } from "@/lib/db/schema";

const initialState: PrayerActionState = {};

export function PrayerEditDialog({
  request,
  people,
  assignableUsers,
}: {
  request: typeof prayerRequests.$inferSelect;
  people: { id: string; name: string }[];
  assignableUsers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const boundAction = updatePrayerRequest.bind(null, request.id);
  const [state, formAction, pending] = useActionState(async (prev: PrayerActionState, formData: FormData) => {
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
          <DialogTitle>Modifier le sujet de prière</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <PrayerFormFields request={request} people={people} assignableUsers={assignableUsers} idPrefix="edit-prayer" />
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
