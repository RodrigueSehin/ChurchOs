"use client";

import { useActionState, useState } from "react";
import { Plus, Settings2 } from "lucide-react";

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
import { EmptyState } from "@/components/shared/empty-state";
import { createServiceType, type ServiceActionState } from "@/features/services/actions";
import type { getServiceTypes } from "@/features/services/queries";

const initialState: ServiceActionState = {};

type ServiceType = Awaited<ReturnType<typeof getServiceTypes>>[number];

export function ServiceTypeManager({ types }: { types: ServiceType[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createServiceType, initialState);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="size-4" />
        Types de service
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Types de service</DialogTitle>
          </DialogHeader>

          {types.length === 0 ? (
            <EmptyState icon={Settings2} title="Aucun type" description="Créez le premier type de service (ex : Culte du dimanche)." />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {types.map((t) => (
                <li key={t.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-navy">
                  {t.name}
                  {t.defaultDurationMinutes ? <span className="text-slate-400"> · {t.defaultDurationMinutes} min</span> : null}
                </li>
              ))}
            </ul>
          )}

          <form action={formAction} className="flex flex-col gap-3 border-t border-slate-100 pt-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service-type-name">Nom</Label>
              <Input id="service-type-name" name="name" placeholder="Ex : Culte du dimanche" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service-type-duration">Durée par défaut en minutes (optionnel)</Label>
              <Input id="service-type-duration" name="defaultDurationMinutes" type="number" min={1} />
            </div>
            {state.error && <p className="text-sm text-danger">{state.error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                <Plus className="size-4" />
                {pending ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
