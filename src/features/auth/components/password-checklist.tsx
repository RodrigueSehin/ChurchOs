"use client";

import { Check, ShieldCheck, X } from "lucide-react";

import { cn } from "@/lib/utils";

export const PASSWORD_RULES = [
  { key: "length", label: "Au moins 8 caractères", test: (v: string) => v.length >= 8 },
  { key: "upper", label: "Une lettre majuscule", test: (v: string) => /[A-Z]/.test(v) },
  { key: "lower", label: "Une lettre minuscule", test: (v: string) => /[a-z]/.test(v) },
  { key: "digit", label: "Un chiffre", test: (v: string) => /[0-9]/.test(v) },
  {
    key: "special",
    label: "Un caractère spécial (ex : ! @ # $ %)",
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
] as const;

export function isPasswordValid(password: string) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

/** Checklist en temps réel des règles de mot de passe, + bandeau de confirmation quand tout
 * est respecté. Purement une aide visuelle côté client ; la validation faisant foi reste
 * `updatePasswordSchema`/`isPasswordValid` côté serveur. */
export function PasswordChecklist({ password }: { password: string }) {
  const allValid = password.length > 0 && isPasswordValid(password);

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li
              key={rule.key}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors",
                ok ? "text-success" : "text-slate-400",
              )}
            >
              {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              {rule.label}
            </li>
          );
        })}
      </ul>
      {allValid && (
        <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-xs font-medium text-success">
          <ShieldCheck className="size-4" />
          Mot de passe sécurisé — il respecte toutes les exigences de sécurité.
        </div>
      )}
    </div>
  );
}
