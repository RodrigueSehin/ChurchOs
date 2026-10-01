"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { registerMedia } from "@/features/media/actions";
import { MEDIA_BUCKET, MEDIA_MAX_BYTES, UPLOAD_ACCEPT, UPLOAD_MIME_KINDS, formatBytes, resolveUploadMime, sanitizeFilename } from "@/features/media/schemas";

function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** Téléversement de photos, audios et documents : envoi direct navigateur → Storage, puis enregistrement des métadonnées. */
export function AddMediaDialog({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setFiles([]);
    setTags("");
    setError(null);
    setProgress(null);
  }

  function pick(list: FileList | null) {
    if (!list) return;
    setError(null);
    const next = [...files];
    for (const f of Array.from(list)) {
      if (!UPLOAD_MIME_KINDS[resolveUploadMime(f)]) return setError(`« ${f.name} » : type non autorisé (photos, MP3/M4A/WAV/OGG, PDF, DOCX).`);
      if (f.size > MEDIA_MAX_BYTES) return setError(`« ${f.name} » dépasse 100 Mo.`);
      next.push(f);
    }
    setFiles(next.slice(0, 20));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const uploaded: { path: string; name: string; mime: string; size: number; title: string; width?: number | null; height?: number | null }[] = [];
      const discard = () => supabase.storage.from(MEDIA_BUCKET).remove(uploaded.map((u) => u.path));
      for (const [i, file] of files.entries()) {
        setProgress(`Envoi ${i + 1}/${files.length}…`);
        const mime = resolveUploadMime(file);
        const path = `${organizationId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
        const { error: upErr } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: mime });
        if (upErr) {
          await discard();
          setProgress(null);
          return setError(`Échec du téléversement de « ${file.name} » : ${upErr.message}`);
        }
        const dims = UPLOAD_MIME_KINDS[mime] === "photo" ? await imageSize(file) : null;
        uploaded.push({ path, name: file.name, mime, size: file.size, title: file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || file.name, ...dims });
      }
      setProgress("Enregistrement…");
      const res = await registerMedia({ files: uploaded, tags: tags.split(",") });
      setProgress(null);
      if (res.error) return setError(res.error);
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="bg-primary">
        <Plus className="size-4" />
        Ajouter un média
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!pending) { setOpen(o); if (!o) reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter des médias</DialogTitle>
            <DialogDescription>Photos, audios (MP3, M4A, WAV, OGG) et documents (PDF, DOCX), 100 Mo maximum par fichier. Les vidéos proviennent de la chaîne YouTube.</DialogDescription>
          </DialogHeader>
          <input ref={inputRef} type="file" multiple accept={UPLOAD_ACCEPT} className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
          <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 hover:border-primary hover:text-primary">
            Cliquez pour choisir des fichiers (20 maximum)
          </button>
          {files.length > 0 && (
            <ul className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 text-sm">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-1.5 last:border-0">
                  <span className="truncate text-navy">{f.name}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                    {formatBytes(f.size)}
                    <button type="button" disabled={pending} onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Retirer ${f.name}`}>
                      <X className="size-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (séparés par des virgules) : Culte, Louange" />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" disabled={pending || files.length === 0} onClick={submit}>
              {progress ?? "Téléverser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
