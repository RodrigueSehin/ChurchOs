"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bold,
  CalendarDays,
  Check,
  Clock,
  Facebook,
  FileText,
  ImagePlus,
  Instagram,
  Italic,
  Link2,
  List,
  Megaphone,
  MessageCircle,
  Send,
  Share2,
  Underline,
  Upload,
  Users,
  Video,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormSelect } from "@/components/shared/form-select";
import { RichText } from "@/components/shared/rich-text";
import { saveAnnouncement, type SaveAnnouncementState, type SocialResult } from "@/features/communication/actions";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_IMPORTANCE_LABELS,
  ANNOUNCEMENT_TYPE_LABELS,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MIME,
  CONTENT_MAX_LENGTH,
  IMAGE_MAX_BYTES,
  SOCIAL_PROVIDER_LABELS,
  audienceLabel,
  markdownToPlain,
  type AudienceTarget,
} from "@/features/communication/schemas";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { announcements } from "@/lib/db/schema";

const BUCKET = "churchos-announcements";
const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const TOOLBAR = [
  { icon: Bold, label: "Gras", action: "bold" },
  { icon: Italic, label: "Italique", action: "italic" },
  { icon: Underline, label: "Souligné", action: "underline" },
  { icon: List, label: "Liste à puces", action: "list" },
  { icon: Link2, label: "Lien", action: "link" },
] as const;

