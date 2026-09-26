import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/shared/form-select";
import { COUNCIL_STATUS_LABELS } from "@/features/pastoral-council/schemas";
import type { pastoralCouncils } from "@/lib/db/schema";

function toLocalDateTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CouncilFormFields({
  council,
  idPrefix,
}: {
  council?: typeof pastoralCouncils.$inferSelect;
  idPrefix: string;
}) {
  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("title")}>Titre *</Label>
        <Input id={id("title")} name="title" defaultValue={council?.title ?? ""} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("meetingAt")}>Date et heure *</Label>
          <Input
            id={id("meetingAt")}
            name="meetingAt"
            type="datetime-local"
            defaultValue={toLocalDateTime(council?.meetingAt)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("status")}>Statut</Label>
          <FormSelect id={id("status")} name="status" defaultValue={council?.status ?? "planned"}>
            {Object.entries(COUNCIL_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FormSelect>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("location")}>Lieu (optionnel)</Label>
        <Input id={id("location")} name="location" defaultValue={council?.location ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("agenda")}>Ordre du jour (optionnel)</Label>
        <textarea
          id={id("agenda")}
          name="agenda"
          rows={3}
          defaultValue={council?.agenda ?? ""}
          className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("minutes")}>Compte-rendu (optionnel)</Label>
        <textarea
          id={id("minutes")}
          name="minutes"
          rows={3}
          defaultValue={council?.minutes ?? ""}
          className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>
    </div>
  );
}
