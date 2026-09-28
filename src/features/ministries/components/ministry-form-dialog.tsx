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
import type { MinistryActionState } from "@/features/ministries/actions";
import { MINISTRY_STATUS_LABELS } from "@/features/ministries/schemas";
import type { ministries } from "@/lib/db/schema";

const initialState: MinistryActionState = {};

export function MinistryFormDialog({
  action,
  people,
  categories = [],
  ministry,
  trigger,
}: {
  action: (prev: MinistryActionState, formData: FormData) => Promise<MinistryActionState>;
  people: { id: string; name: string }[];
  categories?: string[];
  ministry?: typeof ministries.$inferSelect;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: MinistryActionState, formData: FormData) => {
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
          Nouveau ministère
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ministry ? `Modifier ${ministry.name}` : "Nouveau ministère"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ministry-name">Nom *</Label>
              <Input id="ministry-name" name="name" defaultValue={ministry?.name ?? ""} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ministry-status">Statut</Label>
              <FormSelect id="ministry-status" name="status" defaultValue={ministry?.status ?? "active"}>
                {Object.entries(MINISTRY_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ministry-code">Code (optionnel)</Label>
              <Input id="ministry-code" name="code" defaultValue={ministry?.code ?? ""} placeholder="Ex : MIN-01" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ministry-category">Catégorie (optionnel)</Label>
              <Input
                id="ministry-category"
                name="category"
                list="ministry-category-options"
                defaultValue={ministry?.category ?? ""}
                placeholder="Ex : Spirituel"
              />
              <datalist id="ministry-category-options">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ministry-description">Description (optionnel)</Label>
            <Input id="ministry-description" name="description" defaultValue={ministry?.description ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ministry-leader">Responsable (optionnel)</Label>
            <FormSelect id="ministry-leader" name="leaderPersonId" defaultValue={ministry?.leaderPersonId ?? ""}>
              <option value="">—</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FormSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ministry-color">Couleur (optionnel)</Label>
            <Input id="ministry-color" name="color" type="color" defaultValue={ministry?.color ?? "#1d4ed8"} className="h-10 w-20 p-1" />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : ministry ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
