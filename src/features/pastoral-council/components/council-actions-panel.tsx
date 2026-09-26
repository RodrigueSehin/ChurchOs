"use client";

import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/shared/form-select";
import {
  createCouncilAction,
  updateCouncilActionStatus,
  type CouncilActionState,
} from "@/features/pastoral-council/actions";
import { ACTION_STATUS_LABELS } from "@/features/pastoral-council/schemas";
import type { getPastoralCouncilDetail } from "@/features/pastoral-council/queries";

type ActionItem = NonNullable<Awaited<ReturnType<typeof getPastoralCouncilDetail>>>["actions"][number];

const initialState: CouncilActionState = {};

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "default"> = {
  new: "secondary",
  in_progress: "default",
  waiting: "warning",
  completed: "success",
  cancelled: "secondary",
  archived: "secondary",
};

export function CouncilActionsPanel({
  councilId,
  actions,
  assignableUsers,
  canManage,
}: {
  councilId: string;
  actions: ActionItem[];
  assignableUsers: { id: string; name: string }[];
  canManage: boolean;
}) {
  const boundCreate = createCouncilAction.bind(null, councilId);
  const [state, formAction, pending] = useActionState(boundCreate, initialState);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-navy">Actions à suivre</p>

      {actions.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune action enregistrée.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {actions.map((a) => (
            <ActionRow key={a.id} action={a} canManage={canManage} />
          ))}
        </div>
      )}

      {canManage && (
        <form action={formAction} className="flex flex-col gap-2 border-t border-slate-100 pt-3">
          <Input name="title" placeholder="Titre de l'action" required />
          <div className="flex flex-col gap-2 sm:flex-row">
            <FormSelect name="assignedToUserId" defaultValue="" className="sm:max-w-[220px]">
              <option value="">Assigné à (optionnel)</option>
              {assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </FormSelect>
            <Input name="dueDate" type="date" className="sm:max-w-[160px]" />
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Ajout..." : "Ajouter"}
            </Button>
          </div>
        </form>
      )}
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
    </div>
  );
}

function ActionRow({ action, canManage }: { action: ActionItem; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatusChange(status: string) {
    startTransition(async () => {
      const res = await updateCouncilActionStatus(action.id, status);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-100 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-navy">{action.title}</p>
          <p className="text-xs text-slate-400">
            {action.assignedToEmail ?? "Non assigné"}
            {action.dueDate ? ` · échéance ${action.dueDate}` : ""}
          </p>
        </div>
        {canManage ? (
          <FormSelect
            value={action.status}
            disabled={isPending}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-auto shrink-0 sm:max-w-[160px]"
          >
            {Object.entries(ACTION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FormSelect>
        ) : (
          <Badge variant={STATUS_VARIANT[action.status] ?? "secondary"}>{ACTION_STATUS_LABELS[action.status] ?? action.status}</Badge>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
