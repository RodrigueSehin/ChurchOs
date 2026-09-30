"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/features/auth/components/password-input";
import { PasswordChecklist } from "@/features/auth/components/password-checklist";
import { changePassword, type ProfileActionState } from "@/features/profile/actions";

const initialState: ProfileActionState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);
  const [password, setPassword] = useState("");
  const [prevState, setPrevState] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);

  // Ajuste l'état pendant le rendu (pattern React) plutôt que dans un effet.
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setPassword("");
  }

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentPassword">Mot de passe actuel</Label>
        <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" required />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <PasswordInput
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" required />
        </div>
      </div>

      <PasswordChecklist password={password} />

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-success">Mot de passe mis à jour.</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Mise à jour..." : "Changer le mot de passe"}
        </Button>
      </div>
    </form>
  );
}
