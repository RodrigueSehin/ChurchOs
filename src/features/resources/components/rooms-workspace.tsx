"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, DoorOpen, MapPin, MoreVertical, Pencil, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteResource, updateResource } from "@/features/resources/actions";
import { CategoryIcon } from "@/features/resources/components/equipment-icons";
import { ReserveDialog } from "@/features/resources/components/reserve-dialog";
import { ResourceFormDialog } from "@/features/resources/components/resource-form-dialog";
import type { RoomView } from "@/features/resources/queries";
import { RESERVATION_STATUS_LABELS, ROOM_TYPE_STYLES } from "@/features/resources/schemas";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  available: "bg-success/10 text-success",
  reserved: "bg-amber-100 text-amber-700",
  maintenance: "bg-red-100 text-red-600",
  retired: "bg-slate-100 text-slate-500",
} as const;
const STATUS_LABELS = { available: "Disponible", reserved: "Réservée", maintenance: "En maintenance", retired: "Retirée" } as const;
const RESERVATION_STYLES: Record<string, string> = {
  confirmed: "bg-success/10 text-success",
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-slate-100 text-slate-500",
};

function fmtRange(start: Date, end: Date) {
  const d = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(start);
  const t = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${d}  ${t.format(start)} - ${t.format(end)}`;
}

/** Tableau des salles (gauche) + panneau de détail de la salle sélectionnée (droite). */
export function RoomsWorkspace({
  rooms,
  allRooms,
  canManage,
  canReserve,
  isAdmin,
  footer,
  empty,
  toolbar,
}: {
  rooms: RoomView[];
  allRooms: { id: string; name: string }[];
  canManage: boolean;
  canReserve: boolean;
  isAdmin: boolean;
  footer: React.ReactNode;
  empty: React.ReactNode;
  toolbar: React.ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rooms.find((r) => r.id === selectedId) ?? rooms[0] ?? null;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        {toolbar}
        {rooms.length === 0 ? (
          empty
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold text-navy">
                  <th className="px-3 py-2.5">Nom de la salle</th>
                  <th className="px-3 py-2.5">Capacité</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Localisation</th>
                  <th className="px-3 py-2.5">Statut</th>
                  <th className="px-3 py-2.5">Équipements</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <RoomRow key={room.id} room={room} selected={selected?.id === room.id} onSelect={() => setSelectedId(room.id)} allRooms={allRooms} canManage={canManage} canReserve={canReserve} isAdmin={isAdmin} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {footer}
      </div>
      {selected && <RoomDetail key={selected.id} room={selected} allRooms={allRooms} canManage={canManage} canReserve={canReserve} />}
    </div>
  );
}

function EquipmentIcons({ room }: { room: RoomView }) {
  const categories = [...new Set(room.equipment.map((e) => e.category))];
  const shown = categories.slice(0, 3);
  if (room.equipment.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <span className="inline-flex items-center gap-2 text-slate-600">
      {shown.map((c, i) => (
        <CategoryIcon key={`${c}-${i}`} category={c} className="size-4" />
      ))}
      {categories.length > 3 && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">+{categories.length - 3}</span>}
    </span>
  );
}

function RoomRow({ room, selected, onSelect, allRooms, canManage, canReserve, isAdmin }: { room: RoomView; selected: boolean; onSelect: () => void; allRooms: { id: string; name: string }[]; canManage: boolean; canReserve: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    const res = await deleteResource(room.id);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  return (
    <tr onClick={onSelect} className={cn("cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/60", selected && "bg-blue-50/60")}>
      <td className="px-3 py-3 font-semibold text-navy">{room.name}</td>
      <td className="px-3 py-3 text-slate-600">
        <span className="inline-flex items-center gap-1.5"><Users className="size-4 text-primary" />{room.meta.capacity ?? "—"}</span>
      </td>
      <td className="px-3 py-3">
        {room.meta.roomType ? <span className={cn("rounded-full px-3 py-0.5 text-xs font-medium", ROOM_TYPE_STYLES[room.meta.roomType] ?? "bg-slate-100 text-slate-600")}>{room.meta.roomType}</span> : <span className="text-slate-400">—</span>}
      </td>
      <td className="px-3 py-3 text-slate-600">{room.location ?? "—"}</td>
      <td className="px-3 py-3">
        <span className={cn("inline-block rounded-md px-2.5 py-1 text-xs font-medium", STATUS_STYLES[room.displayStatus])}>{STATUS_LABELS[room.displayStatus]}</span>
      </td>
      <td className="px-3 py-3"><EquipmentIcons room={room} /></td>
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end">
          {(canManage || canReserve) && (
            <details className="relative">
              <summary className="flex cursor-pointer list-none rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Actions">
                <MoreVertical className="size-4" />
              </summary>
              <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                {canReserve && (
                  <button type="button" onClick={() => setReserving(true)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-navy hover:bg-slate-50">
                    <CalendarDays className="size-4" />
                    Réserver
                  </button>
                )}
                {canManage && (
                  <button type="button" onClick={() => setEditing(true)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-navy hover:bg-slate-50">
                    <Pencil className="size-4" />
                    Modifier
                  </button>
                )}
                {isAdmin && (
                  <ConfirmDialog
                    trigger={
                      <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-danger hover:bg-danger/10">
                        <Trash2 className="size-4" />
                        Supprimer
                      </button>
                    }
                    title="Supprimer cette salle ?"
                    description={`« ${room.name} » et ses réservations seront définitivement supprimées.`}
                    confirmLabel="Supprimer"
                    variant="destructive"
                    onConfirm={remove}
                  />
                )}
              </div>
            </details>
          )}
        </div>
        {error && <p role="alert" className="text-right text-xs text-danger">{error}</p>}
        {editing && <ResourceFormDialog action={updateResource.bind(null, room.id)} resource={room.resource} rooms={allRooms} open onOpenChange={(o) => !o && setEditing(false)} />}
        {reserving && <ReserveDialog resourceId={room.id} resourceName={room.name} open onOpenChange={(o) => !o && setReserving(false)} />}
      </td>
    </tr>
  );
}

function RoomDetail({ room, allRooms, canManage, canReserve }: { room: RoomView; allRooms: { id: string; name: string }[]; canManage: boolean; canReserve: boolean }) {
  const [photo, setPhoto] = useState(0);
  const [editing, setEditing] = useState(false);
  const [reserving, setReserving] = useState(false);
  const photos = room.meta.photos;
  const cats = new Map<string, number>();
  for (const e of room.equipment) cats.set(e.category ?? "Autres", (cats.get(e.category ?? "Autres") ?? 0) + 1);
  const chips = [...cats.entries()];

  return (
    <aside className="flex flex-col gap-4 self-start rounded-2xl border border-slate-200 bg-white p-4 xl:sticky xl:top-4">
      <div>
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-gradient-to-br from-navy to-primary">
          {photos.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element -- photo de salle (URL externe ou bucket public)
            <img src={photos[photo] ?? photos[0]} alt={room.name} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-white/70"><DoorOpen className="size-14" /></span>
          )}
          <span className={cn("absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[room.displayStatus])}>{STATUS_LABELS[room.displayStatus]}</span>
          {photos.length > 1 && (
            <>
              <button type="button" aria-label="Photo précédente" onClick={() => setPhoto((photo - 1 + photos.length) % photos.length)} className="absolute left-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white"><ChevronLeft className="size-4" /></button>
              <button type="button" aria-label="Photo suivante" onClick={() => setPhoto((photo + 1) % photos.length)} className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white"><ChevronRight className="size-4" /></button>
            </>
          )}
        </div>
        {photos.length > 1 && (
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {photos.slice(0, 5).map((p, i) => (
              <button key={p} type="button" onClick={() => setPhoto(i)} className={cn("aspect-[4/3] overflow-hidden rounded-md ring-offset-1", i === photo && "ring-2 ring-primary")}>
                {/* eslint-disable-next-line @next/next/no-img-element -- miniature */}
                <img src={p} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-bold text-navy">{room.name}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
          {room.meta.capacity && <span className="inline-flex items-center gap-1.5"><Users className="size-4 text-primary" />{room.meta.capacity} personnes</span>}
          {room.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-primary" />{room.location}</span>}
          {room.meta.roomType && <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", ROOM_TYPE_STYLES[room.meta.roomType] ?? "bg-slate-100 text-slate-600")}>{room.meta.roomType}</span>}
        </p>
        {room.description && <p className="mt-2 text-sm text-slate-700">{room.description}</p>}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-navy">Équipements</h4>
          <Link href={`/resources?tab=equipment&room=${room.id}`} className="text-xs font-medium text-primary hover:underline">Voir tout ({room.equipment.length})</Link>
        </div>
        {chips.length === 0 ? (
          <p className="text-xs text-slate-400">Aucun équipement affecté à cette salle.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {chips.map(([c, n]) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-navy">
                <CategoryIcon category={c} className="size-3.5 text-primary" />
                {c}
                {n > 1 && <span className="text-slate-400">({n})</span>}
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-navy">Prochaines réservations</h4>
          <Link href="/resources?tab=calendar" className="text-xs font-medium text-primary hover:underline">Voir le calendrier</Link>
        </div>
        {room.upcoming.length === 0 ? (
          <p className="text-xs text-slate-400">Aucune réservation à venir.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-100">
            {room.upcoming.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                <CalendarDays className="size-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy">{r.purpose || "Réservation"}</span>
                  <span className="block text-xs text-slate-500">{fmtRange(r.startsAt, r.endsAt)}</span>
                </span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", RESERVATION_STYLES[r.status])}>{RESERVATION_STATUS_LABELS[r.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2">
        {canManage ? (
          <Button type="button" variant="secondary" onClick={() => setEditing(true)} className="bg-blue-50 text-primary">
            <Pencil className="size-4" />
            Modifier
          </Button>
        ) : <span />}
        {canReserve && (
          <Button type="button" onClick={() => setReserving(true)} disabled={room.displayStatus === "maintenance" || room.displayStatus === "retired"} className="bg-navy hover:bg-navy/90">
            <CalendarDays className="size-4" />
            Réserver cette salle
          </Button>
        )}
      </div>
      {editing && <ResourceFormDialog action={updateResource.bind(null, room.id)} resource={room.resource} rooms={allRooms} open onOpenChange={(o) => !o && setEditing(false)} />}
      {reserving && <ReserveDialog resourceId={room.id} resourceName={room.name} open onOpenChange={(o) => !o && setReserving(false)} />}
    </aside>
  );
}
