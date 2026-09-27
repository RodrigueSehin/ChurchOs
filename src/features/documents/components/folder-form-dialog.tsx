"use client";

import { useActionState, useState } from "react";
import { FolderPlus } from "lucide-react";

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
import { createFolder, type DocumentActionState } from "@/features/documents/actions";
import { DOCUMENT_VISIBILITY_LABELS } from "@/features/documents/schemas";

const initialState: DocumentActionState = {};

export function FolderFormDialog({ parentId }: { parentId: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: DocumentActionState, formData: FormData) => {
    const result = await createFolder(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <FolderPlus className="size-4" />
        Nouveau dossier
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau dossier</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="parentId" value={parentId ?? ""} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder-name">Nom *</Label>
            <Input id="folder-name" name="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder-visibility">Visibilité</Label>
            <FormSelect id="folder-visibility" name="visibility" defaultValue="organization">
              {Object.entries(DOCUMENT_VISIBILITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FormSelect>
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
