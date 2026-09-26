import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/shared/form-select";
import { PLANNING_STATUS_LABELS } from "@/features/planning/schemas";
import type { getPlanningSlots } from "@/features/planning/queries";

type SlotRow = Awaited<ReturnType<typeof getPlanningSlots>>[number];

function toLocalDateTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PlanningFormFields({
  slot,
  workers,
  idPrefix,
}: {
  slot?: SlotRow;
  workers: { id: string; name: string }[];
  idPrefix: string;
}) {
  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("title")}>Titre *</Label>
        <Input id={id("title")} name="title" defaultValue={slot?.title ?? ""} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("category")}>Catégorie (optionnel)</Label>
          <Input id={id("category")} name="category" defaultValue={slot?.category ?? ""} placeholder="Ex : Accueil, Sonorisation..." />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("status")}>Statut</Label>
          <FormSelect id={id("status")} name="status" defaultValue={slot?.status ?? "assigned"}>
            {Object.entries(PLANNING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FormSelect>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("startsAt")}>Début *</Label>
          <Input id={id("startsAt")} name="startsAt" type="datetime-local" defaultValue={toLocalDateTime(slot?.startsAt)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("endsAt")}>Fin (optionnel)</Label>
          <Input id={id("endsAt")} name="endsAt" type="datetime-local" defaultValue={toLocalDateTime(slot?.endsAt)} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("location")}>Lieu (optionnel)</Label>
        <Input id={id("location")} name="location" defaultValue={slot?.location ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("assignedToWorkerId")}>Ouvrier assigné (optionnel)</Label>
        <FormSelect id={id("assignedToWorkerId")} name="assignedToWorkerId" defaultValue={slot?.assignedToWorkerId ?? ""}>
          <option value="">—</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </FormSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("notes")}>Notes (optionnel)</Label>
        <textarea
          id={id("notes")}
          name="notes"
          rows={2}
          defaultValue={slot?.notes ?? ""}
          className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>
    </div>
  );
}
