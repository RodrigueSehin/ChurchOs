"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { createTemplate, type CommunicationActionState } from "@/features/communication/actions";
import { TEMPLATE_CHANNEL_LABELS } from "@/features/communication/schemas";

const initialState: CommunicationActionState = {};

export function TemplateFormDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: CommunicationActionState, formData: FormData) => {
    const result = await createTemplate(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nouveau modèle
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau modèle de message</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="template-name">Nom *</Label>
              <Input id="template-name" name="name" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="template-channel">Canal</Label>
              <FormSelect id="template-channel" name="channel" defaultValue="email">
                {Object.entries(TEMPLATE_CHANNEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-subject">Sujet (optionnel, email)</Label>
            <Input id="template-subject" name="subject" placeholder="Ex : Annonce importante" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-body">Contenu *</Label>
            <textarea
              id="template-body"
              name="body"
              rows={4}
              required
              placeholder="Bonjour {{prenom}}, ..."
              className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-variables">Variables (optionnel, séparées par des virgules)</Label>
            <Input id="template-variables" name="variables" placeholder="prenom, nom" />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
