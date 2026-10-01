"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Mail, MessageSquare, Megaphone, MoreVertical, Pencil, Trash2, Users } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteAnnouncement, markAnnouncementRead, updateAnnouncement } from "@/features/communication/actions";
import { AnnouncementFormDialog } from "@/features/communication/components/announcement-form-dialog";
import type { FeedItem } from "@/features/communication/queries";
import { ANNOUNCEMENT_STATUS_LABELS } from "@/features/communication/schemas";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  published: "bg-success/10 text-success",
  scheduled: "bg-amber-100 text-amber-700",
  draft: "bg-slate-100 text-slate-600",
  archived: "bg-slate-100 text-slate-500",
};

function formatDate(date: Date) {
  const d = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  const t = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date);
  return { d, t };
}

type AudienceOptions = { groups: { id: string; name: string }[]; ministries: { id: string; name: string }[] };

export function FeedTable({
  rows,
  canManage,
  isAdmin,
  audienceOptions,
}: {
  rows: FeedItem[];
  canManage: boolean;
  isAdmin: boolean;
  audienceOptions: AudienceOptions;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-semibold text-navy">
            <th className="px-3 py-2.5">Titre</th>
            <th className="px-3 py-2.5">Type</th>
            <th className="px-3 py-2.5">Destinataires</th>
            <th className="px-3 py-2.5">Date de publication</th>
            <th className="px-3 py-2.5">Statut</th>
            <th className="px-3 py-2.5">Vues</th>
            <th className="px-3 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <FeedRow key={`${row.kind}-${row.id}`} item={row} canManage={canManage} isAdmin={isAdmin} audienceOptions={audienceOptions} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeedRow({
  item,
  canManage,
  isAdmin,
  audienceOptions,
}: {
  item: FeedItem;
  canManage: boolean;
  isAdmin: boolean;
  audienceOptions: AudienceOptions;
}) {
  const router = useRouter();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { d, t } = formatDate(item.date);
  const isAnnouncement = item.kind === "announcement";
  const ChannelIcon = item.channel === "email" ? Mail : MessageSquare;

  function open() {
    if (!isAnnouncement) return;
    setReading(true);
    // Compte une lecture par utilisateur (idempotent côté serveur).
    startTransition(async () => {
      await markAnnouncementRead(item.id);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteAnnouncement(item.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-navy to-primary text-white/80">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- image du bucket public
              <img src={item.imageUrl} alt="" className="size-full object-cover" />
            ) : isAnnouncement ? (
              <Megaphone className="size-5" />
            ) : (
              <ChannelIcon className="size-5" />
            )}
          </span>
          <div className="min-w-0">
            {isAnnouncement ? (
              <button type="button" onClick={open} className="block max-w-xs truncate text-left font-semibold text-navy hover:underline">
                {item.title}
              </button>
            ) : (
              <Link href="/communication?tab=history" className="block max-w-xs truncate font-semibold text-navy hover:underline">
                {item.title}
              </Link>
            )}
            <p className="max-w-xs truncate text-xs text-slate-500">{item.excerpt}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <span className={cn("rounded-md px-2.5 py-1 text-xs font-medium", isAnnouncement ? "bg-blue-50 text-primary" : "bg-purple-100 text-purple-700")}>
          {isAnnouncement ? "Annonce" : "Message"}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-2 text-slate-600">
          <Users className="size-4 shrink-0 text-primary" />
          {item.recipients}
        </span>
      </td>
      <td className="px-3 py-3 text-slate-600">
        {d}
        <br />
        <span className="text-xs text-slate-400">{t}</span>
      </td>
      <td className="px-3 py-3">
        <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[item.status])}>
          {ANNOUNCEMENT_STATUS_LABELS[item.status]}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <Eye className="size-4 text-slate-400" />
          {item.views}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center justify-end">
          {isAnnouncement && (
            <details className="relative">
              <summary className="flex cursor-pointer list-none rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Actions">
                <MoreVertical className="size-4" />
              </summary>
              <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                <button type="button" onClick={open} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-navy hover:bg-slate-50">
                  <Eye className="size-4" />
                  Lire
                </button>
                {canManage && item.announcement && (
                  <AnnouncementFormDialog
                    action={updateAnnouncement.bind(null, item.id)}
                    announcement={item.announcement}
                    audienceOptions={audienceOptions}
                    trigger={
                      <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-navy hover:bg-slate-50">
                        <Pencil className="size-4" />
                        Modifier
                      </button>
                    }
                  />
                )}
                {isAdmin && (
                  <ConfirmDialog
                    trigger={
                      <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-danger hover:bg-danger/10">
                        <Trash2 className="size-4" />
                        Supprimer
                      </button>
                    }
                    title="Supprimer cette annonce ?"
                    description={`« ${item.title} » sera définitivement supprimée.`}
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
        {isAnnouncement && (
          <Dialog open={reading} onOpenChange={setReading}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{item.title}</DialogTitle>
                <DialogDescription>
                  {d} à {t} · {item.recipients}
                </DialogDescription>
              </DialogHeader>
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- image du bucket public
                <img src={item.imageUrl} alt="" className="mb-3 max-h-64 w-full rounded-lg object-cover" />
              )}
              <p className="whitespace-pre-wrap text-sm text-slate-700">{item.announcement?.content}</p>
            </DialogContent>
          </Dialog>
        )}
      </td>
    </tr>
  );
}
