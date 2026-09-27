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
import type { ResourceActionState } from "@/features/resources/actions";
import { RESOURCE_STATUS_LABELS, RESOURCE_TYPE_LABELS } from "@/features/resources/schemas";
import type { resources } from "@/lib/db/schema";

const initialState: ResourceActionState = {};

export function ResourceFormDialog({
  action,
  resource,
  trigger,
}: {
  action: (prev: ResourceActionState, formData: FormData) => Promise<ResourceActionState>;
  resource?: typeof resources.$inferSelect;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: ResourceActionState, formData: FormData) => {
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
          Nouvelle ressource
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{resource ? `Modifier ${resource.name}` : "Nouvelle ressource"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resource-name">Nom *</Label>
              <Input id="resource-name" name="name" defaultValue={resource?.name ?? ""} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resource-type">Type</Label>
              <FormSelect id="resource-type" name="type" defaultValue={resource?.type ?? "room"}>
                {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resource-description">Description (optionnel)</Label>
            <Input id="resource-description" name="description" defaultValue={resource?.description ?? ""} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resource-quantity">Quantité</Label>
              <Input
                id="resource-quantity"
                name="quantity"
                type="number"
                min={1}
                defaultValue={resource?.quantity ?? 1}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="resource-location">Emplacement (optionnel)</Label>
              <Input id="resource-location" name="location" defaultValue={resource?.location ?? ""} placeholder="Ex : Bâtiment A, salle 2" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resource-status">Statut</Label>
            <FormSelect id="resource-status" name="status" defaultValue={resource?.status ?? "available"}>
              {Object.entries(RESOURCE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FormSelect>
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : resource ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
