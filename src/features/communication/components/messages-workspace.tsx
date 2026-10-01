"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { MessageComposer, type ComposerDraft, type ComposerOptions } from "@/features/communication/components/message-composer";
import { MessagesTable } from "@/features/communication/components/messages-table";
import type { MessageRow } from "@/features/communication/queries/messages";
import { parseAudience } from "@/features/communication/schemas/messages";

function audienceIds(filter: unknown): string[] {
  const a = parseAudience(filter);
  if (a.type === "targets") return a.targets.map((t) => `${t.type}:${t.id}`);
  if (a.type === "people") return a.personIds.map((id) => `person:${id}`);
  return ["all"];
}

function toLocalInput(date: Date | null) {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Liste des messages (gauche) + composeur « Nouveau message » (droite) ; « Modifier » / « Dupliquer » préremplissent le composeur. */
export function MessagesWorkspace({
  rows,
  options,
  canSend,
  isAdmin,
  toolbar,
  footer,
  empty,
}: {
  rows: MessageRow[];
  options: ComposerOptions;
  canSend: boolean;
  isAdmin: boolean;
  toolbar: React.ReactNode;
  footer: React.ReactNode;
  empty: React.ReactNode;
}) {
  const [draft, setDraft] = useState<ComposerDraft | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function load(row: MessageRow, keepId: boolean) {
    setDraft({
      key: `${row.id}-${Date.now()}`,
      id: keepId ? row.id : undefined,
      channel: row.channel,
      title: row.title === row.body.replace(/\s+/g, " ").slice(0, 60) ? "" : row.title,
      body: row.body,
      audience: audienceIds(row.filter),
      scheduledAt: keepId ? toLocalInput(row.scheduledAt) : "",
      templateId: row.templateId ?? "",
    });
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          {toolbar}
          {rows.length === 0 ? empty : <MessagesTable rows={rows} canSend={canSend} isAdmin={isAdmin} onEdit={(r) => load(r, true)} onReuse={(r) => load(r, false)} />}
          {footer}
        </CardContent>
      </Card>
      {canSend && <MessageComposer key={draft?.key ?? "new"} options={options} draft={draft} notice={notice} onNotice={setNotice} onReset={() => setDraft(null)} />}
    </div>
  );
}
