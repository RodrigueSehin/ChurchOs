"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";

import { requestPasswordReset, type AuthActionState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconInput } from "@/components/shared/icon-input";

const initialState: AuthActionState & { success?: boolean } = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
          <MailCheck className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-navy">Vérifiez vos emails</h1>
          <p className="mt-1 text-sm text-slate-500">
            Si un compte existe avec cette adresse, un lien de réinitialisation vient d&apos;être
            envoyé.
          </p>
        </div>
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Mot de passe oublié</h1>
        <p className="mt-1 text-sm text-slate-500">
          Entrez votre email, nous vous enverrons un lien pour le réinitialiser.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <IconInput
            icon={Mail}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Entrez votre adresse email"
            required
          />
        </div>
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} size="lg" className="mt-1">
          {pending ? "Envoi..." : "Envoyer le lien"}
        </Button>
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-3.5" />
        Retour à la connexion
      </Link>
    </div>
  );
}
