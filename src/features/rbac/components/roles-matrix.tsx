"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Lock, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createRole, deleteRole, toggleRolePermission, type RoleActionState } from "@/features/rbac/actions/roles";
import type { permissions as permissionsTable, roles as rolesTable } from "@/lib/db/schema";

type PermissionRow = typeof permissionsTable.$inferSelect;
type RoleRow = typeof rolesTable.$inferSelect;

const ADMIN_ROLE_CODES = ["SUPER_ADMIN", "CHURCH_OWNER"];

const MODULE_LABELS: Record<string, string> = {
  members: "Membres",
  pastoral: "Pastoral",
  prayer: "Prières",
  visits: "Visites",
  pastoral_council: "Conseil pastoral",
  ministries: "Ministères",
  teams: "Équipes",
  workers: "Ouvriers",
  services: "Services",
  planning: "Plannings",
  events: "Événements",
  attendance: "Présences",
  registrations: "Inscriptions",
  calendar: "Calendrier",
  finance: "Finances",
  reports: "Rapports",
  training: "Cours & discipolat",
  certifications: "Certifications",
  library: "Bibliothèque",
  communication: "Annonces",
  messages: "Messages (SMS/Email)",
  media: "Médias",
  documents: "Documents",
  rooms: "Salles",
  equipment: "Équipements",
  settings: "Paramètres",
};

export function RolesMatrix({
  roles,
  permissions,
  rolePermissions,
}: {
  roles: RoleRow[];
  permissions: PermissionRow[];
  /** roleId -> Set<permissionCode> */
  rolePermissions: Record<string, string[]>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const grouped = new Map<string, PermissionRow[]>();
  for (const p of permissions) {
    const arr = grouped.get(p.module) ?? [];
    arr.push(p);
    grouped.set(p.module, arr);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-navy">Rôles &amp; permissions</p>
          <p className="text-xs text-slate-400">
            Cochez les permissions accordées à chaque rôle personnalisé. Les rôles système
            (Super Admin, Propriétaire) ont toujours un accès complet.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Nouveau rôle
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
              <th className="sticky left-0 z-10 min-w-[220px] bg-slate-50 px-4 py-2.5 font-medium">
                Permission
              </th>
              {roles.map((role) => (
                <th key={role.id} className="min-w-[130px] px-2 py-2.5 text-center font-medium text-navy">
                  <div className="flex flex-col items-center gap-1">
                    <span>{role.name}</span>
                    <span className="flex items-center gap-1">
                      {role.isSystem ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Système
                        </Badge>
                      ) : (
                        <DeleteRoleButton roleId={role.id} roleName={role.name} />
                      )}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(grouped.entries()).map(([module, perms]) => (
              <FragmentModule key={module} module={module} perms={perms} roles={roles} rolePermissions={rolePermissions} />
            ))}
          </tbody>
        </table>
      </div>

      <AddRoleDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function FragmentModule({
  module,
  perms,
  roles,
  rolePermissions,
}: {
  module: string;
  perms: PermissionRow[];
  roles: RoleRow[];
  rolePermissions: Record<string, string[]>;
}) {
  return (
    <>
      <tr className="bg-slate-50/60">
        <td colSpan={roles.length + 1} className="sticky left-0 bg-slate-50/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {MODULE_LABELS[module] ?? module}
        </td>
      </tr>
      {perms.map((perm) => (
        <tr key={perm.id} className="border-b border-slate-50 last:border-0">
          <td className="sticky left-0 z-10 bg-white px-4 py-2 text-slate-600">{perm.name}</td>
          {roles.map((role) => (
            <td key={role.id} className="px-2 py-2 text-center">
              {ADMIN_ROLE_CODES.includes(role.code) ? (
                <Lock className="mx-auto size-3.5 text-slate-300" aria-label="Toujours accordé" />
              ) : (
                <PermissionCheckbox
                  roleId={role.id}
                  permissionId={perm.id}
                  checked={rolePermissions[role.id]?.includes(perm.code) ?? false}
                />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function PermissionCheckbox({
  roleId,
  permissionId,
  checked,
}: {
  roleId: string;
  permissionId: string;
  checked: boolean;
}) {
  const [optimistic, setOptimistic] = useState(checked);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setOptimistic(next);
    startTransition(async () => {
      const res = await toggleRolePermission(roleId, permissionId, next);
      if (res.error) setOptimistic(!next);
    });
  }

  return (
    <Checkbox
      checked={optimistic}
      onCheckedChange={handleChange}
      disabled={isPending}
      className="mx-auto"
    />
  );
}

function DeleteRoleButton({ roleId, roleName }: { roleId: string; roleName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Voir la note dans `campus-manager.tsx` : un appel impératif à une Server Action ne
  // rafraîchit pas le rendu client de façon fiable ici — rechargement complet, pour une action
  // peu fréquente (contrairement au `PermissionCheckbox` ci-dessus, qui gère son propre état
  // optimiste et n'a pas ce problème).
  function handleDelete() {
    startTransition(async () => {
      const res = await deleteRole(roleId);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <span className="inline-flex flex-col items-center">
      <ConfirmDialog
        trigger={
          <button
            type="button"
            disabled={isPending}
            className="rounded p-0.5 text-slate-400 hover:bg-danger/10 hover:text-danger"
            aria-label={`Supprimer le rôle ${roleName}`}
          >
            <Trash2 className="size-3" />
          </button>
        }
        title="Supprimer ce rôle ?"
        description={`"${roleName}" sera supprimé et retiré de tous les membres qui l'ont.`}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={handleDelete}
      />
      {error && <span className="text-[10px] text-danger">{error}</span>}
    </span>
  );
}

const createRoleInitialState: RoleActionState = {};

function AddRoleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [state, formAction, pending] = useActionState(createRole, createRoleInitialState);

  useEffect(() => {
    if (state.success) onOpenChange(false);
  }, [state.success, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau rôle</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-name">Nom *</Label>
            <Input id="role-name" name="name" required placeholder="Ex : Responsable louange" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-description">Description (optionnel)</Label>
            <Input id="role-description" name="description" />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
