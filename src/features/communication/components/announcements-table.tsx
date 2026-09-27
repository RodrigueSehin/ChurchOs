"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateAnnouncement } from "@/features/communication/actions";
import { ANNOUNCEMENT_STATUS_LABELS } from "@/features/communication/schemas";
import { AnnouncementFormDialog } from "@/features/communication/components/announcement-form-dialog";
import { DeleteAnnouncementButton } from "@/features/communication/components/delete-announcement-button";
import type { getAnnouncements } from "@/features/communication/queries";

type Announcement = Awaited<ReturnType<typeof getAnnouncements>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning"> = {
  draft: "secondary",
  scheduled: "warning",
  published: "success",
  archived: "secondary",
};

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AnnouncementsTable({ rows, canManage, isAdmin }: { rows: Announcement[]; canManage: boolean; isAdmin: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <AnnouncementRow key={row.id} announcement={row} canManage={canManage} isAdmin={isAdmin} />
      ))}
    </div>
  );
}

function AnnouncementRow({
  announcement,
  canManage,
  isAdmin,
}: {
  announcement: Announcement;
  canManage: boolean;
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setExpanded((v) => !v)}>
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-navy">{announcement.title}</span>
            <Badge variant={STATUS_VARIANT[announcement.status] ?? "secondary"}>
              {ANNOUNCEMENT_STATUS_LABELS[announcement.status] ?? announcement.status}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Créée le {formatDate(announcement.createdAt)}
            {announcement.publishAt ? ` · Publication le ${formatDate(announcement.publishAt)}` : ""}
          </p>
        </button>
        {canManage && (
          <div className="flex items-center gap-1">
            <AnnouncementFormDialog
              action={updateAnnouncement.bind(null, announcement.id)}
              announcement={announcement}
              trigger={
                <Button type="button" variant="ghost" size="sm">
                  <Pencil className="size-4" />
                </Button>
              }
            />
            {isAdmin && <DeleteAnnouncementButton announcementId={announcement.id} announcementTitle={announcement.title} />}
          </div>
        )}
      </div>
      {expanded && <p className="mt-3 whitespace-pre-wrap border-t border-slate-100 pt-3 text-sm text-slate-600">{announcement.content}</p>}
    </div>
  );
}
