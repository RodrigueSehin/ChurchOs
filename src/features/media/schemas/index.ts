export const MEDIA_BUCKET = "churchos-media";
export const MEDIA_MAX_BYTES = 100 * 1024 * 1024;
/** Quota de stockage affiché (le plan d'abonnement n'en porte pas encore un). */
export const MEDIA_STORAGE_QUOTA_BYTES = 10 * 1024 * 1024 * 1024;

export type MediaKind = "photo" | "video" | "audio" | "document";

export const MEDIA_KIND_LABELS: Record<MediaKind, string> = {
  photo: "Photos",
  video: "Vidéos",
  audio: "Audios",
  document: "Documents",
};

/** Types de fichiers téléversables (les vidéos viennent de YouTube, pas d'un téléversement). */
export const UPLOAD_MIME_KINDS: Record<string, Exclude<MediaKind, "video">> = {
  "image/jpeg": "photo",
  "image/png": "photo",
  "image/webp": "photo",
  "image/gif": "photo",
  "audio/mpeg": "audio",
  "audio/mp4": "audio",
  "audio/x-m4a": "audio",
  "audio/wav": "audio",
  "audio/x-wav": "audio",
  "audio/ogg": "audio",
  "application/pdf": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
};

export const UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.mp3,.m4a,.wav,.ogg,.pdf,.docx";

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Type MIME d'un fichier (certains navigateurs n'en renseignent pas pour .m4a / .docx). */
export function resolveUploadMime(file: { type: string; name: string }) {
  if (UPLOAD_MIME_KINDS[file.type]) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME[ext] ?? file.type;
}

export function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(-120);
}

export function normalizeTags(raw: string[]) {
  const seen = new Set<string>();
  for (const t of raw) {
    const tag = t.trim().replace(/\s+/g, " ").slice(0, 30);
    if (tag) seen.add(tag);
  }
  return [...seen].slice(0, 12);
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1).replace(".", ",")} Go`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1).replace(".", ",")} Mo`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${bytes} o`;
}

export function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Élément unifié de la médiathèque (téléversement, média d'annonce ou vidéo YouTube). */
export interface MediaEntry {
  key: string;
  source: "upload" | "announcement" | "youtube";
  kind: MediaKind;
  title: string;
  /** ISO — sérialisable vers le client. */
  date: string;
  /** Fichier (téléversement / annonce) ou page de la vidéo (YouTube). */
  url: string;
  thumbnail: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  mime: string | null;
  fileName: string | null;
  durationSeconds: number | null;
  views: number | null;
  tags: string[];
  /** Identifiant de `media_items` : tags et suppression ne concernent que les téléversements. */
  uploadId: string | null;
  youtubeId: string | null;
  note: string | null;
}
