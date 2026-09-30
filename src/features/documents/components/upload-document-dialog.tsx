"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { registerDocument } from "@/features/documents/actions";
import { ALLOWED_MIME_TYPES, DOCUMENT_VISIBILITY_LABELS, MAX_FILE_SIZE_BYTES } from "@/features/documents/schemas";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "churchos-documents";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

const ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,image/png,image/jpeg,image/webp";

export function UploadDocumentDialog({ folderId, organizationId }: { folderId: string | null; organizationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /** Envoi direct navigateur → Supabase Storage (pas de passage par une Server Action : la limite
   * de corps de requête de Vercel rejetait les fichiers), puis enregistrement des métadonnées. */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return setError("Sélectionnez un fichier.");
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return setError("Type de fichier non autorisé (PDF, Word, Excel, PowerPoint, texte, CSV ou image uniquement).");
    }
    if (file.size > MAX_FILE_SIZE_BYTES) return setError("Fichier trop volumineux (25 Mo maximum).");

    startTransition(async () => {
      try {
        const path = `${organizationId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
        if (uploadError) return setError(`Échec du téléversement : ${uploadError.message}`);

        const name = String(formData.get("name") ?? "").trim();
        const result = await registerDocument({
          path,
          name: name || file.name,
          folderId: String(formData.get("folderId") ?? ""),
          visibility: String(formData.get("visibility") ?? "organization"),
          mimeType: file.type,
          sizeBytes: file.size,
        });
        if (result.error) return setError(result.error);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Échec du téléversement.");
      }
    });
  }

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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
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
