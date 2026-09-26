"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { addMinistryMember, removeMinistryMember, type MinistryActionState } from "@/features/ministries/actions";
import type { getMinistryDetail } from "@/features/ministries/queries";

type Member = NonNullable<Awaited<ReturnType<typeof getMinistryDetail>>>["members"][number];

const initialState: MinistryActionState = {};

export function MinistryMembersPanel({
  ministryId,
  members,
  people,
  canManage,
}: {
  ministryId: string;
  members: Member[];
  people: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const availablePeople = people.filter((p) => !members.some((m) => m.personId === p.id));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-navy">Membres du ministère</p>
        {canManage && (
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Ajouter un membre
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <EmptyState icon={UserRound} title="Aucun membre" description="Ajoutez des personnes à ce ministère." />
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <MemberRow key={member.ministryMemberId} ministryId={ministryId} member={member} canManage={canManage} />
          ))}
        </div>
      )}

      <AddMemberDialog ministryId={ministryId} people={availablePeople} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function MemberRow({ ministryId, member, canManage }: { ministryId: string; member: Member; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRemove() {
    startTransition(async () => {
      const res = await removeMinistryMember(ministryId, member.ministryMemberId);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium text-navy">
          {member.firstName} {member.lastName}
        </span>
        {member.role !== "member" && (
          <Badge variant="secondary" className="text-[10px] capitalize">
            {member.role}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-danger">{error}</span>}
        {canManage && (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" size="sm" disabled={isPending} className="text-danger hover:bg-danger/10">
                Retirer
              </Button>
            }
            title="Retirer ce membre du ministère ?"
            description={`${member.firstName} ${member.lastName} sera retiré(e) de ce ministère.`}
            confirmLabel="Retirer"
            variant="destructive"
            onConfirm={handleRemove}
          />
        )}
      </div>
    </div>
  );
}

function AddMemberDialog({
  ministryId,
  people,
  open,
  onOpenChange,
}: {
  ministryId: string;
  people: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const boundAction = addMinistryMember.bind(null, ministryId);
  const [state, formAction, pending] = useActionState(async (prev: MinistryActionState, formData: FormData) => {
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
          <DialogTitle>Ajouter un membre au ministère</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ministry-member-personId">Personne *</Label>
            <FormSelect id="ministry-member-personId" name="personId" required defaultValue="">
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
            <Label htmlFor="ministry-member-role">Rôle (optionnel)</Label>
            <Input id="ministry-member-role" name="role" defaultValue="member" placeholder="Ex : co-responsable" />
          </div>
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
