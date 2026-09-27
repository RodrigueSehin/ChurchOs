"use client";

import { useActionState, useState, useTransition } from "react";
import { BookOpen, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { addCourseModule, deleteCourseModule, type TrainingActionState } from "@/features/training/actions";
import type { getCourseDetail } from "@/features/training/queries";

type CourseModule = NonNullable<Awaited<ReturnType<typeof getCourseDetail>>>["modules"][number];

const initialState: TrainingActionState = {};

export function CourseModulesPanel({
  courseId,
  modules,
  canManage,
  isAdmin,
}: {
  courseId: string;
  modules: CourseModule[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  const boundAdd = addCourseModule.bind(null, courseId);
  const [state, formAction, pending] = useActionState(boundAdd, initialState);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-navy">Modules ({modules.length})</p>

      {modules.length === 0 ? (
        <EmptyState icon={BookOpen} title="Aucun module" description="Structurez ce cours en modules." />
      ) : (
        <div className="flex flex-col gap-2">
          {modules.map((module, index) => (
            <ModuleRow key={module.id} courseId={courseId} module={module} index={index} canDelete={isAdmin} />
          ))}
        </div>
      )}

      {canManage && (
        <form action={formAction} className="flex flex-col gap-2 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-[1fr_100px] gap-2">
            <Input name="title" placeholder="Titre du module" required />
            <Input name="durationMinutes" type="number" min={0} placeholder="Durée (min)" />
          </div>
          <Input name="description" placeholder="Description (optionnel)" />
          <input type="hidden" name="sortOrder" value={modules.length} />
          <Button type="submit" size="sm" disabled={pending} className="self-start">
            {pending ? "Ajout..." : "Ajouter un module"}
          </Button>
          {state.error && <p className="text-xs text-danger">{state.error}</p>}
        </form>
      )}
    </div>
  );
}

function ModuleRow({
  courseId,
  module,
  index,
  canDelete,
}: {
  courseId: string;
  module: CourseModule;
  index: number;
  canDelete: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteCourseModule(courseId, module.id);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
          {index + 1}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-navy">{module.title}</p>
          {module.description && <p className="truncate text-xs text-slate-400">{module.description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {module.durationMinutes && <span className="text-xs text-slate-400">{module.durationMinutes} min</span>}
        {error && <span className="text-xs text-danger">{error}</span>}
        {canDelete && (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" size="sm" disabled={isPending} className="text-danger hover:bg-danger/10">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Supprimer ce module ?"
            description={`"${module.title}" sera définitivement supprimé.`}
            confirmLabel="Supprimer"
            variant="destructive"
            onConfirm={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
