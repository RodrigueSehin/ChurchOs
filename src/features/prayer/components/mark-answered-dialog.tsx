"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { markPrayerAnswered, type PrayerActionState } from "@/features/prayer/actions";

const initialState: PrayerActionState = {};

export function MarkAnsweredDialog({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const boundAction = markPrayerAnswered.bind(null, id);
  const [state, formAction, pending] = useActionState(async (prev: PrayerActionState, formData: FormData) => {
    const result = await boundAction(prev, formData);
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <CheckCircle2 className="size-4" />
        Marquer comme exaucé
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prière exaucée</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="answerTestimony">Témoignage (optionnel)</Label>
            <textarea
              id="answerTestimony"
              name="answerTestimony"
              rows={4}
              placeholder="Comment cette prière a-t-elle été exaucée ?"
              className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
