"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, UserRound } from "lucide-react";

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
import {
  enrollPerson,
  removeEnrollment,
  updateEnrollmentProgress,
  updateEnrollmentStatus,
  type TrainingActionState,
} from "@/features/training/actions";
import { ENROLLMENT_STATUS_LABELS } from "@/features/training/schemas";
import type { getCourseDetail } from "@/features/training/queries";

type Enrollment = NonNullable<Awaited<ReturnType<typeof getCourseDetail>>>["enrollments"][number];

const initialState: TrainingActionState = {};

export function CourseEnrollmentsPanel({
  courseId,
  enrollments,
  people,
  canManage,
  isAdmin,
}: {
  courseId: string;
  enrollments: Enrollment[];
  people: { id: string; name: string }[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const availablePeople = people.filter((p) => !enrollments.some((e) => e.personId === p.id));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-navy">Inscriptions ({enrollments.length})</p>
        {canManage && (
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Inscrire
          </Button>
        )}
      </div>

      {enrollments.length === 0 ? (
        <EmptyState icon={UserRound} title="Aucune inscription" description="Inscrivez des personnes à ce cours." />
      ) : (
        <div className="flex flex-col gap-2">
          {enrollments.map((enrollment) => (
            <EnrollmentRow key={enrollment.id} courseId={courseId} enrollment={enrollment} canManage={canManage} canDelete={isAdmin} />
          ))}
        </div>
      )}

      <EnrollPersonDialog courseId={courseId} people={availablePeople} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function EnrollmentRow({
  courseId,
  enrollment,
  canManage,
  canDelete,
}: {
  courseId: string;
  enrollment: Enrollment;
  canManage: boolean;
  canDelete: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatusChange(status: string) {
    startTransition(async () => {
      const res = await updateEnrollmentStatus(courseId, enrollment.id, status);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  function handleProgressChange(value: string) {
    startTransition(async () => {
      const res = await updateEnrollmentProgress(courseId, enrollment.id, value);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const res = await removeEnrollment(courseId, enrollment.id);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm font-medium text-navy">
          {enrollment.firstName} {enrollment.lastName}
        </span>
        <div className="flex items-center gap-2">
          {canManage ? (
            <FormSelect
              value={enrollment.status}
              disabled={isPending}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="h-8 w-auto text-xs"
            >
              {Object.entries(ENROLLMENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FormSelect>
          ) : (
            <span className="text-xs text-slate-500">{ENROLLMENT_STATUS_LABELS[enrollment.status] ?? enrollment.status}</span>
          )}
          {canDelete && (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="ghost" size="sm" disabled={isPending} className="text-danger hover:bg-danger/10">
                  Retirer
                </Button>
              }
              title="Retirer cette inscription ?"
              description={`${enrollment.firstName} ${enrollment.lastName} sera désinscrit(e) de ce cours.`}
              confirmLabel="Retirer"
              variant="destructive"
              onConfirm={handleRemove}
            />
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Number(enrollment.progress)}%` }} />
        </div>
        {canManage ? (
          <Input
            type="number"
            min={0}
            max={100}
            defaultValue={enrollment.progress}
            disabled={isPending}
            onBlur={(e) => handleProgressChange(e.target.value)}
            className="h-7 w-20 text-right text-xs"
          />
        ) : (
          <span className="w-12 text-right text-xs text-slate-500">{Number(enrollment.progress)}%</span>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function EnrollPersonDialog({
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
  const boundAction = enrollPerson.bind(null, courseId);
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
          <DialogTitle>Inscrire une personne à ce cours</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="enroll-personId">Personne *</Label>
            <FormSelect id="enroll-personId" name="personId" required defaultValue="">
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
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Inscription..." : "Inscrire"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
