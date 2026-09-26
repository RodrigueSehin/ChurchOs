import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/shared/form-select";
import { VISIT_STATUS_LABELS, VISIT_TYPE_LABELS } from "@/features/visits/schemas";
import type { visits } from "@/lib/db/schema";

type VisitFieldsValue = Pick<
  typeof visits.$inferSelect,
  "personId" | "visitType" | "status" | "scheduledAt" | "location" | "assignedToUserId" | "purpose" | "summary" | "nextAction" | "nextActionDate"
>;

function toLocalDateTime(value: Date | string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function VisitFormFields({
  visit,
  people,
  assignableUsers,
  idPrefix,
}: {
  visit?: VisitFieldsValue;
  people: { id: string; name: string }[];
  assignableUsers: { id: string; name: string }[];
  idPrefix: string;
}) {
  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("personId")}>Personne visitée *</Label>
        <FormSelect id={id("personId")} name="personId" defaultValue={visit?.personId ?? ""} required>
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
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("visitType")}>Type de visite</Label>
          <FormSelect id={id("visitType")} name="visitType" defaultValue={visit?.visitType ?? "pastoral"}>
            {Object.entries(VISIT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FormSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("status")}>Statut</Label>
          <FormSelect id={id("status")} name="status" defaultValue={visit?.status ?? "new"}>
            {Object.entries(VISIT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FormSelect>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("scheduledAt")}>Date planifiée (optionnel)</Label>
          <Input id={id("scheduledAt")} name="scheduledAt" type="datetime-local" defaultValue={toLocalDateTime(visit?.scheduledAt ?? null)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("location")}>Lieu (optionnel)</Label>
          <Input id={id("location")} name="location" defaultValue={visit?.location ?? ""} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("assignedToUserId")}>Assigné à (optionnel)</Label>
        <FormSelect id={id("assignedToUserId")} name="assignedToUserId" defaultValue={visit?.assignedToUserId ?? ""}>
          <option value="">—</option>
          {assignableUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </FormSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("purpose")}>Motif (optionnel)</Label>
        <Input id={id("purpose")} name="purpose" defaultValue={visit?.purpose ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("summary")}>Résumé (optionnel)</Label>
        <textarea
          id={id("summary")}
          name="summary"
          rows={3}
          defaultValue={visit?.summary ?? ""}
          className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("nextAction")}>Prochaine action (optionnel)</Label>
          <Input id={id("nextAction")} name="nextAction" defaultValue={visit?.nextAction ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("nextActionDate")}>Date de la prochaine action (optionnel)</Label>
          <Input id={id("nextActionDate")} name="nextActionDate" type="date" defaultValue={visit?.nextActionDate ?? ""} />
        </div>
      </div>
    </div>
  );
}
