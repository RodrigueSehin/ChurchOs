"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import type { ResourceActionState } from "@/features/resources/actions";
import { EQUIPMENT_CATEGORIES, RESOURCE_STATUS_LABELS, RESOURCE_TYPE_LABELS, ROOM_TYPES, readMeta } from "@/features/resources/schemas";
import type { resources } from "@/lib/db/schema";

const initialState: ResourceActionState = {};

/**
 * Création / modification d'une salle ou d'un équipement. Formulaire provisoire : il sera refondu d'après
 * les maquettes « Nouvelle salle » / « Nouvel équipement ». `presetType` fixe le type à la création.
 */
export function ResourceFormDialog({
  action,
  resource,
  presetType = "room",
  rooms,
  open,
  onOpenChange,
}: {
  action: (prev: ResourceActionState, formData: FormData) => Promise<ResourceActionState>;
  resource?: typeof resources.$inferSelect;
  presetType?: "room" | "equipment";
  rooms: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const type = resource?.type ?? presetType;
  const meta = readMeta(resource?.metadata);
  const isRoom = type === "room";
  const isEquipment = type === "equipment";

  const [state, formAction, pending] = useActionState(async (prev: ResourceActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.success) {
      onOpenChange(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  const title = resource ? `Modifier ${resource.name}` : isRoom ? "Nouvelle salle" : "Nouvel équipement";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="type" value={type} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resource-name">Nom *</Label>
            <Input id="resource-name" name="name" defaultValue={resource?.name ?? ""} required />
          </div>

          {isRoom && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="resource-capacity">Capacité (personnes)</Label>
                <Input id="resource-capacity" name="capacity" type="number" min={1} defaultValue={meta.capacity ?? ""} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="resource-roomType">Type de salle</Label>
                <FormSelect id="resource-roomType" name="roomType" defaultValue={meta.roomType ?? ""}>
                  <option value="">—</option>
                  {ROOM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </FormSelect>
              </div>
            </div>
          )}

          {isEquipment && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="resource-category">Catégorie</Label>
                <FormSelect id="resource-category" name="category" defaultValue={meta.category ?? ""}>
                  <option value="">—</option>
                  {EQUIPMENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="resource-roomId">Installé dans la salle</Label>
                <FormSelect id="resource-roomId" name="roomId" defaultValue={meta.roomId ?? ""}>
                  <option value="">Non affecté</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </FormSelect>
              </div>
            </div>
          )}

          {!isRoom && !isEquipment && <p className="text-xs text-slate-500">Type : {RESOURCE_TYPE_LABELS[type]}</p>}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resource-description">Description (optionnel)</Label>
            <Input id="resource-description" name="description" defaultValue={resource?.description ?? ""} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {!isRoom && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="resource-quantity">Quantité</Label>
                <Input id="resource-quantity" name="quantity" type="number" min={1} defaultValue={resource?.quantity ?? 1} />
              </div>
            )}
            <div className={isRoom ? "col-span-3 flex flex-col gap-1.5" : "col-span-2 flex flex-col gap-1.5"}>
              <Label htmlFor="resource-location">Localisation (optionnel)</Label>
              <Input id="resource-location" name="location" defaultValue={resource?.location ?? ""} placeholder="Ex : Rez-de-chaussée" />
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
          {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
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
