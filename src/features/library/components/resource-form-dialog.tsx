"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarDays, Download, Eye, Bookmark, ImagePlus, Info, Lock, Plus, Save, Tag, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { IconInput } from "@/components/shared/icon-input";
import { registerResource } from "@/features/library/actions";
import {
  COVER_MAX_BYTES,
  COVER_MIME_EXTENSIONS,
  LIBRARY_BUCKET,
  LIBRARY_COVER_BUCKET,
  RESOURCE_MAX_BYTES,
  RESOURCE_MIME_TYPES,
  resolveResourceMime,
  RESOURCE_STATUS_LABELS,
  RESOURCE_TYPE_LABELS,
  RESOURCE_VISIBILITY_LABELS,
  formatKind,
} from "@/features/library/schemas";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<string, string> = { published: "bg-success", draft: "bg-amber-400", archived: "bg-slate-400" };

function SectionTitle({ step, title, hint, tone }: { step: number; title: string; hint: string; tone: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5", tone)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-sm font-bold">{step}</span>
      <div>
        <p className="text-sm font-semibold text-navy">{title}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

/** Formulaire « Ajouter une ressource » : 3 sections + aperçu de la carte. Les fichiers partent
 * directement du navigateur vers Supabase Storage (100 Mo / 5 Mo : au-delà de la limite Vercel). */
export function ResourceFormDialog({
  organizationId,
  categories,
}: {
  organizationId: string;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("published");
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "";

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (f && !RESOURCE_MIME_TYPES.includes(resolveResourceMime(f))) {
      setError("Fichier : PDF ou DOCX uniquement.");
      e.target.value = "";
      return setFile(null);
    }
    if (f && f.size > RESOURCE_MAX_BYTES) {
      setError("Fichier trop volumineux (100 Mo maximum).");
      e.target.value = "";
      return setFile(null);
    }
    setFile(f);
  }

  function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (f && (!COVER_MIME_EXTENSIONS[f.type] || f.size > COVER_MAX_BYTES)) {
      setError("Image : JPG, PNG ou WebP, 5 Mo maximum.");
      e.target.value = "";
      setCover(null);
      return setCoverPreview(null);
    }
    setCover(f);
    setCoverPreview(f ? URL.createObjectURL(f) : null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Ajoutez le fichier de la ressource.");
    const formData = new FormData(e.currentTarget);
    const fields: Record<string, string> = {};
    for (const key of ["title", "resourceType", "categoryId", "author", "publishedOn", "publisher", "description", "visibility", "status", "tags"]) {
      fields[key] = String(formData.get(key) ?? "");
    }

    startTransition(async () => {
      const supabase = createClient();
      const fileMime = resolveResourceMime(file);
      const filePath = `${organizationId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
      let coverPath: string | undefined;
      try {
        const { error: uploadError } = await supabase.storage.from(LIBRARY_BUCKET).upload(filePath, file, { contentType: fileMime });
        if (uploadError) return setError(`Échec du téléversement : ${uploadError.message}`);

        if (cover) {
          coverPath = `${organizationId}/${crypto.randomUUID()}.${COVER_MIME_EXTENSIONS[cover.type]}`;
          const { error: coverError } = await supabase.storage.from(LIBRARY_COVER_BUCKET).upload(coverPath, cover, { contentType: cover.type });
          if (coverError) {
            await supabase.storage.from(LIBRARY_BUCKET).remove([filePath]);
            return setError(`Échec du téléversement de l'image : ${coverError.message}`);
          }
        }

        const result = await registerResource({
          filePath,
          fileName: file.name,
          fileMime,
          fileSize: file.size,
          fields,
          coverPath,
          coverMime: cover?.type,
          coverSize: cover?.size,
        });
        if (result.error) return setError(result.error);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Ajouter une ressource
      </Button>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader className="flex-row items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <BookOpen className="size-6" />
          </span>
          <div>
            <DialogTitle className="text-xl">Ajouter une ressource</DialogTitle>
            <DialogDescription>Partagez un livre, une étude, un enseignement ou tout autre document édifiant (PDF ou DOCX).</DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-5">
            <SectionTitle step={1} title="Informations générales" hint="Renseignez les informations principales de la ressource." tone="bg-blue-50 text-blue-600" />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="res-title">Titre de la ressource *</Label>
              <Input id="res-title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required placeholder="Ex : Les fondements de la foi chrétienne" />
              <span className="text-right text-[11px] text-slate-400">{title.length}/200</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="res-type">Type de ressource *</Label>
                <FormSelect id="res-type" name="resourceType" value={type} onChange={(e) => setType(e.target.value)} required>
                  <option value="">Sélectionner un type</option>
                  {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </FormSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="res-category">Catégorie *</Label>
                <FormSelect id="res-category" name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </FormSelect>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="res-author">Auteur / Intervenant (optionnel)</Label>
                <Input id="res-author" name="author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Ex : Pasteur Kouman Gondo" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="res-published">Année de publication (optionnelle)</Label>
                <IconInput icon={CalendarDays} id="res-published" name="publishedOn" type="date" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="res-publisher">Éditeur / Source (optionnel)</Label>
                <Input id="res-publisher" name="publisher" placeholder="Ex : Église La Source" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="res-description">Description *</Label>
              <textarea
                id="res-description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                required
                rows={3}
                placeholder="Résumé du contenu, principaux thèmes, objectifs..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
              <span className="text-right text-[11px] text-slate-400">{description.length}/500</span>
            </div>

            <SectionTitle step={2} title="Fichier et médias" hint="Ajoutez le fichier et une image de couverture." tone="bg-green-50 text-green-600" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Fichier de la ressource *</Label>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-primary/40 bg-blue-50/60 p-3 text-center text-sm text-navy hover:bg-blue-50"
                >
                  <Upload className="size-5 text-primary" />
                  {file ? file.name : "Cliquer pour ajouter un fichier"}
                  <span className="text-[11px] text-slate-500">PDF ou DOCX (max 100 Mo)</span>
                </button>
                <input ref={fileInput} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={onFileChange} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Image de couverture (optionnelle)</Label>
                <button
                  type="button"
                  onClick={() => coverInput.current?.click()}
                  className="relative flex min-h-28 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-dashed border-primary/40 bg-blue-50/60 p-3 text-center text-sm text-navy hover:bg-blue-50"
                >
                  {coverPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob)
                    <img src={coverPreview} alt="" className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <>
                      <ImagePlus className="size-5 text-primary" />
                      Ajouter une image
                      <span className="text-[11px] text-slate-500">JPG, PNG (max 5 Mo)</span>
                    </>
                  )}
                </button>
                <input ref={coverInput} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="sr-only" onChange={onCoverChange} />
              </div>
            </div>

            <SectionTitle step={3} title="Visibilité et paramètres" hint="Définissez qui peut voir et accéder à cette ressource." tone="bg-purple-50 text-purple-600" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="res-visibility">Visibilité *</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
                  <FormSelect id="res-visibility" name="visibility" defaultValue="members" className="pl-9">
                    {Object.entries(RESOURCE_VISIBILITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </FormSelect>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="res-status">Statut *</Label>
                <div className="relative">
                  <span className={cn("pointer-events-none absolute left-3 top-1/2 z-10 size-2.5 -translate-y-1/2 rounded-full", STATUS_DOT[status])} />
                  <FormSelect id="res-status" name="status" value={status} onChange={(e) => setStatus(e.target.value)} className="pl-8">
                    {Object.entries(RESOURCE_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </FormSelect>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="res-tags">Tags / Mots-clés (optionnels)</Label>
                <div className="relative">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input id="res-tags" name="tags" placeholder="Ex : prière, foi, leadership" className="pl-9" />
                </div>
              </div>
            </div>

            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                <Save className="size-4" />
                {pending ? "Envoi en cours..." : "Enregistrer la ressource"}
              </Button>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
                <span className="flex size-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <BookOpen className="size-4" />
                </span>
                Aperçu
              </p>
              <div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-lg bg-gradient-to-br from-navy to-primary">
                {coverPreview && (
                  // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob)
                  <img src={coverPreview} alt="" className="size-full object-cover" />
                )}
                {file && (
                  <span className="absolute left-2 top-2 rounded bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-navy">{formatKind(resolveResourceMime(file))}</span>
                )}
              </div>
              <p className="text-sm font-semibold text-navy">{title || "Titre de la ressource"}</p>
              <p className="text-xs text-slate-500">{author || "Auteur"}</p>
              {categoryName && <span className="mt-2 inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-primary">{categoryName}</span>}
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><Eye className="size-3.5" />0</span>
                <span className="inline-flex items-center gap-1"><Download className="size-3.5" />0</span>
                <Bookmark className="ml-auto size-4 text-slate-300" />
              </div>
            </div>
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy">
                <Info className="size-4 text-blue-600" />
                Conseils
              </p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                <li>Utilisez un titre clair et descriptif.</li>
                <li>Ajoutez une image de couverture.</li>
                <li>Rédigez un bon résumé pour aider les membres à comprendre le contenu.</li>
                <li>Choisissez les bons mots-clés pour faciliter la recherche.</li>
                <li>Assurez-vous d&apos;avoir les droits de partage du contenu.</li>
              </ul>
            </div>
          </aside>
        </form>
      </DialogContent>
    </Dialog>
  );
}
