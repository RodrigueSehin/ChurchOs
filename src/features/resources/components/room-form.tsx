"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, DoorOpen, Eye, FileText, ListChecks, MapPin, Tag, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormSelect } from "@/components/shared/form-select";
import { saveRoom } from "@/features/resources/actions";
import { Field, FormSection, TEXTAREA_CLASS, uploadFiles, useObjectUrl, type FileSlot, FileDropzone } from "@/features/resources/components/form-parts";
import {
  AMENITIES,
  MAX_PHOTOS,
  PHOTO_MIME_EXTENSIONS,
  RESERVABLE_BY_LABELS,
  RESOURCE_PHOTO_BUCKET,
  RESOURCE_FILE_MAX_BYTES,
  ROOM_LOCATIONS,
  ROOM_TYPES,
  ROOM_TYPE_STYLES,
} from "@/features/resources/schemas";
import type { resources } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type Room = typeof resources.$inferSelect;

const STATUS_OPTIONS = [
  { value: "available", label: "Disponible", dot: "bg-emerald-500" },
  { value: "maintenance", label: "En maintenance", dot: "bg-amber-500" },
  { value: "retired", label: "Indisponible", dot: "bg-slate-400" },
] as const;
const STATUS_PILL: Record<string, string> = { available: "bg-success/10 text-success", maintenance: "bg-red-100 text-red-600", retired: "bg-slate-100 text-slate-500" };

function Toggle({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-sm font-semibold text-navy">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </label>
    </div>
  );
}

