"use client";

import { useState, useTransition } from "react";
import { Check, MoreVertical, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormSelect } from "@/components/shared/form-select";
import { EmptyState } from "@/components/shared/empty-state";
import { updateMemberRole, updateMemberStatus } from "@/features/rbac/actions/members";
import type { OrganizationMember } from "@/features/rbac/queries";
import type { roles as rolesTable } from "@/lib/db/schema";

type RoleRow = typeof rolesTable.$inferSelect;

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "warning" | "secondary" }> = {
  active: { label: "Actif", variant: "success" },
  invited: { label: "Invité", variant: "warning" },
  suspended: { label: "Suspendu", variant: "warning" },
  left: { label: "Parti", variant: "secondary" },
};

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function formatLastSeen(date: Date | null) {
  if (!date) return "Jamais connecté";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(date));
}

export function MembersTable({
  members: initialMembers,
  roles,
  currentUserId,
}: {
  members: OrganizationMember[];
  roles: RoleRow[];
  currentUserId: string;
}) {
  // État local, initialisé depuis le serveur, mis à jour de façon optimiste par les lignes —
  // `revalidatePath` (dans les Server Actions) ne rafraîchit automatiquement le rendu client
  // qu'après une soumission de `<form action>`, pas après un appel impératif comme ceux d'ici
  // (vérifié en conditions réelles : l'écriture en base réussissait déjà, seul l'affichage
  // restait périmé). Mettre à jour cet état directement est plus simple et plus robuste qu'un
  // `router.refresh()` dont le succès dépend du cycle de revalidation du framework.
  const [members, setMembers] = useState(initialMembers);

  function patchMember(membershipId: string, patch: Partial<OrganizationMember>) {
    setMembers((prev) => prev.map((m) => (m.membershipId === membershipId ? { ...m, ...patch } : m)));
  }

  if (members.length === 0) {
    return (
      <EmptyState icon={User} title="Aucun membre" description="Invitez le premier membre de votre équipe." />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Membre</th>
            <th className="px-3 py-2.5 font-medium">Rôle</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="px-3 py-2.5 font-medium">Dernière connexion</th>
            <th className="px-3 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <MemberRow
              key={member.membershipId}
              member={member}
              roles={roles}
              isSelf={member.userId === currentUserId}
              onPatch={(patch) => patchMember(member.membershipId, patch)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemberRow({
  member,
  roles,
  isSelf,
  onPatch,
}: {
  member: OrganizationMember;
  roles: RoleRow[];
  isSelf: boolean;
  onPatch: (patch: Partial<OrganizationMember>) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const name = member.displayName || [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email || "—";
  const currentRoleId = member.roles[0]?.id ?? "";
  const status = STATUS_BADGE[member.status] ?? { label: member.status, variant: "secondary" as const };

  function handleRoleChange(roleId: string) {
    setError(null);
    setSaved(false);
    const role = roles.find((r) => r.id === roleId);
    startTransition(async () => {
      const res = await updateMemberRole(member.membershipId, roleId);
      if (res.error) setError(res.error);
      else if (role) {
        onPatch({ roles: [{ id: role.id, code: role.code, name: role.name }] });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  function handleStatusChange(next: "active" | "suspended" | "left") {
    setError(null);
    startTransition(async () => {
      const res = await updateMemberStatus(member.membershipId, next);
      if (res.error) setError(res.error);
      else onPatch({ status: next });
    });
  }

  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-semibold text-navy">
            {initialsOf(name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-navy">
              {name} {isSelf && <span className="text-xs font-normal text-slate-400">(vous)</span>}
            </p>
            <p className="truncate text-xs text-slate-400">{member.email ?? "—"}</p>
            {member.title && <p className="truncate text-xs text-slate-400">{member.title}</p>}
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </td>
      <td className="px-3 py-3">
        <FormSelect
          value={currentRoleId}
          disabled={isPending || isSelf}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="h-9 text-xs"
          aria-label={`Rôle de ${name}`}
          title={isSelf ? "Vous ne pouvez pas modifier votre propre rôle" : "Changer le rôle"}
        >
          {!currentRoleId && <option value="">Aucun rôle</option>}
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </FormSelect>
        {saved && (
          <p role="status" className="mt-1 flex items-center gap-1 text-xs text-success">
            <Check className="size-3" />
            Rôle mis à jour
          </p>
        )}
      </td>
      <td className="px-3 py-3">
        <Badge variant={status.variant}>{status.label}</Badge>
      </td>
      <td className="px-3 py-3 text-xs text-slate-500">{formatLastSeen(member.lastSignInAt)}</td>
      <td className="px-3 py-3 text-right">
        {!isSelf && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isPending}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {member.status !== "active" && (
                <DropdownMenuItem onSelect={() => handleStatusChange("active")}>Activer</DropdownMenuItem>
              )}
              {member.status === "active" && (
                <DropdownMenuItem onSelect={() => handleStatusChange("suspended")}>Suspendre</DropdownMenuItem>
              )}
              {member.status !== "left" && (
                <DropdownMenuItem
                  className="text-danger data-[highlighted]:bg-danger/10"
                  onSelect={() => handleStatusChange("left")}
                >
                  Retirer de l&apos;organisation
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  );
}
