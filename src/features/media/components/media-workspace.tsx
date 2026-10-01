"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Check, Download, Eye, FileText, Music, Play, Plus, Share2, Trash2, X, Youtube } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteMedia, updateMedia } from "@/features/media/actions";
import { MEDIA_KIND_LABELS, formatBytes, formatDuration, type MediaEntry } from "@/features/media/schemas";
import { cn } from "@/lib/utils";

const BADGE: Record<MediaEntry["kind"], string> = {
  photo: "bg-blue-100 text-primary",
  video: "bg-red-100 text-red-600",
  audio: "bg-purple-100 text-purple-700",
  document: "bg-amber-100 text-amber-700",
};

const BADGE_LABEL: Record<MediaEntry["kind"], string> = { photo: "PHOTO", video: "VIDÉO", audio: "AUDIO", document: "PDF" };

function fmtDate(iso: string, withTime = false) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);
  return withTime ? `${date} à ${time}` : `${date} - ${time}`;
}

function badgeOf(e: MediaEntry) {
  if (e.kind === "document") return e.mime?.includes("wordprocessingml") || e.fileName?.toLowerCase().endsWith(".docx") ? "DOCX" : "PDF";
  return BADGE_LABEL[e.kind];
}

function Thumb({ entry, large }: { entry: MediaEntry; large?: boolean }) {
  if (entry.thumbnail) {
    // eslint-disable-next-line @next/next/no-img-element -- image du bucket public / miniature YouTube
    return <img src={entry.thumbnail} alt="" loading="lazy" className="size-full object-cover" />;
  }
  const Icon = entry.kind === "audio" ? Music : FileText;
  return (
    <span className={cn("flex size-full items-center justify-center", entry.kind === "audio" ? "bg-purple-50 text-purple-500" : "bg-slate-50 text-red-500")}>
      <Icon className={large ? "size-14" : "size-10"} />
    </span>
  );
}

