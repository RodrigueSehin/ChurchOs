"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";

import { login, type AuthActionState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconInput } from "@/components/shared/icon-input";
import { PasswordInput } from "@/features/auth/components/password-input";

const initialState: AuthActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Bienvenue&nbsp;! 👋</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connectez-vous à votre espace ChurchOS pour accéder à tous les outils de gestion de
          votre église.
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Entrez votre mot de passe"
            required
          />
        </div>

        <div className="flex justify-end">
          <Link href="/reset-password" className="text-sm text-primary hover:underline">
            Mot de passe oublié&nbsp;?
          </Link>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} size="lg" className="mt-1">
          {pending ? "Connexion..." : "Se connecter"}
          {!pending && <ArrowRight className="size-4" />}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Nouveau sur ChurchOS&nbsp;?{" "}
        <Link href="/onboarding/church" className="font-medium text-primary hover:underline">
          Créer une église
        </Link>
      </p>
    </div>
  );
}
