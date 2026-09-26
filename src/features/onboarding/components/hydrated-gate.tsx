"use client";

import { useOnboardingStore } from "@/features/onboarding/store";

/**
 * Le brouillon d'onboarding vit en `sessionStorage`, illisible avant le montage client — au
 * tout premier rendu, le store contient encore ses valeurs par défaut (vides), pas le
 * brouillon réel. Un composant enfant qui fait `useState(store.champ)` pour initialiser un
 * champ figerait alors sur cette valeur vide (les arguments initiaux de `useState` ne sont
 * utilisés qu'au montage). En ne montant `children` qu'une fois `_hasHydrated` vrai, ce garde
 * retarde ce montage jusqu'à ce que les vraies valeurs soient disponibles.
 */
export function OnboardingHydratedGate({ children }: { children: React.ReactNode }) {
  const hydrated = useOnboardingStore((s) => s._hasHydrated);
  if (!hydrated) return null;
  return <>{children}</>;
}
