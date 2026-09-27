"use client";

import { useActionState, useState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelect } from "@/components/shared/form-select";
import { sendMessage, type CommunicationActionState } from "@/features/communication/actions";

const initialState: CommunicationActionState = {};

interface EmailTemplate {
  id: string;
  name: string;
  subject: string | null;
  body: string;
}

interface Recipient {
  id: string;
  name: string;
  email: string;
}

export function ComposeMessageForm({ templates, recipients }: { templates: EmailTemplate[]; recipients: Recipient[] }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [state, formAction, pending] = useActionState(async (prev: CommunicationActionState, formData: FormData) => {
    const result = await sendMessage(prev, formData);
    if (result.success) {
      setSubject("");
      setBody("");
      setSelectedIds([]);
      window.location.reload();
    }
    return result;
  }, initialState);

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject ?? "");
      setBody(template.body);
    }
  }

  function toggleRecipient(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Composer un message (email)</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {selectedIds.map((id) => (
            <input key={id} type="hidden" name="personIds" value={id} />
          ))}

          {templates.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="compose-template">Modèle (optionnel)</Label>
              <FormSelect id="compose-template" name="templateId" defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
                <option value="">Aucun (rédaction libre)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </FormSelect>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compose-subject">Sujet *</Label>
            <Input id="compose-subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compose-body">Contenu *</Label>
            <textarea
              id="compose-body"
              name="body"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Destinataires * ({selectedIds.length} sélectionné(s))</Label>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {recipients.length === 0 ? (
                <p className="p-2 text-sm text-slate-400">Aucune personne avec une adresse email dans cette organisation.</p>
              ) : (
                recipients.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={() => toggleRecipient(r.id)}
                      className="size-4 rounded border-slate-300"
                    />
                    <span className="text-navy">{r.name}</span>
                    <span className="text-xs text-slate-400">{r.email}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <Button type="submit" disabled={pending || selectedIds.length === 0} className="self-start">
            <Send className="size-4" />
            {pending ? "Envoi..." : "Envoyer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
