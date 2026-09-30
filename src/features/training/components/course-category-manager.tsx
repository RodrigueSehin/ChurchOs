"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { createCourseCategory, deleteCourseCategory, type TrainingActionState } from "@/features/training/actions";

const initialState: TrainingActionState = {};

/** Gestion des catégories de cours (ajout / suppression). Les cours existants gardent leur catégorie. */
export function CourseCategoryManager({ categories }: { categories: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(async (prev: TrainingActionState, formData: FormData) => {
    const result = await createCourseCategory(prev, formData);
    if (result.success) window.location.reload();
    return result;
  }, initialState);

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteCourseCategory(id);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Tag className="size-4" />
        Catégories
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catégories de cours</DialogTitle>
          </DialogHeader>

          {categories.length === 0 ? (
            <EmptyState icon={Tag} title="Aucune catégorie" description="Créez la première catégorie." />
          ) : (
            <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-navy">
                  {c.name}
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    aria-label={`Supprimer ${c.name}`}
                    className="rounded p-1 text-slate-400 hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form action={formAction} className="flex flex-col gap-3 border-t border-slate-100 pt-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-category-name">Nouvelle catégorie</Label>
              <Input id="course-category-name" name="name" placeholder="Ex : Mariage et famille" maxLength={60} required />
            </div>
            {(state.error || error) && <p role="alert" className="text-sm text-danger">{error ?? state.error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                <Plus className="size-4" />
                {pending ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
