"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteResource, updateResource } from "@/features/resources/actions";
import { CategoryIcon } from "@/features/resources/components/equipment-icons";
import { ReserveDialog } from "@/features/resources/components/reserve-dialog";
import { ResourceFormDialog } from "@/features/resources/components/resource-form-dialog";
import type { ResourceRowData } from "@/features/resources/queries";
import { RESOURCE_STATUS_LABELS, RESOURCE_TYPE_LABELS, readMeta } from "@/features/resources/schemas";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  available: "bg-success/10 text-success",
  maintenance: "bg-red-100 text-red-600",
  retired: "bg-slate-100 text-slate-500",
};

export function EquipmentTable({ items, roomNames, rooms, canManage, canReserve, isAdmin }: { items: ResourceRowData[]; roomNames: Record<string, string>; rooms: { id: string; name: string }[]; canManage: boolean; canReserve: boolean; isAdmin: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-semibold text-navy">
            <th className="px-3 py-2.5">Équipement</th>
            <th className="px-3 py-2.5">Catégorie</th>
            <th className="px-3 py-2.5">Quantité</th>
            <th className="px-3 py-2.5">Salle</th>
            <th className="px-3 py-2.5">Statut</th>
            <th className="px-3 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <Row key={item.id} item={item} roomName={roomNames[readMeta(item.metadata).roomId ?? ""]} rooms={rooms} canManage={canManage} canReserve={canReserve} isAdmin={isAdmin} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ item, roomName, rooms, canManage, canReserve, isAdmin }: { item: ResourceRowData; roomName?: string; rooms: { id: string; name: string }[]; canManage: boolean; canReserve: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = readMeta(item.metadata);

  async function remove() {
    const res = await deleteResource(item.id);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
      <td className="px-3 py-3">
        <span className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-primary"><CategoryIcon category={meta.category} className="size-4" /></span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-navy">{item.name}</span>
            {item.type !== "equipment" && <span className="text-xs text-slate-400">{RESOURCE_TYPE_LABELS[item.type]}</span>}
          </span>
        </span>
      </td>
      <td className="px-3 py-3 text-slate-600">{meta.category ?? "—"}</td>
      <td className="px-3 py-3 text-slate-600">{item.quantity}</td>
      <td className="px-3 py-3 text-slate-600">{roomName ?? <span className="text-slate-400">Non affecté</span>}</td>
      <td className="px-3 py-3">
        <span className={cn("inline-block rounded-md px-2.5 py-1 text-xs font-medium", STATUS_STYLES[item.status])}>{RESOURCE_STATUS_LABELS[item.status]}</span>
      </td>
      <td className="px-3 py-3">
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
                    title="Supprimer cet équipement ?"
                    description={`« ${item.name} » et ses réservations seront définitivement supprimés.`}
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
        {editing && <ResourceFormDialog action={updateResource.bind(null, item.id)} resource={item} rooms={rooms} open onOpenChange={(o) => !o && setEditing(false)} />}
        {reserving && <ReserveDialog resourceId={item.id} resourceName={item.name} open onOpenChange={(o) => !o && setReserving(false)} />}
      </td>
    </tr>
  );
}
