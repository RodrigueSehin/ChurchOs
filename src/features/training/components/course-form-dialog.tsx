"use client";

import { useActionState, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock,
  GraduationCap,
  ImagePlus,
  Info,
  Layers,
  Plus,
  Tag,
  Users,
  User as UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { IconInput } from "@/components/shared/icon-input";
import type { TrainingActionState } from "@/features/training/actions";
import {
  COURSE_CATEGORIES,
  COURSE_COVER_MAX_BYTES,
  COURSE_LEVELS,
  COURSE_STATUS_LABELS,
} from "@/features/training/schemas";
import { formatDuration } from "@/features/training/components/course-card";
import { cn } from "@/lib/utils";
import type { courses } from "@/lib/db/schema";

const initialState: TrainingActionState = {};

function SectionTitle({ step, title, hint, tone }: { step: number; title: string; hint: string; tone: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5", tone)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-sm font-bold">
        {step}
      </span>
      <div>
        <p className="text-sm font-semibold text-navy">{title}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

function Counter({ value, max }: { value: number; max: number }) {
  return <span className="text-right text-[11px] text-slate-400">{value}/{max}</span>;
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

export function CourseFormDialog({
  action,
  people,
  course,
  trigger,
}: {
  action: (prev: TrainingActionState, formData: FormData) => Promise<TrainingActionState>;
  people: { id: string; name: string }[];
  course?: typeof courses.$inferSelect;
  trigger?: React.ReactNode;
}) {
  const editing = Boolean(course);
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: TrainingActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [prerequisites, setPrerequisites] = useState(course?.prerequisites ?? "");
  const [category, setCategory] = useState(course?.category ?? "");
  const [instructorId, setInstructorId] = useState(course?.instructorPersonId ?? "");
  const [coIds, setCoIds] = useState<string[]>(course?.coInstructorIds ?? []);
  const [moduleCount, setModuleCount] = useState("1");
  const [moduleMinutes, setModuleMinutes] = useState("");
  const [level, setLevel] = useState(course?.level ?? "all");
  const [status, setStatus] = useState(course?.status ?? "draft");
  const [allowEnrollment, setAllowEnrollment] = useState(course?.allowEnrollment ?? true);
  const [showInLibrary, setShowInLibrary] = useState(course?.showInLibrary ?? true);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const shownCover = preview ?? (removeCover ? null : course?.imageUrl ?? null);
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? "";
  const totalMinutes = editing ? (course?.durationMinutes ?? 0) : Number(moduleCount || 0) * Number(moduleMinutes || 0);

  function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setCoverError(null);
    if (file && file.size > COURSE_COVER_MAX_BYTES) {
      setCoverError("Image trop volumineuse (2 Mo maximum).");
      e.target.value = "";
      setPreview(null);
      return;
    }
    setPreview(file ? URL.createObjectURL(file) : null);
    if (file) setRemoveCover(false);
  }

  function toggleCo(id: string) {
    setCoIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Nouveau cours
        </Button>
      )}
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader className="flex-row items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <GraduationCap className="size-6" />
          </span>
          <div>
            <DialogTitle className="text-xl">{editing ? `Modifier ${course?.title}` : "Nouveau cours"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Mettez à jour les informations de ce cours."
                : "Créez un nouveau cours pour former et édifier les membres de votre église."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <form action={formAction} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-5">
            <SectionTitle step={1} title="Informations générales" hint="Renseignez les informations principales du cours." tone="bg-blue-50 text-blue-600" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="course-title">Titre du cours *</Label>
                <Input id="course-title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required placeholder="Ex : Fondements de la foi chrétienne" />
                <Counter value={title.length} max={100} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="course-category">Catégorie *</Label>
                <FormSelect id="course-category" name="category" value={category} onChange={(e) => setCategory(e.target.value)} required>
                  <option value="">Sélectionner une catégorie</option>
                  {COURSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </FormSelect>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-description">Description *</Label>
              <textarea
                id="course-description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                required
                rows={3}
                placeholder="Présentez le contenu et les objectifs de ce cours..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
              <Counter value={description.length} max={500} />
            </div>

            <SectionTitle step={2} title="Détails du cours" hint="Configurez le contenu et l'organisation." tone="bg-green-50 text-green-600" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="course-instructor">Formateur principal *</Label>
                <FormSelect id="course-instructor" name="instructorPersonId" value={instructorId} onChange={(e) => setInstructorId(e.target.value)} required>
                  <option value="">Sélectionner un formateur</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </FormSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Co-formateurs (optionnel)</Label>
                <details className="group relative">
                  <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500">
                    <Users className="size-4 text-slate-400" />
                    <span className="truncate">
                      {coIds.length === 0 ? "Sélectionner des co-formateurs" : coIds.map(nameOf).join(", ")}
                    </span>
                  </summary>
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                    {people
                      .filter((p) => p.id !== instructorId)
                      .map((p) => (
                        <li key={p.id}>
                          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                            <input type="checkbox" checked={coIds.includes(p.id)} onChange={() => toggleCo(p.id)} />
                            {p.name}
                          </label>
                        </li>
                      ))}
                  </ul>
                </details>
                {coIds.filter((id) => id !== instructorId).map((id) => (
                  <input key={id} type="hidden" name="coInstructorIds" value={id} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {!editing && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="course-modules">Nombre de modules *</Label>
                    <IconInput icon={Layers} id="course-modules" name="moduleCount" type="number" min={1} max={100} value={moduleCount} onChange={(e) => setModuleCount(e.target.value)} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="course-module-minutes">Durée par module (optionnel)</Label>
                    <IconInput icon={Clock} id="course-module-minutes" name="moduleMinutes" type="number" min={0} value={moduleMinutes} onChange={(e) => setModuleMinutes(e.target.value)} placeholder="Minutes, ex : 120" />
                  </div>
                </>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="course-level">Niveau *</Label>
                <FormSelect id="course-level" name="level" value={level} onChange={(e) => setLevel(e.target.value)}>
                  {Object.entries(COURSE_LEVELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </FormSelect>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-prerequisites">Prérequis (optionnel)</Label>
              <textarea
                id="course-prerequisites"
                name="prerequisites"
                value={prerequisites}
                onChange={(e) => setPrerequisites(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="Ex : Connaissances de base de la Bible..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
              <Counter value={prerequisites.length} max={300} />
            </div>

            <SectionTitle step={3} title="Paramètres et visibilité" hint="Définissez la disponibilité et les options d'inscription." tone="bg-purple-50 text-purple-600" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Statut *</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(COURSE_STATUS_LABELS).map(([value, label]) => (
                    <label
                      key={value}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                        status === value ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600",
                      )}
                    >
                      <input type="radio" name="status" value={value} checked={status === value} onChange={() => setStatus(value as typeof status)} className="accent-primary" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="course-published-at">Date de publication (optionnel)</Label>
                <IconInput icon={CalendarDays} id="course-published-at" name="publishedAt" type="date" defaultValue={course?.publishedAt ?? ""} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Switch id="course-allow-enrollment" checked={allowEnrollment} onCheckedChange={setAllowEnrollment} aria-label="Autoriser l'inscription" />
                <label htmlFor="course-allow-enrollment" className="cursor-pointer">
                  <p className="text-sm font-semibold text-navy">Autoriser l&apos;inscription</p>
                  <p className="text-xs text-slate-500">Les membres peuvent s&apos;inscrire à ce cours</p>
                </label>
                {allowEnrollment && <input type="hidden" name="allowEnrollment" value="on" />}
              </div>
              <div className="flex items-start gap-3">
                <Switch id="course-show-library" checked={showInLibrary} onCheckedChange={setShowInLibrary} aria-label="Afficher dans la bibliothèque" />
                <label htmlFor="course-show-library" className="cursor-pointer">
                  <p className="text-sm font-semibold text-navy">Afficher dans la bibliothèque</p>
                  <p className="text-xs text-slate-500">Visible dans le catalogue des cours</p>
                </label>
                {showInLibrary && <input type="hidden" name="showInLibrary" value="on" />}
              </div>
            </div>

            {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                <BookOpen className="size-4" />
                {pending ? "Enregistrement..." : editing ? "Enregistrer" : "Créer le cours"}
              </Button>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
                <span className="flex size-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <GraduationCap className="size-4" />
                </span>
                Aperçu
              </p>
              <input ref={coverInput} type="file" name="cover" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onCoverChange} />
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                className="relative mb-2 flex aspect-[16/9] w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-dashed border-primary/40 bg-blue-50 text-center text-xs text-navy"
              >
                {shownCover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob) ou URL de couverture
                  <img src={shownCover} alt="" className="absolute inset-0 size-full object-cover" />
                ) : (
                  <>
                    <ImagePlus className="size-6 text-primary" />
                    <span className="font-semibold">Ajouter une image de couverture</span>
                    <span className="text-[10px] text-slate-500">PNG, JPG (max 2 Mo)</span>
                  </>
                )}
              </button>
              {course?.imageUrl && !preview && (
                <label className="mb-2 flex items-center gap-1.5 text-xs text-slate-600">
                  <input type="checkbox" name="removeCover" checked={removeCover} onChange={(e) => setRemoveCover(e.target.checked)} />
                  Retirer l&apos;image
                </label>
              )}
              {coverError && <p role="alert" className="mb-2 text-xs text-danger">{coverError}</p>}
              <div className="flex flex-col gap-3">
                <PreviewRow icon={BookOpen} label="Titre" value={title} />
                <PreviewRow icon={Tag} label="Catégorie" value={category} />
                <PreviewRow icon={UserIcon} label="Formateur" value={nameOf(instructorId)} />
                <PreviewRow icon={Layers} label="Modules" value={editing ? "" : moduleCount} />
                <PreviewRow icon={Clock} label="Durée totale" value={totalMinutes ? formatDuration(totalMinutes) : ""} />
                <PreviewRow icon={BarChart3} label="Niveau" value={COURSE_LEVELS[level] ?? ""} />
              </div>
            </div>
            <div className="flex gap-3 rounded-xl bg-blue-50 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Info className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">Conseil</p>
                <p className="text-xs text-slate-600">
                  Une bonne description et une image attractive aideront les membres à comprendre l&apos;objectif du cours.
                </p>
              </div>
            </div>
          </aside>
        </form>
      </DialogContent>
    </Dialog>
  );
}
