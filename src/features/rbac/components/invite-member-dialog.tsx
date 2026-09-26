"use client";

import { useState } from "react";
import { Mail, Plus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/shared/form-select";
import { IconInput } from "@/components/shared/icon-input";
import type { roles as rolesTable } from "@/lib/db/schema";

export function InviteMemberDialog({ roles }: { roles: (typeof rolesTable.$inferSelect)[] }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [roleCode, setRoleCode] = useState(roles.find((r) => r.code === "WORKER")?.code ?? roles[0]?.code ?? "");
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/organizations/members/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, roleCode, title }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'invitation.");
        return;
      }
      // `MembersTable` tient sa propre copie locale des membres (voir sa note sur
      // `router.refresh()` qui ne suffit pas ici) — un rechargement complet est le moyen simple
      // et fiable de lui faire voir le nouveau membre, pour une action peu fréquente comme celle-ci.
      // (state local du dialogue pas besoin d'être remis à zéro : la page recharge entièrement.)
      window.location.reload();
      return;
    } catch {
      setError("Erreur réseau — réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Inviter un membre
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4" />
            Inviter un membre
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">Email *</Label>
            <IconInput
              icon={Mail}
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@exemple.com"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Rôle *</Label>
            <FormSelect
              id="invite-role"
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.name}
                </option>
              ))}
            </FormSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-title">Titre / fonction (optionnel)</Label>
            <Input
              id="invite-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Responsable louange"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Envoi..." : "Envoyer l'invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
