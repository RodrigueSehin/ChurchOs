"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import type { CommunicationActionState } from "@/features/communication/actions";
import { ANNOUNCEMENT_STATUS_LABELS } from "@/features/communication/schemas";
import type { announcements } from "@/lib/db/schema";

const initialState: CommunicationActionState = {};

function toLocalInputValue(value: string | Date | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16);
}

export function AnnouncementFormDialog({
  action,
  announcement,
  trigger,
}: {
  action: (prev: CommunicationActionState, formData: FormData) => Promise<CommunicationActionState>;
  announcement?: typeof announcements.$inferSelect;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: CommunicationActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Nouvelle annonce
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{announcement ? `Modifier ${announcement.title}` : "Nouvelle annonce"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="announcement-title">Titre *</Label>
              <Input id="announcement-title" name="title" defaultValue={announcement?.title ?? ""} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="announcement-status">Statut</Label>
              <FormSelect id="announcement-status" name="status" defaultValue={announcement?.status ?? "draft"}>
                {Object.entries(ANNOUNCEMENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="announcement-content">Contenu *</Label>
            <textarea
              id="announcement-content"
              name="content"
              rows={4}
              defaultValue={announcement?.content ?? ""}
              required
              className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="announcement-publishAt">Publier le (optionnel)</Label>
              <Input
                id="announcement-publishAt"
                name="publishAt"
                type="datetime-local"
                defaultValue={toLocalInputValue(announcement?.publishAt ?? null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="announcement-expiresAt">Expire le (optionnel)</Label>
              <Input
                id="announcement-expiresAt"
                name="expiresAt"
                type="datetime-local"
                defaultValue={toLocalInputValue(announcement?.expiresAt ?? null)}
              />
            </div>
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : announcement ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
