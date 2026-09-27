"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";

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
import { uploadDocument, type DocumentActionState } from "@/features/documents/actions";
import { DOCUMENT_VISIBILITY_LABELS } from "@/features/documents/schemas";

const initialState: DocumentActionState = {};

const ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,image/png,image/jpeg,image/webp";

export function UploadDocumentDialog({ folderId }: { folderId: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: DocumentActionState, formData: FormData) => {
    const result = await uploadDocument(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Upload className="size-4" />
        Téléverser un document
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Téléverser un document</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="folderId" value={folderId ?? ""} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="upload-file">Fichier * (PDF, Word, Excel, PowerPoint, texte, CSV ou image — 25 Mo max)</Label>
            <input
              id="upload-file"
              name="file"
              type="file"
              accept={ACCEPT}
              required
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="upload-name">Nom affiché (optionnel, sinon le nom du fichier)</Label>
            <Input id="upload-name" name="name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="upload-visibility">Visibilité</Label>
            <FormSelect id="upload-visibility" name="visibility" defaultValue="organization">
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
              {pending ? "Téléversement..." : "Téléverser"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
