"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelect } from "@/components/shared/form-select";
import type { EventActionState } from "@/features/events/actions";
import { EVENT_STATUS_LABELS, EVENT_VISIBILITY_LABELS } from "@/features/events/schemas";
import type { events } from "@/lib/db/schema";

type Action = (prev: EventActionState, formData: FormData) => Promise<EventActionState>;

function toLocalDateTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({
  action,
  categories,
  event,
  cancelHref,
}: {
  action: Action;
  categories: { id: string; name: string }[];
  event?: typeof events.$inferSelect;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Titre *</Label>
            <Input id="title" name="title" defaultValue={event?.title ?? ""} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optionnel)</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={event?.description ?? ""}
              className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoryId">Catégorie (optionnel)</Label>
              <FormSelect id="categoryId" name="categoryId" defaultValue={event?.categoryId ?? ""}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location">Lieu (optionnel)</Label>
              <Input id="location" name="location" defaultValue={event?.location ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startsAt">Début *</Label>
              <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={toLocalDateTime(event?.startsAt)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endsAt">Fin (optionnel)</Label>
              <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={toLocalDateTime(event?.endsAt)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visibilité & inscriptions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visibility">Visibilité</Label>
              <FormSelect id="visibility" name="visibility" defaultValue={event?.visibility ?? "members"}>
                {Object.entries(EVENT_VISIBILITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Statut</Label>
              <FormSelect id="status" name="status" defaultValue={event?.status ?? "draft"}>
                {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="capacity">Capacité (optionnel)</Label>
              <Input id="capacity" name="capacity" type="number" min={1} defaultValue={event?.capacity ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Checkbox name="registrationEnabled" defaultChecked={event?.registrationEnabled ?? false} />
              Inscriptions ouvertes pour cet événement
            </label>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Prix (optionnel, 0 = gratuit)</Label>
              <Input id="price" name="price" type="number" min={0} step="0.01" defaultValue={event?.price ?? "0"} />
            </div>
          </div>
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
