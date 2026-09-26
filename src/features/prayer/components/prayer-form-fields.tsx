import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSelect } from "@/components/shared/form-select";
import { PRAYER_STATUS_LABELS, PRIORITY_LABELS } from "@/features/prayer/schemas";
import type { prayerRequests } from "@/lib/db/schema";

export function PrayerFormFields({
  request,
  people,
  assignableUsers,
  idPrefix,
}: {
  request?: typeof prayerRequests.$inferSelect;
  people: { id: string; name: string }[];
  assignableUsers: { id: string; name: string }[];
  idPrefix: string;
}) {
  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("personId")}>Personne concernée (optionnel)</Label>
        <FormSelect id={id("personId")} name="personId" defaultValue={request?.personId ?? ""}>
          <option value="">Anonyme / non spécifié</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </FormSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("title")}>Titre *</Label>
        <Input id={id("title")} name="title" defaultValue={request?.title ?? ""} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("description")}>Description (optionnel)</Label>
        <textarea
          id={id("description")}
          name="description"
          rows={3}
          defaultValue={request?.description ?? ""}
          className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("category")}>Catégorie (optionnel)</Label>
          <Input id={id("category")} name="category" defaultValue={request?.category ?? ""} placeholder="Ex : Santé, Famille..." />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("priority")}>Priorité</Label>
          <FormSelect id={id("priority")} name="priority" defaultValue={request?.priority ?? "normal"}>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FormSelect>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("status")}>Statut</Label>
          <FormSelect id={id("status")} name="status" defaultValue={request?.status ?? "open"}>
            {Object.entries(PRAYER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FormSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("assignedToUserId")}>Assigné à (optionnel)</Label>
          <FormSelect id={id("assignedToUserId")} name="assignedToUserId" defaultValue={request?.assignedToUserId ?? ""}>
            <option value="">—</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </FormSelect>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <Checkbox id={id("isConfidential")} name="isConfidential" defaultChecked={request?.isConfidential ?? true} />
        Confidentiel (visible seulement par vous, la personne assignée, les administrateurs et les rôles pastoraux)
      </label>
    </div>
  );
}
