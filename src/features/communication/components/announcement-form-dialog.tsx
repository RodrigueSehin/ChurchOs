"use client";

import { useActionState, useRef, useState } from "react";
import { ImagePlus, Plus } from "lucide-react";

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
import { ANNOUNCEMENT_IMAGE_MAX_BYTES, ANNOUNCEMENT_STATUS_LABELS } from "@/features/communication/schemas";
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
  audienceOptions,
}: {
  action: (prev: CommunicationActionState, formData: FormData) => Promise<CommunicationActionState>;
  announcement?: typeof announcements.$inferSelect;
  trigger?: React.ReactNode;
  /** Groupes et ministères proposés comme destinataires (en plus de « Tous les membres »). */
  audienceOptions: { groups: { id: string; name: string }[]; ministries: { id: string; name: string }[] };
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const shownImage = preview ?? (removeImage ? null : announcement?.imageUrl ?? null);
  const audience = announcement?.audienceFilter as { type?: string; id?: string } | undefined;
  const audienceValue = audience?.type === "group" || audience?.type === "ministry" ? `${audience.type}:${audience.id}` : "all";

  function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setImageError(null);
    if (file && file.size > ANNOUNCEMENT_IMAGE_MAX_BYTES) {
      setImageError("Image trop volumineuse (4 Mo maximum).");
      e.target.value = "";
      setPreview(null);
      return;
    }
    setPreview(file ? URL.createObjectURL(file) : null);
    if (file) setRemoveImage(false);
  }
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="announcement-audience">Destinataires</Label>
            <FormSelect id="announcement-audience" name="audience" defaultValue={audienceValue}>
              <option value="all">Tous les membres</option>
              {audienceOptions.groups.length > 0 && (
                <optgroup label="Groupes">
                  {audienceOptions.groups.map((g) => (
                    <option key={g.id} value={`group:${g.id}`}>{g.name}</option>
                  ))}
                </optgroup>
              )}
              {audienceOptions.ministries.length > 0 && (
                <optgroup label="Ministères">
                  {audienceOptions.ministries.map((m) => (
                    <option key={m.id} value={`ministry:${m.id}`}>{m.name}</option>
                  ))}
                </optgroup>
              )}
            </FormSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Image (optionnelle)</Label>
            <input ref={imageInput} type="file" name="image" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onImageChange} />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => imageInput.current?.click()}
                className="relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-primary/40 bg-blue-50 text-primary"
              >
                {shownImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob) ou image du bucket public
                  <img src={shownImage} alt="" className="absolute inset-0 size-full object-cover" />
                ) : (
                  <ImagePlus className="size-5" />
                )}
              </button>
              <div className="text-xs text-slate-500">
                <p>JPG, PNG ou WebP, 4 Mo maximum.</p>
                {announcement?.imageUrl && !preview && (
                  <label className="mt-1 flex items-center gap-1.5">
                    <input type="checkbox" name="removeImage" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />
                    Retirer l&apos;image
                  </label>
                )}
                {imageError && <p role="alert" className="mt-1 text-danger">{imageError}</p>}
              </div>
            </div>
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
