"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Mail, MessageSquare, MoreVertical, Pencil, Send, Trash2, X } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteMessage, sendMessageNow } from "@/features/communication/actions/messages";
import { MESSAGE_STATUS_LABELS } from "@/features/communication/schemas/messages";
import type { MessageRow } from "@/features/communication/queries/messages";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  sent: "bg-success/10 text-success",
  scheduled: "bg-amber-100 text-amber-700",
  draft: "bg-slate-100 text-slate-600",
} as const;

function formatDate(date: Date) {
  return {
    d: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date),
    t: new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date),
  };
}

export function MessagesTable({
  rows,
  canSend,
  isAdmin,
  onEdit,
  onReuse,
}: {
  rows: MessageRow[];
  canSend: boolean;
  isAdmin: boolean;
  onEdit: (row: MessageRow) => void;
  onReuse: (row: MessageRow) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-semibold text-navy">
            <th className="px-3 py-2.5">Titre</th>
            <th className="px-3 py-2.5">Destinataires</th>
            <th className="px-3 py-2.5">Canal</th>
            <th className="px-3 py-2.5">Date d&apos;envoi</th>
            <th className="px-3 py-2.5">Statut</th>
            <th className="px-3 py-2.5">Statistiques</th>
            <th className="px-3 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Row key={row.id} row={row} canSend={canSend} isAdmin={isAdmin} onEdit={onEdit} onReuse={onReuse} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ row, canSend, isAdmin, onEdit, onReuse }: { row: MessageRow; canSend: boolean; isAdmin: boolean; onEdit: (r: MessageRow) => void; onReuse: (r: MessageRow) => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { d, t } = formatDate(row.date);
  const editable = row.status !== "sent";
  const canDelete = canSend && (editable || isAdmin);

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <tr className={cn("border-b border-slate-50 last:border-0 hover:bg-slate-50/60", pending && "opacity-60")}>
      <td className="px-3 py-3">
        <p className="max-w-[220px] truncate font-semibold text-navy" title={row.body}>{row.title}</p>
      </td>
      <td className="px-3 py-3 text-slate-600">{row.audience}</td>
      <td className="px-3 py-3">
        <span className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold", row.channel === "sms" ? "bg-blue-100 text-primary" : "bg-purple-100 text-purple-700")}>
          {row.channel === "sms" ? <MessageSquare className="size-3" /> : <Mail className="size-3" />}
          {row.channel === "sms" ? "SMS" : "Email"}
        </span>
      </td>
      <td className="px-3 py-3 text-slate-600">
        {d}
        <br />
        <span className="text-xs text-slate-400">{t}</span>
      </td>
      <td className="px-3 py-3">
        <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[row.status])}>{MESSAGE_STATUS_LABELS[row.status]}</span>
      </td>
      <td className="px-3 py-3">
        {row.status === "sent" ? (
          <div>
            <p className="font-semibold text-navy">{row.total}</p>
            <p className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-0.5 text-success"><Check className="size-3" />{row.delivered}</span>
              <span className="inline-flex items-center gap-0.5 text-danger"><X className="size-3" />{row.failed}</span>
            </p>
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="flex justify-end">
          {canSend && (
            <details className="relative">
              <summary className="flex cursor-pointer list-none rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Actions">
                <MoreVertical className="size-4" />
              </summary>
              <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                {editable && (
                  <>
                    <button type="button" onClick={() => onEdit(row)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-navy hover:bg-slate-50">
                      <Pencil className="size-4" />
                      Modifier
                    </button>
                    <button type="button" onClick={() => run(() => sendMessageNow(row.id))} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-navy hover:bg-slate-50">
                      <Send className="size-4" />
                      Envoyer maintenant
                    </button>
                  </>
                )}
                <button type="button" onClick={() => onReuse(row)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-navy hover:bg-slate-50">
                  <Copy className="size-4" />
                  Dupliquer
                </button>
                {canDelete && (
                  <ConfirmDialog
                    trigger={
                      <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-danger hover:bg-danger/10">
                        <Trash2 className="size-4" />
                        Supprimer
                      </button>
                    }
                    title="Supprimer ce message ?"
                    description={`« ${row.title} » sera définitivement supprimé.`}
                    confirmLabel="Supprimer"
                    variant="destructive"
                    onConfirm={() => run(() => deleteMessage(row.id))}
                  />
                )}
              </div>
            </details>
          )}
        </div>
        {error && <p role="alert" className="mt-1 text-right text-xs text-danger">{error}</p>}
      </td>
    </tr>
  );
}
