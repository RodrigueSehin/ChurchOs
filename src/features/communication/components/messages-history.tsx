"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { refreshMessageStatuses } from "@/features/communication/actions";
import { NOTIFICATION_STATUS_LABELS } from "@/features/communication/schemas";
import type { getMessageRecipients, getMessages } from "@/features/communication/queries";

type Message = Awaited<ReturnType<typeof getMessages>>["rows"][number];
type Recipient = Awaited<ReturnType<typeof getMessageRecipients>>[number];

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  queued: "secondary",
  sent: "warning",
  delivered: "success",
  failed: "danger",
  read: "success",
};

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function MessagesHistory({
  messages,
  recipientsByMessage,
  canSend,
}: {
  messages: Message[];
  recipientsByMessage: Record<string, Recipient[]>;
  canSend: boolean;
}) {
  if (messages.length === 0) {
    return <EmptyState title="Aucun message envoyé" description="L'historique de vos campagnes apparaîtra ici." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} recipients={recipientsByMessage[message.id] ?? []} canSend={canSend} />
      ))}
    </div>
  );
}

function MessageRow({ message, recipients, canSend }: { message: Message; recipients: Recipient[]; canSend: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRefresh() {
    startTransition(async () => {
      const res = await refreshMessageStatuses(message.id);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  const counts = message.recipients.counts;

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setExpanded((v) => !v)}>
          <span className="truncate text-sm font-medium text-navy">{message.subject}</span>
          <p className="mt-0.5 text-xs text-slate-400">
            Envoyé le {formatDate(message.sentAt)} · {message.recipients.total} destinataire(s)
          </p>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Object.entries(counts).map(([status, n]) => (
              <Badge key={status} variant={STATUS_VARIANT[status] ?? "secondary"} className="text-[10px]">
                {NOTIFICATION_STATUS_LABELS[status] ?? status} {n}
              </Badge>
            ))}
          </div>
          {canSend && (
            <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleRefresh}>
              <RefreshCw className={isPending ? "size-4 animate-spin" : "size-4"} />
            </Button>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {expanded && (
        <div className="mt-3 flex flex-col gap-1 border-t border-slate-100 pt-3">
          <p className="whitespace-pre-wrap text-sm text-slate-600">{message.body}</p>
          <div className="mt-2 flex flex-col gap-1">
            {recipients.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-500">
                  {r.firstName} {r.lastName} · {r.email}
                </span>
                <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"} className="text-[10px]">
                  {NOTIFICATION_STATUS_LABELS[r.status] ?? r.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