/** Grille de médias (gauche) + panneau de détail du média sélectionné (droite). */
export function MediaWorkspace({ entries, canManage, toolbar, footer, empty }: { entries: MediaEntry[]; canManage: boolean; toolbar: React.ReactNode; footer: React.ReactNode; empty: React.ReactNode }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = entries.find((e) => e.key === selectedKey) ?? entries[0] ?? null;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        {toolbar}
        {entries.length === 0 ? (
          empty
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {entries.map((e) => (
              <button
                key={e.key}
                type="button"
                onClick={() => setSelectedKey(e.key)}
                className={cn("group flex flex-col gap-2 rounded-xl p-1.5 text-left transition-colors", selected?.key === e.key ? "ring-2 ring-primary" : "hover:bg-slate-50")}
              >
                <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                  <Thumb entry={e} />
                  <span className={cn("absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold", BADGE[e.kind])}>{badgeOf(e)}</span>
                  {e.durationSeconds !== null && (
                    <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                      <Play className="size-2.5 fill-white" />
                      {formatDuration(e.durationSeconds)}
                    </span>
                  )}
                </span>
                <span className="px-1">
                  <span className="block truncate text-sm font-semibold text-navy">{e.title}</span>
                  <span className="block text-xs text-slate-400">{fmtDate(e.date)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        {footer}
      </div>

      {selected && <Detail key={selected.key} entry={selected} canManage={canManage} />}
    </div>
  );
}

function Detail({ entry, canManage }: { entry: MediaEntry; canManage: boolean }) {
  const router = useRouter();
  const [tags, setTags] = useState(entry.tags);
  const [newTag, setNewTag] = useState<string | null>(null);
  const [title, setTitle] = useState(entry.title);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editable = canManage && entry.uploadId !== null;

  function persist(nextTags: string[], nextTitle = title) {
    if (!entry.uploadId) return;
    setError(null);
    startTransition(async () => {
      const res = await updateMedia({ id: entry.uploadId!, title: nextTitle, tags: nextTags });
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function addTag() {
    const tag = (newTag ?? "").trim();
    setNewTag(null);
    if (!tag || tags.includes(tag)) return;
    const next = [...tags, tag];
    setTags(next);
    persist(next);
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(entry.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiez le lien :", entry.url);
    }
  }

  const downloadHref = entry.source === "upload" ? `${entry.url}?download=${encodeURIComponent(entry.fileName ?? entry.title)}` : entry.url;
  const rows: [string, string][] = [
    ...(entry.fileName ? ([["Nom du fichier", entry.fileName]] as [string, string][]) : []),
    ["Type", entry.kind === "video" ? "Vidéo YouTube" : (entry.mime ?? MEDIA_KIND_LABELS[entry.kind])],
    ...(entry.sizeBytes ? ([["Taille", formatBytes(entry.sizeBytes)]] as [string, string][]) : []),
    ...(entry.width && entry.height ? ([["Dimensions", `${entry.width} × ${entry.height}`]] as [string, string][]) : []),
    ...(entry.durationSeconds !== null ? ([["Durée", formatDuration(entry.durationSeconds)]] as [string, string][]) : []),
    ...(entry.views !== null ? ([["Vues", new Intl.NumberFormat("fr-FR").format(entry.views)]] as [string, string][]) : []),
    ["Date", fmtDate(entry.date, true)],
    ...(entry.note ? ([["Source", entry.note]] as [string, string][]) : []),
  ];

  return (
    <aside className="flex flex-col gap-4 self-start rounded-2xl border border-slate-200 bg-white p-4 xl:sticky xl:top-4">
      <div className="aspect-video overflow-hidden rounded-xl bg-slate-100">
        {entry.youtubeId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${entry.youtubeId}`}
            title={entry.title}
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="size-full border-0"
          />
        ) : entry.kind === "audio" ? (
          <div className="flex size-full flex-col items-center justify-center gap-3 bg-purple-50 px-4">
            <Music className="size-12 text-purple-500" />
            <audio controls src={entry.url} className="w-full" preload="metadata" />
          </div>
        ) : (
          <Thumb entry={entry} large />
        )}
      </div>

      <div>
        {editable ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== entry.title && persist(tags, title.trim())}
            aria-label="Titre du média"
            className="w-full rounded border border-transparent px-1 text-lg font-bold text-navy hover:border-slate-200 focus:border-primary focus:outline-none"
          />
        ) : (
          <h3 className="text-lg font-bold text-navy">{entry.title}</h3>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", BADGE[entry.kind])}>{badgeOf(entry)}</span>
          <span className="inline-flex items-center gap-1"><Calendar className="size-3" />{fmtDate(entry.date, true)}</span>
          {entry.sizeBytes ? <span>{formatBytes(entry.sizeBytes)}</span> : null}
          {entry.views !== null && <span className="inline-flex items-center gap-1"><Eye className="size-3" />{new Intl.NumberFormat("fr-FR").format(entry.views)}</span>}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <a href={downloadHref} target={entry.source === "upload" ? undefined : "_blank"} rel="noopener noreferrer" className="flex flex-col items-center gap-1 rounded-lg bg-blue-50 py-2.5 font-medium text-primary hover:bg-blue-100">
          {entry.youtubeId ? <Youtube className="size-4" /> : <Download className="size-4" />}
          {entry.youtubeId ? "YouTube" : "Télécharger"}
        </a>
        <button type="button" onClick={share} className="flex flex-col items-center gap-1 rounded-lg bg-blue-50 py-2.5 font-medium text-primary hover:bg-blue-100">
          {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
          {copied ? "Lien copié" : "Partager"}
        </button>
        {editable ? (
          <ConfirmDialog
            trigger={
              <button type="button" className="flex flex-col items-center gap-1 rounded-lg bg-red-50 py-2.5 font-medium text-danger hover:bg-red-100">
                <Trash2 className="size-4" />
                Supprimer
              </button>
            }
            title="Supprimer ce média ?"
            description={`« ${entry.title} » sera définitivement supprimé.`}
            confirmLabel="Supprimer"
            variant="destructive"
            onConfirm={() =>
              startTransition(async () => {
                const res = await deleteMedia(entry.uploadId!);
                if (res.error) setError(res.error);
                else router.refresh();
              })
            }
          />
        ) : (
          <span className="flex flex-col items-center gap-1 rounded-lg bg-slate-50 py-2.5 font-medium text-slate-300" title={entry.youtubeId ? "À gérer sur YouTube" : "À gérer depuis l'annonce"}>
            <Trash2 className="size-4" />
            Supprimer
          </span>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}

      <section>
        <h4 className="mb-2 text-sm font-semibold text-navy">Informations</h4>
        <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-500">{k}</dt>
              <dd className="break-words text-navy">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {entry.source === "upload" && (
        <section className={cn(pending && "opacity-60")}>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-navy">Tags</h4>
            {editable && newTag === null && (
              <button type="button" onClick={() => setNewTag("")} className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                <Plus className="size-3" />
                Ajouter un tag
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.length === 0 && newTag === null && <span className="text-xs text-slate-400">Aucun tag.</span>}
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-primary">
                {t}
                {editable && (
                  <button type="button" aria-label={`Retirer ${t}`} onClick={() => { const next = tags.filter((x) => x !== t); setTags(next); persist(next); }}>
                    <X className="size-3" />
                  </button>
                )}
              </span>
            ))}
            {newTag !== null && (
              <input
                autoFocus
                value={newTag}
                maxLength={30}
                onChange={(e) => setNewTag(e.target.value)}
                onBlur={addTag}
                onKeyDown={(e) => { if (e.key === "Enter") addTag(); if (e.key === "Escape") setNewTag(null); }}
                className="w-28 rounded-full border border-primary px-2.5 py-1 text-xs focus:outline-none"
                aria-label="Nouveau tag"
              />
            )}
          </div>
        </section>
      )}
    </aside>
  );
}
