"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Award, BookOpen, CalendarDays, Info, Lock, Plus, Save, Upload, User as UserIcon, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { IconInput } from "@/components/shared/icon-input";
import { issueCertification } from "@/features/training/actions";
import {
  CERTIFICATE_BUCKET,
  CERTIFICATE_MAX_BYTES,
  CERTIFICATE_MIME_TYPES,
  CERTIFICATION_STATUS_LABELS,
  CERTIFICATION_VISIBILITY_LABELS,
} from "@/features/training/schemas";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<string, string> = { obtained: "bg-success", pending: "bg-amber-400", expired: "bg-danger" };
const STATUS_PILL: Record<string, string> = {
  obtained: "bg-success/10 text-success",
  pending: "bg-amber-100 text-amber-700",
  expired: "bg-danger/10 text-danger",
};

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

function formatDate(value: string) {
  if (!value) return "-";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

/** Formulaire « Nouvelle certification » : 3 sections + aperçu du certificat. `courseId` fixe le
 * programme (fiche d'un cours) ; sinon un sélecteur de cours est proposé. */
export function CertificationFormDialog({
  organizationId,
  people,
  courses,
  courseId,
  trigger,
}: {
  organizationId: string;
  people: { id: string; name: string }[];
  courses: { id: string; title: string }[];
  courseId?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [personId, setPersonId] = useState("");
  const [course, setCourse] = useState(courseId ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [issuedAt, setIssuedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("obtained");
  const [notify, setNotify] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);

  const personName = people.find((p) => p.id === personId)?.name ?? "";
  const courseTitle = courses.find((c) => c.id === course)?.title ?? "";

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    if (file && !CERTIFICATE_MIME_TYPES.includes(file.type)) {
      setError("Fichier : PDF, PNG ou JPG uniquement.");
      e.target.value = "";
      setFileName(null);
    } else if (file && file.size > CERTIFICATE_MAX_BYTES) {
      setError("Fichier trop volumineux (5 Mo maximum).");
      e.target.value = "";
      setFileName(null);
    } else {
      setFileName(file?.name ?? null);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    formData.delete("file");

    startTransition(async () => {
      try {
        // Envoi direct navigateur → Storage (un fichier de 5 Mo dépasse la limite de requête de Vercel).
        if (file instanceof File && file.size > 0) {
          const path = `${organizationId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
          const { error: uploadError } = await createClient().storage.from(CERTIFICATE_BUCKET).upload(path, file, { contentType: file.type });
          if (uploadError) return setError(`Échec du téléversement : ${uploadError.message}`);
          formData.set("filePath", path);
        }
        const result = await issueCertification(courseId ?? null, {}, formData);
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
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Nouvelle certification
        </Button>
      )}
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader className="flex-row items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <Award className="size-6" />
          </span>
          <div>
            <DialogTitle className="text-xl">Nouvelle certification</DialogTitle>
            <DialogDescription>Enregistrez une nouvelle certification pour un membre de l&apos;église.</DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-5">
            <SectionTitle step={1} title="Informations générales" hint="Renseignez les informations principales de la certification." tone="bg-blue-50 text-blue-600" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-person">Membre *</Label>
                <FormSelect id="cert-person" name="personId" value={personId} onChange={(e) => setPersonId(e.target.value)} required>
                  <option value="">Sélectionner un membre</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </FormSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-course">Programme / Cours {courseId ? "" : "*"}</Label>
                <FormSelect id="cert-course" name="courseId" value={course} onChange={(e) => setCourse(e.target.value)} required={!courseId} disabled={Boolean(courseId)}>
                  <option value="">Sélectionner un cours</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </FormSelect>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-name">Titre de la certification *</Label>
                <Input id="cert-name" name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} required placeholder="Ex : Fondements de la foi chrétienne" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-issuer">Organisme émetteur (optionnel)</Label>
                <Input id="cert-issuer" name="issuer" placeholder="Ex : Église La Source, Alliance évangélique..." />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cert-description">Description (optionnelle)</Label>
              <textarea
                id="cert-description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Détails sur la certification, les compétences acquises..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
              <span className="text-right text-[11px] text-slate-400">{description.length}/500</span>
            </div>

            <SectionTitle step={2} title="Détails et validation" hint="Renseignez les dates, le statut et les informations de validation." tone="bg-green-50 text-green-600" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-issued">Date d&apos;obtention {status === "pending" ? "" : "*"}</Label>
                <IconInput icon={CalendarDays} id="cert-issued" name="issuedAt" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} required={status !== "pending"} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-expires">Date d&apos;expiration (optionnelle)</Label>
                <IconInput icon={CalendarDays} id="cert-expires" name="expiresAt" type="date" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-number">Numéro de certificat (optionnel)</Label>
                <Input id="cert-number" name="certificateNumber" placeholder="Ex : CERT-2026-001" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-instructor">Formateur / Responsable (optionnel)</Label>
                <FormSelect id="cert-instructor" name="instructorPersonId" defaultValue="">
                  <option value="">Sélectionner un formateur</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </FormSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-status">Statut *</Label>
                <div className="relative">
                  <span className={cn("pointer-events-none absolute left-3 top-1/2 z-10 size-2.5 -translate-y-1/2 rounded-full", STATUS_DOT[status])} />
                  <FormSelect id="cert-status" name="status" value={status} onChange={(e) => setStatus(e.target.value)} className="pl-8">
                    {Object.entries(CERTIFICATION_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </FormSelect>
                </div>
              </div>
            </div>

            <SectionTitle step={3} title="Pièces jointes et visibilité" hint="Ajoutez le certificat et définissez qui peut le voir." tone="bg-purple-50 text-purple-600" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-file">Fichier du certificat (optionnel)</Label>
                <label
                  htmlFor="cert-file"
                  className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-sm text-navy hover:bg-slate-100"
                >
                  <Upload className="size-5 text-primary" />
                  {fileName ?? "Cliquer pour ajouter un fichier"}
                  <span className="text-[11px] text-slate-500">PDF, PNG, JPG (max 5 Mo)</span>
                </label>
                <input id="cert-file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="sr-only" onChange={onFileChange} />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cert-visibility">Visibilité *</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
                    <FormSelect id="cert-visibility" name="visibility" defaultValue="managers" className="pl-9">
                      {Object.entries(CERTIFICATION_VISIBILITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </FormSelect>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Switch id="cert-notify" checked={notify} onCheckedChange={setNotify} aria-label="Notifier le membre" />
                  <label htmlFor="cert-notify" className="cursor-pointer">
                    <p className="text-sm font-semibold text-navy">Notifier le membre</p>
                    <p className="text-xs text-slate-500">Envoyer une notification au membre</p>
                  </label>
                  {notify && <input type="hidden" name="notifyMember" value="on" />}
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
                {pending ? "Enregistrement..." : "Enregistrer la certification"}
              </Button>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
                <span className="flex size-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <Award className="size-4" />
                </span>
                Aperçu de la certification
              </p>
              <div className="mb-4 flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-center">
                <span className="text-[10px] font-bold tracking-widest text-navy">CHURCHOS</span>
                <span className="text-sm font-bold tracking-wide text-navy">CERTIFICATION</span>
                <span className="line-clamp-2 text-xs text-slate-600">{name || "Titre de la certification"}</span>
                <span className="text-sm font-semibold text-navy">{personName || "Nom du membre"}</span>
                <Award className="mt-1 size-6 text-amber-500" />
              </div>
              <div className="flex flex-col gap-3">
                <PreviewRow icon={Award} label="Titre" value={name} />
                <PreviewRow icon={UserIcon} label="Membre" value={personName} />
                <PreviewRow icon={BookOpen} label="Programme" value={courseTitle} />
                <PreviewRow icon={CalendarDays} label="Date d'obtention" value={issuedAt ? formatDate(issuedAt) : ""} />
                <div className="flex items-start gap-3">
                  <UserCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-medium text-navy">Statut</p>
                    <span className={cn("mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_PILL[status])}>
                      {CERTIFICATION_STATUS_LABELS[status]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl bg-blue-50 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Info className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">Conseil</p>
                <p className="text-xs text-slate-600">
                  Ajoutez un fichier de certificat et une description claire pour garder un bon historique des formations.
                </p>
              </div>
            </div>
          </aside>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreviewRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-navy">{label}</p>
        <p className="truncate text-xs text-slate-500">{value || "-"}</p>
      </div>
    </div>
  );
}
