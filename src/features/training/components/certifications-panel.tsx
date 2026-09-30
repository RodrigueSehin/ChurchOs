"use client";

import { useState, useTransition } from "react";
import { Award, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { deleteCertification } from "@/features/training/actions";
import { CertificationFormDialog } from "@/features/training/components/certification-form-dialog";
import type { getCourseDetail } from "@/features/training/queries";

type Certification = NonNullable<Awaited<ReturnType<typeof getCourseDetail>>>["certifications"][number];

export function CertificationsPanel({
  courseId,
  courseTitle,
  organizationId,
  certifications,
  people,
  canManage,
  isAdmin,
}: {
  courseId: string;
  courseTitle: string;
  organizationId: string;
  certifications: Certification[];
  people: { id: string; name: string }[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-navy">Certifications ({certifications.length})</p>
        {canManage && (
          <CertificationFormDialog
            organizationId={organizationId}
            people={people}
            courses={[{ id: courseId, title: courseTitle }]}
            courseId={courseId}
            trigger={
              <Button type="button" size="sm">
                <Plus className="size-4" />
                Délivrer
              </Button>
            }
          />
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
