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
import type { ServiceActionState } from "@/features/services/actions";
import { SERVICE_STATUS_LABELS } from "@/features/services/schemas";
import type { getServices, getServiceTypes } from "@/features/services/queries";

const initialState: ServiceActionState = {};

type Service = Awaited<ReturnType<typeof getServices>>[number];
type ServiceType = Awaited<ReturnType<typeof getServiceTypes>>[number];

function toLocalDateTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ServiceFormDialog({
  action,
  types,
  service,
  trigger,
}: {
  action: (prev: ServiceActionState, formData: FormData) => Promise<ServiceActionState>;
  types: ServiceType[];
  service?: Service;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: ServiceActionState, formData: FormData) => {
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
          Nouveau service
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? `Modifier ${service.title}` : "Nouveau service"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="service-title">Titre *</Label>
            <Input id="service-title" name="title" defaultValue={service?.title ?? ""} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service-serviceTypeId">Type (optionnel)</Label>
              <FormSelect id="service-serviceTypeId" name="serviceTypeId" defaultValue={service?.serviceTypeId ?? ""}>
                <option value="">—</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service-status">Statut</Label>
              <FormSelect id="service-status" name="status" defaultValue={service?.status ?? "planned"}>
                {Object.entries(SERVICE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service-startsAt">Début *</Label>
              <Input id="service-startsAt" name="startsAt" type="datetime-local" defaultValue={toLocalDateTime(service?.startsAt)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service-endsAt">Fin (optionnel)</Label>
              <Input id="service-endsAt" name="endsAt" type="datetime-local" defaultValue={toLocalDateTime(service?.endsAt)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="service-location">Lieu (optionnel)</Label>
            <Input id="service-location" name="location" defaultValue={service?.location ?? ""} />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : service ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
