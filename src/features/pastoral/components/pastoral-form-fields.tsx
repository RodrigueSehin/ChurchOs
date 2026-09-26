import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/shared/form-select";
import {
  CONFIDENTIALITY_LABELS,
  PASTORAL_STATUS_LABELS,
  PRIORITY_LABELS,
} from "@/features/pastoral/schemas";
import type { pastoralFollowups } from "@/lib/db/schema";

export function PastoralFormFields({
  followup,
  people,
  assignableUsers,
  idPrefix,
}: {
  followup?: typeof pastoralFollowups.$inferSelect;
  people: { id: string; name: string }[];
  assignableUsers: { id: string; name: string }[];
  idPrefix: string;
}) {
  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("personId")}>Personne concernée *</Label>
        <FormSelect id={id("personId")} name="personId" defaultValue={followup?.personId ?? ""} required>
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("title")}>Titre *</Label>
        <Input id={id("title")} name="title" defaultValue={followup?.title ?? ""} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("description")}>Description (optionnel)</Label>
        <textarea
          id={id("description")}
          name="description"
          rows={3}
          defaultValue={followup?.description ?? ""}
          className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("status")}>Statut</Label>
          <FormSelect id={id("status")} name="status" defaultValue={followup?.status ?? "new"}>
            {Object.entries(PASTORAL_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FormSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("priority")}>Priorité</Label>
          <FormSelect id={id("priority")} name="priority" defaultValue={followup?.priority ?? "normal"}>
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
          <Label htmlFor={id("dueDate")}>Échéance (optionnel)</Label>
          <Input id={id("dueDate")} name="dueDate" type="date" defaultValue={followup?.dueDate ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("assignedToUserId")}>Assigné à (optionnel)</Label>
          <FormSelect id={id("assignedToUserId")} name="assignedToUserId" defaultValue={followup?.assignedToUserId ?? ""}>
            <option value="">—</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </FormSelect>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("nextAction")}>Prochaine action (optionnel)</Label>
        <Input id={id("nextAction")} name="nextAction" defaultValue={followup?.nextAction ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("confidentiality")}>Confidentialité</Label>
        <FormSelect id={id("confidentiality")} name="confidentiality" defaultValue={followup?.confidentiality ?? "pastoral"}>
          {Object.entries(CONFIDENTIALITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FormSelect>
        <p className="text-xs text-slate-400">
          &laquo;&nbsp;Pastoral&nbsp;&raquo; et &laquo;&nbsp;Restreint&nbsp;&raquo; ne sont visibles que par vous, la personne
          assignée, les administrateurs, et (pour &laquo;&nbsp;Pastoral&nbsp;&raquo; seulement) les rôles pastoraux.
        </p>
      </div>
    </div>
  );
}
