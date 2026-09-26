"use client";

import { usePathname } from "next/navigation";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { href: "/onboarding/church", label: "Informations de l'église" },
  { href: "/onboarding/admin", label: "Administrateur" },
  { href: "/onboarding/configuration", label: "Configuration" },
  { href: "/onboarding/subscription", label: "Abonnement" },
  { href: "/onboarding/finalization", label: "Finalisation" },
];

export function OnboardingSteps() {
  const pathname = usePathname();
  // Au-delà de la dernière étape (page de bienvenue), tout est "done".
  const currentIndex = pathname.startsWith("/onboarding/welcome")
    ? STEPS.length
    : STEPS.findIndex((s) => pathname.startsWith(s.href));

  return (
    <ol className="flex items-start">
      {STEPS.map((step, index) => {
        const state =
          index === currentIndex ? "current" : index < currentIndex ? "done" : "upcoming";
        return (
          <li key={step.href} className="flex flex-1 flex-col items-center last:flex-none">
            <div className="flex w-full items-center">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  state === "current" && "bg-navy text-white",
                  state === "done" && "bg-navy text-white",
                  state === "upcoming" && "bg-slate-100 text-slate-400",
                )}
              >
                {state === "done" ? <Check className="size-4" /> : index + 1}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn("h-px flex-1", state === "done" ? "bg-navy" : "bg-slate-200")}
                />
              )}
            </div>
            <span
              className={cn(
                "mt-2 hidden text-center text-xs sm:block",
                state === "upcoming" ? "text-slate-400" : "font-medium text-navy",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
