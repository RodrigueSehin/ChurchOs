"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Mail, Plus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/shared/form-select";
import { IconInput } from "@/components/shared/icon-input";
import type { roles as rolesTable } from "@/lib/db/schema";

interface Created {
  email: string;
  existing: boolean;
  password: string | null;
  emailSent: boolean;
  loginUrl: string;
  organizationName: string;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copiez :", value);
        }
      }}
    >
      {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      {copied ? "Copié" : "Copier"}
    </Button>
  );
}

/** Création d'un utilisateur par un administrateur : un mot de passe aléatoire est généré et affiché une seule fois. */
export function CreateMemberDialog({ roles }: { roles: (typeof rolesTable.$inferSelect)[] }) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [roleCode, setRoleCode] = useState(roles.find((r) => r.code === "WORKER")?.code ?? roles[0]?.code ?? "");
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/organizations/members/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, roleCode, title }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la création.");
        return;
      }
      setCreated(data as Created);
    } catch {
      setError("Erreur réseau — réessayez.");
    } finally {
      setPending(false);
    }
  }

  function close(next: boolean) {
    setOpen(next);
    if (!next && created) {
      // `MembersTable` tient sa propre copie locale des membres : un rechargement complet lui fait voir le nouveau membre.
      window.location.reload();
    }
  }

  const credentials = created?.password ? `Église : ${created.organizationName}\nIdentifiant : ${created.email}\nMot de passe temporaire : ${created.password}\nConnexion : ${created.loginUrl}` : "";

  return (
    <Dialog open={open} onOpenChange={close}>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Créer un utilisateur
      </Button>
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="size-4" />
                Utilisateur créé
              </DialogTitle>
              <DialogDescription>
                {created.existing
                  ? `${created.email} avait déjà un compte ChurchOS : il a été rattaché à ${created.organizationName} et se connecte avec son mot de passe habituel.`
                  : `Transmettez ces identifiants à l'utilisateur : il se connecte à ${created.organizationName} et devra choisir un nouveau mot de passe dès sa première connexion.`}
              </DialogDescription>
            </DialogHeader>
            {created.password && (
              <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Identifiant</p>
                  <p className="font-medium text-navy">{created.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Mot de passe temporaire</p>
                  <p className="select-all font-mono text-base font-semibold text-navy">{created.password}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CopyButton value={created.password} label="Copier le mot de passe" />
                  <CopyButton value={credentials} label="Copier tous les identifiants" />
                </div>
                <p className="text-xs text-amber-800">
                  Ce mot de passe n&apos;est affiché qu&apos;une seule fois et n&apos;est pas conservé : notez-le maintenant.
                  {created.emailSent ? " Il a aussi été envoyé par email à l'utilisateur." : " Aucun email n'a été envoyé (envoi non configuré ou échec) : transmettez-le vous-même."}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" onClick={() => close(false)}>
                Terminer
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="size-4" />
                Créer un utilisateur
              </DialogTitle>
              <DialogDescription>Un mot de passe aléatoire sera généré pour permettre à cet utilisateur de se connecter à votre église.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="create-first-name">Prénom *</Label>
                  <Input id="create-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="create-last-name">Nom *</Label>
                  <Input id="create-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-email">Email (identifiant de connexion) *</Label>
                <IconInput icon={Mail} id="create-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@exemple.com" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-role">Rôle *</Label>
                <FormSelect id="create-role" value={roleCode} onChange={(e) => setRoleCode(e.target.value)} required>
                  {roles.map((r) => (
                    <option key={r.id} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-title">Titre / fonction (optionnel)</Label>
                <Input id="create-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Responsable louange" />
              </div>
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Création..." : "Créer l'utilisateur"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
