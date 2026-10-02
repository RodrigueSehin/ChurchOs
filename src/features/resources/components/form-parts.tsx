"use client";

import { useMemo, useEffect, useRef } from "react";
import { UploadCloud, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type SectionTone = "blue" | "green" | "purple" | "amber" | "pink";

const TONES: Record<SectionTone, { band: string; circle: string; title: string }> = {
  blue: { band: "bg-blue-50", circle: "bg-primary", title: "text-primary" },
  green: { band: "bg-emerald-50", circle: "bg-emerald-500", title: "text-emerald-600" },
  purple: { band: "bg-purple-50", circle: "bg-purple-600", title: "text-purple-600" },
  amber: { band: "bg-amber-50", circle: "bg-amber-500", title: "text-amber-600" },
  pink: { band: "bg-rose-50", circle: "bg-rose-500", title: "text-rose-600" },
};

/** Section numérotée d'un formulaire (bandeau coloré + contenu). */
export function FormSection({ step, title, hint, optional, tone, children }: { step: number; title: string; hint: string; optional?: boolean; tone: SectionTone; children: React.ReactNode }) {
  const t = TONES[tone];
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className={cn("flex items-center gap-3 px-4 py-3", t.band)}>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", t.circle)}>{step}</span>
        <div>
          <h2 className={cn("font-semibold", t.title)}>
            {title} {optional && <span className="font-normal text-slate-500">(optionnel)</span>}
          </h2>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
      </div>
      <div className="flex flex-col gap-4 p-4">{children}</div>
    </section>
  );
}

export function Field({ label, required, htmlFor, counter, children }: { label: string; required?: boolean; htmlFor?: string; counter?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-navy">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {counter && <span className="-mt-0.5 text-right text-xs text-slate-400">{counter}</span>}
    </div>
  );
}

export const TEXTAREA_CLASS = "w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

export interface FileSlot {
  /** Fichiers déjà enregistrés (URL publique ou chemin) et non retirés. */
  existing: { key: string; label: string; previewUrl?: string }[];
  added: File[];
}

/** Zone « Cliquer pour ajouter… » avec vignettes des fichiers enregistrés et ajoutés. */
export function FileDropzone({
  title,
  hint,
  accept,
  mimes,
  maxBytes,
  max,
  slot,
  onChange,
  onError,
}: {
  title: string;
  hint: React.ReactNode;
  accept: string;
  mimes: string[];
  maxBytes: number;
  max: number;
  slot: FileSlot;
  onChange: (next: { added?: File[]; removeExisting?: string }) => void;
  onError: (message: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const total = slot.existing.length + slot.added.length;

  function pick(list: FileList | null) {
    if (!list) return;
    onError(null);
    const next = [...slot.added];
    for (const f of Array.from(list)) {
      if (!mimes.includes(f.type)) return onError(`« ${f.name} » : format non autorisé.`);
      if (f.size > maxBytes) return onError(`« ${f.name} » dépasse ${Math.round(maxBytes / 1024 / 1024)} Mo.`);
      if (slot.existing.length + next.length >= max) return onError(`${max} fichiers maximum.`);
      next.push(f);
    }
    onChange({ added: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <input ref={input} type="file" multiple accept={accept} className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      <button type="button" onClick={() => input.current?.click()} className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center hover:border-primary">
        <UploadCloud className="size-9 text-primary" />
        <span className="text-sm font-semibold text-navy">{title}</span>
        <span className="text-xs text-slate-500">{hint}</span>
      </button>
      {total > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {slot.existing.map((f) => (
            <FileChip key={f.key} label={f.label} previewUrl={f.previewUrl} onRemove={() => onChange({ removeExisting: f.key })} />
          ))}
          {slot.added.map((f, i) => (
            <FileChip key={`${f.name}-${f.size}-${i}`} label={f.name} file={f} onRemove={() => onChange({ added: slot.added.filter((_, j) => j !== i) })} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** URL d'aperçu locale d'une image choisie (libérée au démontage). */
export function useObjectUrl(file: File | null | undefined) {
  const url = useMemo(() => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}

function FileChip({ label, previewUrl, file, onRemove }: { label: string; previewUrl?: string; file?: File; onRemove: () => void }) {
  const local = useObjectUrl(file);
  previewUrl = previewUrl ?? local ?? undefined;
  return (
    <li className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob) ou image du bucket public
        <img src={previewUrl} alt={label} className="aspect-[4/3] w-full object-cover" />
      ) : (
        <span className="flex aspect-[4/3] items-center justify-center px-2 text-center text-xs text-slate-500">{label}</span>
      )}
      <button type="button" onClick={onRemove} aria-label={`Retirer ${label}`} className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white">
        <X className="size-3.5" />
      </button>
    </li>
  );
}

export function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-100);
}

/** Envoie des fichiers directement vers Storage (`<organisation>/<uuid>-<nom>`) ; renvoie les références, ou retire tout en cas d'échec. */
export async function uploadFiles(bucket: string, organizationId: string, files: File[]): Promise<{ refs: { path: string; mime: string; size: number; name: string }[]; error?: string }> {
  const supabase = createClient();
  const refs: { path: string; mime: string; size: number; name: string }[] = [];
  for (const file of files) {
    const path = `${organizationId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
    if (error) {
      if (refs.length) await supabase.storage.from(bucket).remove(refs.map((r) => r.path));
      return { refs: [], error: `Échec du téléversement de « ${file.name} » : ${error.message}` };
    }
    refs.push({ path, mime: file.type, size: file.size, name: file.name });
  }
  return { refs };
}

