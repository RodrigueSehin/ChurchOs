"use client";

import { useState, useTransition } from "react";
import { UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormSelect } from "@/components/shared/form-select";
import { updateVisitorStatus, convertVisitorToMember } from "@/features/visitors/actions";
import { VISITOR_STATUS_LABELS } from "@/features/visitors/schemas";

export function VisitorStatusSelect({ visitorId, status }: { visitorId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);

  function handleChange(next: string) {
    setValue(next);
    setError(null);
    startTransition(async () => {
      const res = await updateVisitorStatus(visitorId, next as Parameters<typeof updateVisitorStatus>[1]);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <FormSelect value={value} disabled={isPending} onChange={(e) => handleChange(e.target.value)}>
        {Object.entries(VISITOR_STATUS_LABELS).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </FormSelect>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function ConvertToMemberButton({ visitorId, name }: { visitorId: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConvert() {
    startTransition(async () => {
      const res = await convertVisitorToMember(visitorId);
      if (res?.error) setError(res.error);
      // En cas de succès, l'action redirige elle-même vers /members/[id].
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        trigger={
          <Button type="button" size="sm" disabled={isPending}>
            <UserCheck className="size-4" />
            Convertir en membre
          </Button>
        }
        title="Convertir en membre ?"
        description={`${name} deviendra membre de l'église. Son historique de visite est conservé.`}
        confirmLabel="Convertir"
        onConfirm={handleConvert}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
