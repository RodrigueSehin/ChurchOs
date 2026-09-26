"use client";

import { useActionState, useState, useTransition } from "react";
import { UserMinus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormSelect } from "@/components/shared/form-select";
import { addCouncilMember, removeCouncilMember, type CouncilActionState } from "@/features/pastoral-council/actions";
import { ATTENDANCE_LABELS } from "@/features/pastoral-council/schemas";
import type { getPastoralCouncilDetail } from "@/features/pastoral-council/queries";

type Member = NonNullable<Awaited<ReturnType<typeof getPastoralCouncilDetail>>>["members"][number];

const initialState: CouncilActionState = {};

export function CouncilMembersPanel({
  councilId,
  members,
  people,
  assignableUsers,
  canManage,
  isAdmin,
}: {
  councilId: string;
  members: Member[];
  people: { id: string; name: string }[];
  assignableUsers: { id: string; name: string }[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  const boundAdd = addCouncilMember.bind(null, councilId);
  const [state, formAction, pending] = useActionState(boundAdd, initialState);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-navy">Participants</p>

      {members.length === 0 ? (
        <p className="text-sm text-slate-400">Aucun participant enregistré.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} canRemove={isAdmin} />
          ))}
        </div>
      )}

      {canManage && (
        <form action={formAction} className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <FormSelect name="personId" defaultValue="">
              <option value="">Personne (optionnel)</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FormSelect>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <FormSelect name="userId" defaultValue="">
              <option value="">Utilisateur (optionnel)</option>
              {assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </FormSelect>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <FormSelect name="attendanceStatus" defaultValue="">
              <option value="">Présence (optionnel)</option>
              {Object.entries(ATTENDANCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FormSelect>
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      )}
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
    </div>
  );
}

function MemberRow({ member, canRemove }: { member: Member; canRemove: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const name = member.personId ? `${member.personFirstName} ${member.personLastName}` : member.userEmail ?? "—";

  function handleRemove() {
    startTransition(async () => {
      const res = await removeCouncilMember(member.id);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-navy">{name}</span>
        {member.attendanceStatus && <Badge variant="secondary">{ATTENDANCE_LABELS[member.attendanceStatus] ?? member.attendanceStatus}</Badge>}
      </div>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-danger">{error}</span>}
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleRemove} className="text-danger hover:bg-danger/10">
            <UserMinus className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