/** Formulaire « Nouvelle salle » (création et modification) : 4 sections + aperçu en direct. */
export function RoomForm({ organizationId, room }: { organizationId: string; room?: Room }) {
  const router = useRouter();
  const editing = Boolean(room);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(room?.name ?? "");
  const [description, setDescription] = useState(room?.description ?? "");
  const [roomType, setRoomType] = useState(room?.roomType ?? "");
  const [capacity, setCapacity] = useState(room?.capacity ? String(room.capacity) : "");
  const [location, setLocation] = useState(room?.location ?? "");
  const [status, setStatus] = useState(room && room.status !== "draft" ? room.status : "available");
  const [reservableBy, setReservableBy] = useState(room?.reservableBy ?? "members");
  const [allowReservations, setAllowReservations] = useState(room?.allowReservations ?? true);
  // Une nouvelle salle suit la maquette (validation désactivée par défaut) ; une salle existante garde son réglage.
  const [requiresApproval, setRequiresApproval] = useState(room?.requiresApproval ?? false);
  const [publicCalendar, setPublicCalendar] = useState(room?.publicCalendar ?? false);
  const [amenities, setAmenities] = useState<string[]>(room?.amenities ?? []);
  const [notes, setNotes] = useState(room?.internalNotes ?? "");
  const [existingPhotos, setExistingPhotos] = useState<string[]>(room?.photos ?? []);
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);

  const slot: FileSlot = { existing: existingPhotos.map((u) => ({ key: u, label: "Photo", previewUrl: u })), added: newPhotos };
  const localCover = useObjectUrl(newPhotos[0]);
  const cover = existingPhotos[0] ?? localCover;
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "Disponible";

  function submit(mode: "draft" | "create") {
    setError(null);
    startTransition(async () => {
      const upload = await uploadFiles(RESOURCE_PHOTO_BUCKET, organizationId, newPhotos);
      if (upload.error) return setError(upload.error);
      const res = await saveRoom({
        id: room?.id,
        fields: { name, description, roomType, capacity, location, status, reservableBy, allowReservations, requiresApproval, publicCalendar, amenities, internalNotes: notes, mode },
        newPhotos: upload.refs,
        removedPhotos,
      });
      if (res.error) return setError(res.error); // l'action retire déjà les nouveaux fichiers
      router.push("/resources");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-5">
        <FormSection step={1} title="Informations générales" hint="Renseignez les informations de base de la salle." tone="blue">
          <Field label="Nom de la salle" required htmlFor="room-name" counter={`${name.length}/100`}>
            <Input id="room-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Ex : Salle principale, Salle de prière…" />
          </Field>
          <Field label="Description" htmlFor="room-description" counter={`${description.length}/500`}>
            <textarea id="room-description" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez la salle, son utilisation et ses particularités…" className={TEXTAREA_CLASS} />
          </Field>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Type de salle" required htmlFor="room-type">
              <FormSelect id="room-type" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                <option value="">Sélectionner un type</option>
                {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </FormSelect>
            </Field>
            <Field label="Capacité (personnes)" required htmlFor="room-capacity">
              <Input id="room-capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Ex : 100" />
            </Field>
            <Field label="Localisation" required htmlFor="room-location">
              <FormSelect id="room-location" value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="">Ex : Rez-de-chaussée</option>
                {/* Une localisation saisie avant cette refonte reste sélectionnable. */}
                {location && !(ROOM_LOCATIONS as readonly string[]).includes(location) && <option value={location}>{location}</option>}
                {ROOM_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </FormSelect>
            </Field>
          </div>
        </FormSection>

        <FormSection step={2} title="Disponibilité et paramètres" hint="Définissez le statut et les options de réservation." tone="green">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Statut" required htmlFor="room-status">
              <FormSelect id="room-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </FormSelect>
            </Field>
            <Field label="Réservable par" required htmlFor="room-reservable">
              <FormSelect id="room-reservable" value={reservableBy} onChange={(e) => setReservableBy(e.target.value)}>
                {Object.entries(RESERVABLE_BY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </FormSelect>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Toggle id="room-allow" label="Autoriser les réservations" hint="Permettre la réservation de cette salle" checked={allowReservations} onChange={setAllowReservations} />
            <Toggle id="room-approval" label="Validation requise" hint="Nécessite une approbation" checked={requiresApproval} onChange={setRequiresApproval} />
            <Toggle id="room-public" label="Afficher dans le calendrier public" hint="Visible par tous les membres" checked={publicCalendar} onChange={setPublicCalendar} />
          </div>
        </FormSection>

        <FormSection step={3} title="Équipements" hint="Sélectionnez les équipements disponibles dans cette salle." tone="purple">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {AMENITIES.map((a) => {
              const on = amenities.includes(a);
              return (
                <label key={a} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors", on ? "border-primary bg-blue-50 text-primary" : "border-slate-200 text-navy hover:bg-slate-50")}>
                  <input type="checkbox" checked={on} onChange={() => setAmenities(on ? amenities.filter((x) => x !== a) : [...amenities, a])} className="size-4 rounded border-slate-300 accent-primary" />
                  {a}
                </label>
              );
            })}
          </div>
        </FormSection>

        <FormSection step={4} title="Photos et documents" optional hint="Ajoutez des photos et des documents pour illustrer cette salle." tone="amber">
          <FileDropzone
            title="Cliquer pour ajouter des images"
            hint={<>JPG, PNG (max 5 Mo par fichier)<br />Format recommandé : 1920 x 1080 px</>}
            accept=".jpg,.jpeg,.png,.webp"
            mimes={Object.keys(PHOTO_MIME_EXTENSIONS)}
            maxBytes={RESOURCE_FILE_MAX_BYTES}
            max={MAX_PHOTOS}
            slot={slot}
            onError={setError}
            onChange={({ added, removeExisting }) => {
              if (added) setNewPhotos(added);
              if (removeExisting) {
                setExistingPhotos(existingPhotos.filter((u) => u !== removeExisting));
                setRemovedPhotos([...removedPhotos, removeExisting]);
              }
            }}
          />
          <p className="text-xs text-slate-400">La première photo sert d&apos;image principale.</p>
        </FormSection>
      </div>

      <aside className="flex flex-col gap-5 self-start xl:sticky xl:top-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 bg-purple-50 px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-purple-100 text-purple-600"><Eye className="size-4" /></span>
            <div>
              <p className="font-semibold text-navy">Aperçu de la salle</p>
              <p className="text-xs text-slate-500">Voici un aperçu de la salle avec les informations saisies.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div className="aspect-[16/9] overflow-hidden rounded-lg bg-gradient-to-br from-navy to-primary">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob) ou image du bucket public
                <img src={cover} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-white/70"><DoorOpen className="size-12" /></span>
              )}
            </div>
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 break-words text-lg font-bold text-primary">{name || "Nom de la salle"}</p>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_PILL[status])}>{statusLabel}</span>
            </div>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5"><Users className="size-4 text-primary" />{Number(capacity) > 0 ? capacity : 0} personnes</span>
              <span className={cn("inline-flex items-center gap-1.5", roomType && cn("rounded-full px-2.5 py-0.5 text-xs font-medium", ROOM_TYPE_STYLES[roomType]))}><Tag className="size-4 text-primary" />{roomType || "Type"}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-primary" />{location || "Localisation"}</span>
            </p>
            <p className="text-sm text-slate-500">{description || "La description de la salle apparaîtra ici. Elle permettra aux membres de mieux comprendre son utilisation et ses caractéristiques."}</p>
            {amenities.length > 0 && (
              <p className="flex flex-wrap gap-1.5">
                {amenities.map((a) => <span key={a} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-navy">{a}</span>)}
              </p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 bg-purple-50 px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-purple-100 text-purple-600"><ListChecks className="size-4" /></span>
            <div>
              <p className="font-semibold text-navy">Informations supplémentaires</p>
              <p className="text-xs text-slate-500">Détails et espace pour notes internes.</p>
            </div>
          </div>
          <div className="p-4">
            <Field label="Notes internes" htmlFor="room-notes" counter={`${notes.length}/500`}>
              <textarea id="room-notes" rows={5} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ajoutez des notes internes (optionnel)…" className={TEXTAREA_CLASS} />
            </Field>
          </div>
        </div>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.2fr]">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => submit("draft")} className="bg-blue-50 text-primary">
            <FileText className="size-4" />
            Enregistrer en brouillon
          </Button>
          <Button type="button" disabled={pending} onClick={() => submit("create")} className="bg-navy hover:bg-navy/90">
            <Check className="size-4" />
            {pending ? "Enregistrement…" : editing ? "Enregistrer la salle" : "Créer la salle"}
          </Button>
        </div>
        <Link href="/resources" className="self-center text-xs text-slate-500 underline">Annuler</Link>
      </aside>
    </div>
  );
}

