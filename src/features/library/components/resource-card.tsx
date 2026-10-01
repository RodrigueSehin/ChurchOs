"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Download, Eye, FileText, Film, Headphones, ImageIcon, MoreVertical, Star, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { accessResource, deleteResource, rateResource, toggleBookmark } from "@/features/library/actions";
import { formatKind, formatSize } from "@/features/library/schemas";
import type { getLibraryResources } from "@/features/library/queries";
import { cn } from "@/lib/utils";

type Resource = Awaited<ReturnType<typeof getLibraryResources>>["rows"][number];

function KindIcon({ mime, className }: { mime: string | null | undefined; className?: string }) {
  if (mime?.startsWith("video/")) return <Film className={className} />;
  if (mime?.startsWith("audio/")) return <Headphones className={className} />;
  if (mime?.startsWith("image/")) return <ImageIcon className={className} />;
  return <FileText className={className} />;
}

/** Carte d'une ressource : couverture, catégorie, titre, auteur, format, compteurs et actions
 * (ouvrir, favori, télécharger, menu : noter / supprimer). */
export function ResourceCard({ resource, canManage }: { resource: Resource; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(resource.bookmarked);

  function open(mode: "view" | "download") {
    setError(null);
    startTransition(async () => {
      const res = await accessResource(resource.id, mode);
      if (res.error || !res.url) return setError(res.error ?? "Échec de l'ouverture.");
      window.open(res.url, mode === "view" ? "_blank" : "_self", "noopener");
      router.refresh();
    });
  }

  function bookmark() {
    setError(null);
    const next = !bookmarked;
    setBookmarked(next);
    startTransition(async () => {
      const res = await toggleBookmark(resource.id);
      if (res.error) {
        setBookmarked(!next);
        setError(res.error);
      }
    });
  }

  function rate(value: number) {
    startTransition(async () => {
      const res = await rateResource(resource.id, value);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteResource(resource.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => open("view")}
        disabled={pending}
        aria-label={`Ouvrir ${resource.title}`}
        className="relative block aspect-[16/9] bg-gradient-to-br from-navy to-primary"
      >
        {resource.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- couverture du bucket public
          <img src={resource.coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-white/70">
            <KindIcon mime={resource.fileMime} className="size-10" />
          </span>
        )}
        {resource.status !== "published" && (
          <Badge variant="secondary" className="absolute left-2 top-2 bg-white/90">
            {resource.status === "draft" ? "Brouillon" : "Archivé"}
          </Badge>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {resource.categoryName && (
          <span className="w-fit rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-primary">{resource.categoryName}</span>
        )}
        <button type="button" onClick={() => open("view")} className="text-left text-sm font-semibold text-navy hover:underline">
          {resource.title}
        </button>
        {resource.author && <p className="text-xs text-slate-500">{resource.author}</p>}
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <KindIcon mime={resource.fileMime} className="size-3.5" />
          {formatKind(resource.fileMime)}
          {resource.fileSize ? ` · ${formatSize(resource.fileSize)}` : ""}
        </p>

        <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3.5" />
            {resource.viewCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Download className="size-3.5" />
            {resource.downloadCount}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={bookmark}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? "Retirer des favoris" : "Ajouter aux favoris"}
              className={cn("rounded-lg p-2", bookmarked ? "bg-primary/10 text-primary" : "text-slate-400 hover:bg-slate-100")}
            >
              <Bookmark className={cn("size-4", bookmarked && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={() => open("download")}
              disabled={pending}
              aria-label="Télécharger"
              className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/15 disabled:opacity-60"
            >
              <Download className="size-4" />
            </button>
            <details className="relative">
              <summary className="flex cursor-pointer list-none rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Plus d'actions">
                <MoreVertical className="size-4" />
              </summary>
              <div className="absolute bottom-full right-0 z-10 mb-1 w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                <p className="px-1 pb-1 text-[11px] font-medium text-slate-500">Votre note</p>
                <div className="flex gap-0.5 px-1 pb-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => rate(n)} disabled={pending} aria-label={`Noter ${n} sur 5`}>
                      <Star className={cn("size-5", (resource.myRating ?? 0) >= n ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-400")} />
                    </button>
                  ))}
                </div>
                {canManage && (
                  <ConfirmDialog
                    trigger={
                      <button type="button" className="mt-1 flex w-full items-center gap-2 rounded px-1 py-1.5 text-left text-sm text-danger hover:bg-danger/10">
                        <Trash2 className="size-4" />
                        Supprimer
                      </button>
                    }
                    title="Supprimer cette ressource ?"
                    description="La ressource et son fichier seront définitivement supprimés."
                    confirmLabel="Supprimer"
                    variant="destructive"
                    onConfirm={remove}
                  />
                )}
              </div>
            </details>
          </div>
        </div>
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </div>
    </article>
  );
}
