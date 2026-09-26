"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { addPastoralNote, type PastoralActionState } from "@/features/pastoral/actions";
import type { getPastoralFollowupDetail } from "@/features/pastoral/queries";

type Note = NonNullable<Awaited<ReturnType<typeof getPastoralFollowupDetail>>>["notes"][number];

const initialState: PastoralActionState = {};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export function PastoralNotesPanel({ followupId, notes, canAdd }: { followupId: string; notes: Note[]; canAdd: boolean }) {
  const boundAction = addPastoralNote.bind(null, followupId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-navy">Notes de suivi</p>

      {notes.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune note pour l&apos;instant.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  {note.isPrivate && <Lock className="size-3" />}
                  {note.authorEmail ?? "—"}
                </span>
                <span>{formatDate(note.createdAt)}</span>
              </div>
              <p className="text-slate-700">{note.note}</p>
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <form action={formAction} className="flex flex-col gap-2 border-t border-slate-100 pt-3">
          <textarea
            name="note"
            rows={2}
            required
            placeholder="Ajouter une note..."
            className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <Checkbox name="isPrivate" defaultChecked />
              Note privée (visible seulement par vous, les admins et les rôles pastoraux)
            </label>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Ajout..." : "Ajouter"}
            </Button>
          </div>
          {state.error && <p className="text-xs text-danger">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
