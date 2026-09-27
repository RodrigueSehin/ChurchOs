"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

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
import type { TrainingActionState } from "@/features/training/actions";
import { COURSE_STATUS_LABELS } from "@/features/training/schemas";
import type { courses } from "@/lib/db/schema";

const initialState: TrainingActionState = {};

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
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: TrainingActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{course ? `Modifier ${course.title}` : "Nouveau cours"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-title">Titre *</Label>
              <Input id="course-title" name="title" defaultValue={course?.title ?? ""} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-status">Statut</Label>
              <FormSelect id="course-status" name="status" defaultValue={course?.status ?? "draft"}>
                {Object.entries(COURSE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-description">Description (optionnel)</Label>
            <Input id="course-description" name="description" defaultValue={course?.description ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-instructor">Formateur (optionnel)</Label>
              <FormSelect id="course-instructor" name="instructorPersonId" defaultValue={course?.instructorPersonId ?? ""}>
                <option value="">—</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-duration">Durée en minutes (optionnel)</Label>
              <Input
                id="course-duration"
                name="durationMinutes"
                type="number"
                min={0}
                defaultValue={course?.durationMinutes ?? ""}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-image">URL de l&apos;image (optionnel)</Label>
            <Input id="course-image" name="imageUrl" defaultValue={course?.imageUrl ?? ""} placeholder="https://..." />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : course ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
