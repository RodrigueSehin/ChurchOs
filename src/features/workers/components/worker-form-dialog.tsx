"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

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
import type { WorkerActionState } from "@/features/workers/actions";
import { WORKER_STATUS_LABELS, skillsToText } from "@/features/workers/schemas";
import type { getWorkers } from "@/features/workers/queries";

const initialState: WorkerActionState = {};

type WorkerRow = Awaited<ReturnType<typeof getWorkers>>["rows"][number];

export function WorkerFormDialog({
  action,
  people,
  worker,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  action: (prev: WorkerActionState, formData: FormData) => Promise<WorkerActionState>;
  people: { id: string; name: string }[];
  worker?: WorkerRow;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [state, formAction, pending] = useActionState(async (prev: WorkerActionState, formData: FormData) => {
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
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Nouvel ouvrier
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{worker ? `Modifier ${worker.firstName} ${worker.lastName}` : "Nouvel ouvrier"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          {!worker && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="worker-personId">Personne *</Label>
              <FormSelect id="worker-personId" name="personId" required defaultValue="">
                <option value="" disabled>
                  Choisir une personne
                </option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </FormSelect>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="worker-workerNumber">Numéro (optionnel)</Label>
              <Input id="worker-workerNumber" name="workerNumber" defaultValue={worker?.workerNumber ?? ""} placeholder="Ex : OUV-001" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="worker-status">Statut</Label>
              <FormSelect id="worker-status" name="status" defaultValue={worker?.status ?? "active"}>
                {Object.entries(WORKER_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="worker-skills">Compétences (optionnel, séparées par des virgules)</Label>
            <Input id="worker-skills" name="skills" defaultValue={skillsToText(worker?.skills)} placeholder="Ex : Sonorisation, Chant, Accueil" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="worker-notes">Notes (optionnel)</Label>
            <textarea
              id="worker-notes"
              name="notes"
              rows={3}
              defaultValue={worker?.notes ?? ""}
              className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : worker ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
