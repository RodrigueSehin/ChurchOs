"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { addPrayerUpdate, type PrayerActionState } from "@/features/prayer/actions";
import type { getPrayerRequestDetail } from "@/features/prayer/queries";

type Update = NonNullable<Awaited<ReturnType<typeof getPrayerRequestDetail>>>["updates"][number];

const initialState: PrayerActionState = {};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export function PrayerUpdatesPanel({ prayerRequestId, updates, canAdd }: { prayerRequestId: string; updates: Update[]; canAdd: boolean }) {
  const boundAction = addPrayerUpdate.bind(null, prayerRequestId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-navy">Mises à jour</p>

      {updates.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune mise à jour pour l&apos;instant.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {updates.map((update) => (
            <div key={update.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                <span>{update.authorEmail ?? "—"}</span>
                <span>{formatDate(update.createdAt)}</span>
              </div>
              <p className="text-slate-700">{update.content}</p>
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <form action={formAction} className="flex flex-col gap-2 border-t border-slate-100 pt-3">
          <textarea
            name="content"
            rows={2}
            required
            placeholder="Ajouter une mise à jour..."
            className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          <div className="flex items-center justify-end">
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
