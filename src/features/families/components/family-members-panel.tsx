"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Star, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  addFamilyMember,
  removeFamilyMember,
  type FamilyActionState,
} from "@/features/families/actions";
import { RELATIONSHIP_LABELS } from "@/features/families/schemas";
import type { getFamilyDetail } from "@/features/families/queries";

type Member = NonNullable<Awaited<ReturnType<typeof getFamilyDetail>>>["members"][number];

const initialState: FamilyActionState = {};

export function FamilyMembersPanel({
  familyId,
  members,
  people,
  canManage,
  isAdmin,
}: {
  familyId: string;
  members: Member[];
  people: { id: string; name: string }[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const availablePeople = people.filter((p) => !members.some((m) => m.personId === p.id));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-navy">Membres de la famille</p>
        {canManage && (
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Ajouter un membre
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <EmptyState icon={UserRound} title="Aucun membre" description="Ajoutez des personnes à cette famille." />
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <MemberRow key={member.familyMemberId} familyId={familyId} member={member} canManage={isAdmin} />
          ))}
        </div>
      )}

      <AddMemberDialog familyId={familyId} people={availablePeople} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function MemberRow({ familyId, member, canManage }: { familyId: string; member: Member; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRemove() {
    startTransition(async () => {
      const res = await removeFamilyMember(familyId, member.familyMemberId);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
      <div className="flex min-w-0 items-center gap-2">
        <Link href={`/members`} className="truncate text-sm font-medium text-navy">
          {member.firstName} {member.lastName}
        </Link>
        {member.isHead && (
          <Badge variant="secondary" className="text-[10px]">
            Tête de famille
          </Badge>
        )}
        {member.isPrimaryContact && (
          <Badge className="border-gold/40 bg-gold/15 text-[10px] text-navy">
            <Star className="size-2.5" />
            Contact
          </Badge>
        )}
        {member.relationshipToHead && (
          <span className="text-xs text-slate-400">{RELATIONSHIP_LABELS[member.relationshipToHead] ?? member.relationshipToHead}</span>
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
            title="Retirer ce membre de la famille ?"
            description={`${member.firstName} ${member.lastName} sera retiré(e) de cette famille (la personne elle-même n'est pas supprimée).`}
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
  familyId,
  people,
  open,
  onOpenChange,
}: {
  familyId: string;
  people: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const boundAction = addFamilyMember.bind(null, familyId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  useEffect(() => {
    if (state.success) {
      onOpenChange(false);
      window.location.reload();
    }
  }, [state.success, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un membre à la famille</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="personId">Personne *</Label>
            <FormSelect id="personId" name="personId" required defaultValue="">
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
            <Label htmlFor="relationshipToHead">Lien avec le chef de famille (optionnel)</Label>
            <FormSelect id="relationshipToHead" name="relationshipToHead" defaultValue="">
              <option value="">—</option>
              {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FormSelect>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Checkbox name="isHead" />
            Tête de famille
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Checkbox name="isPrimaryContact" />
            Contact principal
          </label>
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
