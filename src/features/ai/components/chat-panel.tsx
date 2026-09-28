"use client";

import { useActionState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sendMessage, type AiActionState } from "@/features/ai/actions";
import type { getConversationMessages } from "@/features/ai/queries";

type Message = Awaited<ReturnType<typeof getConversationMessages>>[number];

const initialState: AiActionState = {};

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(new Date(date));
}

export function ChatPanel({ conversationId, messages }: { conversationId: string; messages: Message[] }) {
  const boundAction = sendMessage.bind(null, conversationId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const visible = messages.filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim() !== "");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visible.length]);

  useEffect(() => {
    if (!pending) formRef.current?.reset();
  }, [pending]);

  return (
    <div className="flex h-[calc(100vh-14rem)] flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex-1 overflow-y-auto p-4">
        {visible.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-400">
            <Sparkles className="size-8 text-primary/40" />
            <p>Posez une question sur les membres, présences, finances, événements ou le suivi pastoral.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((message) => (
              <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-white"
                      : "max-w-[80%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2 text-sm text-slate-800"
                  }
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className={message.role === "user" ? "mt-1 text-[11px] text-white/70" : "mt-1 text-[11px] text-slate-400"}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form ref={formRef} action={formAction} className="flex items-end gap-2 border-t border-slate-100 p-3">
        <textarea
          name="content"
          rows={2}
          required
          disabled={pending}
          placeholder="Écrivez votre message..."
          className="flex w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Envoi..." : "Envoyer"}
        </Button>
      </form>
      {state.error && <p className="px-3 pb-3 text-xs text-danger">{state.error}</p>}
    </div>
  );
}
