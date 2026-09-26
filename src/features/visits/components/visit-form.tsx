"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createVisit, type VisitActionState } from "@/features/visits/actions";
import { VisitFormFields } from "@/features/visits/components/visit-form-fields";

const initialState: VisitActionState = {};

export function VisitForm({
  people,
  assignableUsers,
  cancelHref,
}: {
  people: { id: string; name: string }[];
  assignableUsers: { id: string; name: string }[];
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(createVisit, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardContent className="pt-5">
          <VisitFormFields people={people} assignableUsers={assignableUsers} idPrefix="new-visit" />
        </CardContent>
      </Card>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" asChild>
          <Link href={cancelHref}>Annuler</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
