"use client";

import { useActionState, useState, useTransition } from "react";
import { Award, Plus, Trash2 } from "lucide-react";

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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { deleteCertification, issueCertification, type TrainingActionState } from "@/features/training/actions";
import type { getCourseDetail } from "@/features/training/queries";

type Certification = NonNullable<Awaited<ReturnType<typeof getCourseDetail>>>["certifications"][number];

const initialState: TrainingActionState = {};

export function CertificationsPanel({
  courseId,
  certifications,
  people,
  canManage,
  isAdmin,
}: {
  courseId: string;
  certifications: Certification[];
  people: { id: string; name: string }[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-navy">Certifications ({certifications.length})</p>
        {canManage && (
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Délivrer
          </Button>
        )}
      </div>

      {certifications.length === 0 ? (
        <EmptyState icon={Award} title="Aucune certification" description="Délivrez une certification à une personne ayant terminé ce cours." />
      ) : (
        <div className="flex flex-col gap-2">
          {certifications.map((cert) => (
            <CertificationRow key={cert.id} courseId={courseId} certification={cert} canDelete={isAdmin} />
          ))}
        </div>
      )}

      <IssueCertificationDialog courseId={courseId} people={people} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function CertificationRow({
  courseId,
  certification,
  canDelete,
}: {
  courseId: string;
  certification: Certification;
  canDelete: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteCertification(courseId, certification.id);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-navy">
          {certification.firstName} {certification.lastName} — {certification.name}
        </p>
        <p className="text-xs text-slate-400">
          {certification.certificateNumber ? `N° ${certification.certificateNumber} · ` : ""}
          Délivrée le {certification.issuedAt ?? "—"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-danger">{error}</span>}
        {canDelete && (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" size="sm" disabled={isPending} className="text-danger hover:bg-danger/10">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Supprimer cette certification ?"
            description="Cette certification sera définitivement supprimée."
            confirmLabel="Supprimer"
            variant="destructive"
            onConfirm={handleDelete}
          />
        )}
      </div>
    </div>
  );
}

function IssueCertificationDialog({
  courseId,
  people,
  open,
  onOpenChange,
}: {
  courseId: string;
  people: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const boundAction = issueCertification.bind(null, courseId);
  const [state, formAction, pending] = useActionState(async (prev: TrainingActionState, formData: FormData) => {
    const result = await boundAction(prev, formData);
    if (result.success) {
      onOpenChange(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Délivrer une certification</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cert-personId">Personne *</Label>
            <FormSelect id="cert-personId" name="personId" required defaultValue="">
              <option value="" disabled>
                Choisir une personne
              </option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FormSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cert-name">Nom du certificat *</Label>
            <Input id="cert-name" name="name" placeholder="Ex : Certificat de discipolat" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cert-number">Numéro (optionnel)</Label>
              <Input id="cert-number" name="certificateNumber" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cert-issued">Délivrée le (optionnel)</Label>
              <Input id="cert-issued" name="issuedAt" type="date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cert-expires">Expire le (optionnel)</Label>
              <Input id="cert-expires" name="expiresAt" type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cert-url">Lien du certificat (optionnel)</Label>
              <Input id="cert-url" name="credentialUrl" placeholder="https://..." />
            </div>
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Délivrance..." : "Délivrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
