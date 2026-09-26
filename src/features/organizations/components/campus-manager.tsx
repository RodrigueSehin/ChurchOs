"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Building2, MapPin, Plus, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { CampusFormFields } from "@/features/organizations/components/campus-form-fields";
import {
  createCampus,
  deleteCampus,
  setMainCampus,
  updateCampus,
  type OrgActionState,
} from "@/features/organizations/actions";
import type { campuses } from "@/lib/db/schema";

const initialState: OrgActionState = {};

export function CampusManager({ campuses: list }: { campuses: (typeof campuses.$inferSelect)[] }) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-navy">Campus</p>
          <p className="text-xs text-slate-400">Les différents lieux de culte de votre église.</p>
        </div>
        <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Ajouter un campus
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun campus"
          description="Ajoutez le premier campus de votre église."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((campus) => (
            <CampusRow key={campus.id} campus={campus} />
          ))}
        </div>
      )}

      <AddCampusDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function CampusRow({ campus }: { campus: typeof campuses.$inferSelect }) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // `revalidatePath` (dans l'action serveur) ne rafraîchit le rendu client automatiquement
  // qu'après une soumission de `<form action>` (voir `AddCampusDialog`/`EditCampusDialog` plus
  // bas, qui n'ont pas ce problème) — un appel impératif comme ici a besoin d'autre chose ;
  // `router.refresh()` s'est avéré peu fiable en conditions réelles (l'écriture réussissait,
  // l'affichage restait périmé), donc un rechargement complet, pour une action peu fréquente.
  function handleSetMain() {
    setError(null);
    startTransition(async () => {
      const res = await setMainCampus(campus.id);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteCampus(campus.id);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy">
            <Building2 className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-navy">{campus.name}</p>
              {campus.isMain && (
                <Badge className="border-gold/40 bg-gold/15 text-navy">
                  <Star className="size-3" />
                  Principal
                </Badge>
              )}
            </div>
            {(campus.city || campus.code) && (
              <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                {campus.city && (
                  <>
                    <MapPin className="size-3" />
                    {campus.city}
                  </>
                )}
                {campus.code && <span>{campus.city ? " · " : ""}{campus.code}</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!campus.isMain && (
            <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleSetMain}>
              Définir principal
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Modifier
          </Button>
          {!campus.isMain && (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="ghost" size="sm" className="text-danger hover:bg-danger/10">
                  Supprimer
                </Button>
              }
              title="Supprimer ce campus ?"
              description={`"${campus.name}" sera définitivement supprimé.`}
              confirmLabel="Supprimer"
              variant="destructive"
              onConfirm={handleDelete}
            />
          )}
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}

      <EditCampusDialog campus={campus} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

function AddCampusDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [state, formAction, pending] = useActionState(createCampus, initialState);

  useEffect(() => {
    if (state.success) onOpenChange(false);
  }, [state.success, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un campus</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <CampusFormFields idPrefix="add-campus" />
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditCampusDialog({
  campus,
  open,
  onOpenChange,
}: {
  campus: typeof campuses.$inferSelect;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const boundAction = updateCampus.bind(null, campus.id);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  useEffect(() => {
    if (state.success) onOpenChange(false);
  }, [state.success, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier {campus.name}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <CampusFormFields campus={campus} idPrefix={`edit-campus-${campus.id}`} />
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
