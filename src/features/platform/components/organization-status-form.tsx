"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { setOrganizationStatus, type PlatformActionState } from "@/features/platform/actions";

const initialState: PlatformActionState = {};

export function OrganizationStatusForm({
  organizationId,
  status,
}: {
  organizationId: string;
  status: string;
}) {
  const [state, formAction, pending] = useActionState(setOrganizationStatus, initialState);
  const suspended = status === "suspended";

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="status" value={suspended ? "active" : "suspended"} />
      <Button type="submit" variant={suspended ? "default" : "outline"} disabled={pending}>
        {pending ? "Enregistrement..." : suspended ? "Réactiver l'église" : "Suspendre l'église"}
      </Button>
      {!suspended && (
        <p className="text-xs text-slate-500">
          Les utilisateurs de cette église ne pourront plus accéder à l&apos;application tant qu&apos;elle est suspendue.
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