type Announcement = typeof announcements.$inferSelect;
type Connection = { id: string; provider: string; label: string };
type AudienceOptions = { groups: { id: string; name: string }[]; ministries: { id: string; name: string }[] };
type MediaTab = "image" | "video" | "document";

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

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInput(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

/** Formulaire « Nouvelle annonce » (création et modification) : 4 sections, aperçus de l'annonce et des
 * réseaux sociaux. Les médias partent directement du navigateur vers Storage ; la publication sociale se
 * fait côté serveur (Graph API de Meta) après l'enregistrement. */
export function AnnouncementComposer({
  organizationId,
  organizationName,
  logoUrl,
  connections,
  audienceOptions,
  announcement,
}: {
  organizationId: string;
  organizationName: string;
  logoUrl: string | null;
  connections: Connection[];
  audienceOptions: AudienceOptions;
  announcement?: Announcement;
}) {
  const router = useRouter();
  const editing = Boolean(announcement);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SaveAnnouncementState | null>(null);

  // --- Section 1
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [type, setType] = useState(announcement?.announcementType ?? "announcement");
  const [category, setCategory] = useState(announcement?.category ?? "");
  const [importance, setImportance] = useState(announcement?.importance ?? "normal");
  const [content, setContent] = useState(announcement?.content ?? "");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // --- Section 2 : médias
  const [mediaTab, setMediaTab] = useState<MediaTab>("image");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [attachment, setAttachment] = useState<{ file: File; type: "video" | "document" } | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const shownImage = imagePreview ?? (removeImage ? null : announcement?.imageUrl ?? null);
  const existingAttachment = !removeAttachment && !attachment && announcement?.attachmentUrl ? announcement : null;

  // --- Section 3 : destinataires
  const initialTargets = (announcement?.audienceFilter as { type?: string; targets?: AudienceTarget[] } | undefined)?.targets ?? [];
  const [audienceMode, setAudienceMode] = useState<"all" | "specific">(initialTargets.length > 0 ? "specific" : "all");
  const [targets, setTargets] = useState<string[]>(initialTargets.map((t) => `${t.type}:${t.id}`));

  // --- Section 4 : publication
  const now = new Date();
  const existingDate = announcement?.publishAt ? new Date(announcement.publishAt) : null;
  const [schedule, setSchedule] = useState(announcement?.status === "scheduled");
  const [date, setDate] = useState(toDateInput(existingDate ?? now));
  const [time, setTime] = useState(toTimeInput(existingDate ?? now));
  const [mode, setMode] = useState<"publish" | "draft">(announcement?.status === "draft" ? "draft" : "publish");
  const [socialOn, setSocialOn] = useState(false);
  const [social, setSocial] = useState<Record<string, string>>({}); // provider -> connectionId (si coché)
  const [previewTab, setPreviewTab] = useState<"facebook" | "instagram" | "whatsapp">("facebook");

  const byProvider = (p: string) => connections.filter((c) => c.provider === p);
  const selectedConnections = connections.filter((c) => Object.values(social).includes(c.id));
  const scheduledAt = schedule ? new Date(`${date}T${time}`) : null;
  const plain = markdownToPlain(content);
  const accountLabel = (provider: "facebook" | "instagram") => selectedConnections.find((c) => c.provider === provider)?.label ?? organizationName;
  const audienceText = audienceMode === "all" ? "Tous les membres" : audienceLabel({ type: "targets", targets: targetsToObjects() });

  function targetsToObjects(): AudienceTarget[] {
    return targets.flatMap((raw) => {
      const [kind, id] = raw.split(":");
      const list = kind === "group" ? audienceOptions.groups : audienceOptions.ministries;
      const found = list.find((x) => x.id === id);
      return found ? [{ type: kind as "group" | "ministry", id: found.id, name: found.name }] : [];
    });
  }

  /** Applique un balisage autour de la sélection du champ de contenu. */
  function wrapSelection(before: string, after = before) {
    const el = contentRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = content.slice(s, e) || "texte";
    const next = `${content.slice(0, s)}${before}${selected}${after}${content.slice(e)}`;
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
  }

  function prefixLines(prefix: string) {
    const el = contentRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const start = content.lastIndexOf("\n", s - 1) + 1;
    const block = content.slice(start, e) || "élément";
    const next = `${content.slice(0, start)}${block.split("\n").map((l) => `${prefix}${l}`).join("\n")}${content.slice(e)}`;
    setContent(next);
    requestAnimationFrame(() => el.focus());
  }

  function runToolbar(action: (typeof TOOLBAR)[number]["action"]) {
    if (action === "bold") wrapSelection("**");
    else if (action === "italic") wrapSelection("_");
    else if (action === "underline") wrapSelection("++");
    else if (action === "list") prefixLines("- ");
    else insertLink();
  }

  function insertLink() {
    const url = window.prompt("Adresse du lien (https://…)");
    if (url && /^https?:\/\//.test(url)) wrapSelection("[", `](${url})`);
  }

  function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (f && (!IMAGE_MIME.includes(f.type) || f.size > IMAGE_MAX_BYTES)) {
      setError("Image : JPG, PNG ou WebP, 5 Mo maximum.");
      e.target.value = "";
      return;
    }
    setImage(f);
    setImagePreview(f ? URL.createObjectURL(f) : null);
    if (f) setRemoveImage(false);
  }

  function onAttachment(kind: "video" | "document", e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (f && (!ATTACHMENT_MIME[kind].includes(f.type) || f.size > ATTACHMENT_MAX_BYTES)) {
      setError(kind === "video" ? "Vidéo : MP4, 50 Mo maximum." : "Document : PDF ou DOCX, 50 Mo maximum.");
      e.target.value = "";
      return;
    }
    if (f) {
      setAttachment({ file: f, type: kind });
      setRemoveAttachment(false);
    }
  }

  function toggleTarget(id: string) {
    setTargets((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  }

  function submit(forceDraft: boolean) {
    setError(null);
    if (!title.trim()) return setError("Titre requis.");
    if (!category) return setError("Catégorie requise.");
    if (!content.trim()) return setError("Contenu requis.");
    if (audienceMode === "specific" && targets.length === 0) return setError("Choisissez au moins un groupe ou un ministère.");
    if (schedule && Number.isNaN(scheduledAt?.getTime())) return setError("Date ou heure de publication invalide.");

    const draft = forceDraft || mode === "draft";
    startTransition(async () => {
      const supabase = createClient();
      const uploaded: string[] = [];
      const upload = async (file: File) => {
        const path = `${organizationId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`.replace(/(\.[^.]*)?$/, `.${EXTENSIONS[file.type] ?? "bin"}`);
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
        if (uploadError) throw new Error(`Échec du téléversement : ${uploadError.message}`);
        uploaded.push(path);
        return path;
      };

      try {
        const imageRef = image ? { path: await upload(image), mime: image.type, size: image.size } : null;
        const attachmentRef = attachment
          ? { path: await upload(attachment.file), mime: attachment.file.type, size: attachment.file.size, name: attachment.file.name, type: attachment.type }
          : null;

        const res = await saveAnnouncement({
          id: announcement?.id,
          fields: {
            title,
            content,
            announcementType: type,
            category,
            importance,
            audience: audienceMode === "all" ? ["all"] : targets,
            mode: draft ? "draft" : "publish",
            publishAt: schedule && scheduledAt ? scheduledAt.toISOString() : "",
            socialConnectionIds: socialOn && !draft ? Object.values(social).filter(Boolean) : [],
          },
          image: imageRef,
          removeImage: removeImage && !image,
          attachment: attachmentRef,
          removeAttachment: removeAttachment && !attachment,
        });
        if (res.error) {
          // L'action retire déjà les nouveaux médias ; rien à nettoyer ici.
          return setError(res.error);
        }
        if (res.social && res.social.length > 0) setResult(res);
        else router.push("/communication");
      } catch (err) {
        if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded);
        setError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
      }
    });
  }

  if (result) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success">
            <Check className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-navy">Annonce enregistrée</p>
            <p className="text-sm text-slate-500">Résultat de la publication sur les réseaux sociaux :</p>
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {result.social?.map((r: SocialResult) => (
            <li key={`${r.provider}-${r.label}`} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
              {r.status === "failed" ? <X className="mt-0.5 size-4 shrink-0 text-danger" /> : <Check className="mt-0.5 size-4 shrink-0 text-success" />}
              <span>
                <span className="font-medium text-navy">
                  {SOCIAL_PROVIDER_LABELS[r.provider] ?? r.provider} — {r.label}
                </span>
                <span className="block text-slate-500">
                  {r.status === "published" && "Publiée."}
                  {r.status === "scheduled" && "Programmée chez Meta."}
                  {r.status === "failed" && `Échec : ${r.error}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <Button asChild>
          <Link href="/communication">Retour aux annonces</Link>
        </Button>
      </div>
    );
  }

  const primaryLabel = mode === "draft" ? "Enregistrer le brouillon" : schedule ? "Programmer l'annonce" : "Publier l'annonce";
  const typeLabel = ANNOUNCEMENT_TYPE_LABELS[type];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5">
        {/* 1 */}
        <SectionTitle step={1} title="Informations générales" hint="Renseignez les détails de votre annonce." tone="bg-blue-50 text-blue-600" />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ann-title">Titre de l&apos;annonce *</Label>
          <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Ex : Culte de louange et d'adoration" />
          <span className="text-right text-[11px] text-slate-400">{title.length}/200</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ann-type">Type d&apos;annonce *</Label>
            <FormSelect id="ann-type" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(ANNOUNCEMENT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </FormSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ann-category">Catégorie *</Label>
            <FormSelect id="ann-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Sélectionner</option>
              {ANNOUNCEMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </FormSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ann-importance">Importance</Label>
            <FormSelect id="ann-importance" value={importance} onChange={(e) => setImportance(e.target.value)}>
              {Object.entries(ANNOUNCEMENT_IMPORTANCE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </FormSelect>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ann-content">Contenu de l&apos;annonce *</Label>
          <div className="rounded-lg border border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 p-1.5">
              {TOOLBAR.map(({ icon: Icon, label, action }) => (
                <button key={label} type="button" onClick={() => runToolbar(action)} aria-label={label} title={label} className="rounded p-1.5 text-slate-600 hover:bg-slate-100">
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
            <textarea
              id="ann-content"
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={CONTENT_MAX_LENGTH}
              rows={6}
              placeholder="Rédigez votre annonce..."
              className="w-full resize-y rounded-b-lg bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <span className="text-right text-[11px] text-slate-400">{content.length}/{CONTENT_MAX_LENGTH}</span>
        </div>

        {/* 2 */}
        <SectionTitle step={2} title="Médias (optionnel)" hint="Ajoutez une image, une vidéo ou un document." tone="bg-green-50 text-green-600" />
        <div className="flex gap-2">
          {([
            ["image", "Image", ImagePlus],
            ["video", "Vidéo", Video],
            ["document", "Document", FileText],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMediaTab(key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium",
                mediaTab === key ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:bg-slate-50",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
        {mediaTab === "image" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {shownImage && (
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob) ou image du bucket public */}
                <img src={shownImage} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                    setRemoveImage(true);
                  }}
                  aria-label="Retirer l'image"
                  className="absolute right-2 top-2 rounded-full bg-navy/80 p-1 text-white"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => imageInput.current?.click()}
              className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-primary/40 bg-blue-50/60 p-3 text-center text-sm text-navy hover:bg-blue-50"
            >
              <Upload className="size-5 text-primary" />
              Cliquer pour ajouter une image
              <span className="text-[11px] text-slate-500">JPG, PNG (max 5 Mo) · Format recommandé : 1920 × 1080 px</span>
            </button>
            <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onImage} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(attachment?.type === mediaTab ? attachment : existingAttachment?.attachmentType === mediaTab ? existingAttachment : null) && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-navy">
                  {mediaTab === "video" ? <Video className="size-4 shrink-0" /> : <FileText className="size-4 shrink-0" />}
                  <span className="truncate">{attachment?.file.name ?? existingAttachment?.attachmentName}</span>
                  {attachment && <span className="text-xs text-slate-400">{formatSize(attachment.file.size)}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachment(null);
                    setRemoveAttachment(true);
                  }}
                  aria-label="Retirer le fichier"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-primary/40 bg-blue-50/60 p-3 text-center text-sm text-navy hover:bg-blue-50"
            >
              <Upload className="size-5 text-primary" />
              {mediaTab === "video" ? "Cliquer pour ajouter une vidéo" : "Cliquer pour ajouter un document"}
              <span className="text-[11px] text-slate-500">{mediaTab === "video" ? "MP4 (max 50 Mo)" : "PDF, DOCX (max 50 Mo)"}</span>
            </button>
            <input
              key={mediaTab}
              ref={fileInput}
              type="file"
              accept={mediaTab === "video" ? "video/mp4" : ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
              className="sr-only"
              onChange={(e) => onAttachment(mediaTab as "video" | "document", e)}
            />
          </div>
        )}

        {/* 3 */}
        <SectionTitle step={3} title="Destinataires" hint="Choisissez qui peut voir cette annonce." tone="bg-purple-50 text-purple-600" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {([
            ["all", "Tous les membres"],
            ["specific", "Groupes spécifiques"],
          ] as const).map(([value, label]) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm",
                audienceMode === value ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600",
              )}
            >
              <span className="flex items-center gap-2">
                <Users className="size-4" />
                {label}
              </span>
              <input type="radio" name="audience-mode" checked={audienceMode === value} onChange={() => setAudienceMode(value)} className="accent-primary" />
            </label>
          ))}
        </div>
        {audienceMode === "specific" && (
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
            {([
              ["group", "Groupes", audienceOptions.groups],
              ["ministry", "Ministères", audienceOptions.ministries],
            ] as const).map(([kind, label, list]) => (
              <div key={kind}>
                <p className="mb-1.5 text-xs font-semibold text-navy">{label}</p>
                {list.length === 0 ? (
                  <p className="text-xs text-slate-400">Aucun.</p>
                ) : (
                  <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                    {list.map((item) => (
                      <li key={item.id}>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" checked={targets.includes(`${kind}:${item.id}`)} onChange={() => toggleTarget(`${kind}:${item.id}`)} />
                          {item.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 4 */}
        <SectionTitle step={4} title="Publication et diffusion" hint="Définissez quand et où publier cette annonce." tone="bg-amber-50 text-amber-600" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ann-date">Date *</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input id="ann-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!schedule} className="pl-8 text-xs" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ann-time">Heure *</Label>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input id="ann-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={!schedule} className="pl-8 text-xs" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ann-mode">Statut *</Label>
                <FormSelect id="ann-mode" value={mode} onChange={(e) => setMode(e.target.value as "publish" | "draft")} className="text-xs">
                  <option value="publish">Publier maintenant</option>
                  <option value="draft">Brouillon</option>
                </FormSelect>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Switch id="ann-schedule" checked={schedule} onCheckedChange={setSchedule} aria-label="Programmer la publication" />
              <label htmlFor="ann-schedule" className="cursor-pointer">
                <p className="text-sm font-semibold text-navy">Programmer la publication</p>
                <p className="text-xs text-slate-500">Planifiez cette annonce pour une publication automatique.</p>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-start gap-3">
              <Switch id="ann-social" checked={socialOn} onCheckedChange={setSocialOn} aria-label="Partager sur les réseaux sociaux" />
              <label htmlFor="ann-social" className="cursor-pointer">
                <p className="text-sm font-semibold text-navy">Partager sur les réseaux sociaux</p>
                <p className="text-xs text-slate-500">Publier automatiquement sur vos comptes sociaux.</p>
              </label>
            </div>
            {socialOn && (
              <div className="mt-3 flex flex-col gap-2.5">
                {(["facebook", "instagram"] as const).map((provider) => {
                  const list = byProvider(provider);
                  const Icon = provider === "facebook" ? Facebook : Instagram;
                  const checked = provider in social;
                  return (
                    <div key={provider} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={list.length === 0}
                        onChange={(e) =>
                          setSocial((s) => {
                            const next = { ...s };
                            if (e.target.checked) next[provider] = list[0]!.id;
                            else delete next[provider];
                            return next;
                          })
                        }
                        aria-label={SOCIAL_PROVIDER_LABELS[provider]}
                      />
                      <Icon className="size-4 shrink-0 text-primary" />
                      <span className="w-20 text-xs font-medium text-navy">{SOCIAL_PROVIDER_LABELS[provider]}</span>
                      {list.length === 0 ? (
                        <Link href="/settings/social" className="text-xs text-primary underline">
                          Connecter un compte
                        </Link>
                      ) : (
                        <FormSelect
                          aria-label={`Compte ${SOCIAL_PROVIDER_LABELS[provider]}`}
                          value={social[provider] ?? list[0]!.id}
                          onChange={(e) => setSocial((s) => ({ ...s, [provider]: e.target.value }))}
                          disabled={!checked}
                          className="h-8 text-xs"
                        >
                          {list.map((c) => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </FormSelect>
                      )}
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 text-xs">
                  <MessageCircle className="ml-5 size-4 shrink-0 text-success" />
                  <span className="w-20 font-medium text-navy">WhatsApp</span>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${title}\n\n${plain}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Ouvrir WhatsApp avec le texte
                  </a>
                </div>
                <p className="text-[11px] text-slate-400">
                  Instagram exige une image et ne permet pas la programmation ; Facebook programme de 10 minutes à 30 jours à l&apos;avance.
                </p>
              </div>
            )}
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" asChild>
            <Link href="/communication">Annuler</Link>
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => submit(true)}>
            <FileText className="size-4" />
            Enregistrer en brouillon
          </Button>
          <Button type="button" disabled={pending} onClick={() => submit(false)}>
            <Send className="size-4" />
            {pending ? "Enregistrement..." : editing && mode !== "draft" && !schedule ? "Enregistrer et publier" : primaryLabel}
          </Button>
        </div>
      </div>

      {/* Aperçus */}
      <aside className="flex flex-col gap-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
            <span className="flex size-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Megaphone className="size-4" />
            </span>
            Aperçu de l&apos;annonce
          </p>
          <div className="relative mb-3 aspect-[16/9] overflow-hidden rounded-lg bg-gradient-to-br from-navy to-primary">
            {shownImage && (
              // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob) ou image du bucket public
              <img src={shownImage} alt="" className="size-full object-cover" />
            )}
            {category && <span className="absolute bottom-2 left-2 rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-medium text-purple-700">{category}</span>}
          </div>
          <p className="font-semibold text-navy">{title || "Titre de l'annonce"}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{schedule && scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(scheduledAt) : "À la publication"}</span>
            <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{audienceText}</span>
            <span>{typeLabel}</span>
          </p>
          {content ? <RichText text={content} className="mt-3 space-y-1 text-sm text-slate-700" /> : <p className="mt-3 text-sm text-slate-400">Le contenu apparaîtra ici.</p>}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Share2 className="size-4" />
            </span>
            Aperçu réseaux sociaux
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {([
              ["facebook", "Facebook"],
              ["instagram", "Instagram"],
              ["whatsapp", "WhatsApp"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPreviewTab(key)}
                className={cn("rounded-md px-2.5 py-1 text-xs font-medium", previewTab === key ? "bg-navy text-white" : "bg-slate-100 text-slate-600")}
              >
                {label}
              </button>
            ))}
          </div>

          {previewTab === "facebook" && (
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-navy text-xs font-bold text-white">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- logo de l'organisation (bucket public)
                    <img src={logoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    organizationName.slice(0, 1)
                  )}
                </span>
                <div>
                  <p className="text-xs font-semibold text-navy">{accountLabel("facebook")}</p>
                  <p className="text-[11px] text-slate-400">{schedule ? "Programmée" : "À l'instant"}</p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-800">{title ? `${title}\n\n${plain}` : plain || "Le texte de la publication apparaîtra ici."}</p>
              {shownImage && (
                // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob) ou image du bucket public
                <img src={shownImage} alt="" className="mt-2 max-h-56 w-full rounded object-cover" />
              )}
            </div>
          )}
          {previewTab === "instagram" && (
            <div className="rounded-lg border border-slate-200 text-sm">
              <p className="px-3 py-2 text-xs font-semibold text-navy">{accountLabel("instagram")}</p>
              {shownImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob) ou image du bucket public
                <img src={shownImage} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-slate-100 px-6 text-center text-xs text-slate-500">
                  Instagram exige une image : ajoutez-en une à l&apos;étape 2.
                </div>
              )}
              <p className="whitespace-pre-wrap px-3 py-2 text-xs text-slate-700">{title ? `${title}\n\n${plain}` : plain}</p>
            </div>
          )}
          {previewTab === "whatsapp" && (
            <div className="rounded-lg bg-[#e7f5dd] p-3 text-sm">
              <p className="whitespace-pre-wrap text-slate-800">{title ? `*${title}*\n\n${plain}` : plain || "Le message apparaîtra ici."}</p>
              <p className="mt-2 text-[11px] text-slate-500">Le bouton « Ouvrir WhatsApp avec le texte » (étape 4) prépare ce message ; vous choisissez le contact ou le groupe.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
