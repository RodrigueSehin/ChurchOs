"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEFAULT_MODULES } from "@/features/onboarding/constants";

export interface OnboardingDraft {
  // Étape 1 — Informations de l'église
  churchName: string;
  slug: string;
  denomination: string;
  countryCode: string;
  city: string;
  address: string;
  churchPhone: string;
  churchEmail: string;
  website: string;

  // Étape 2 — Administrateur (le mot de passe n'est JAMAIS stocké ici : il part directement
  // au serveur au submit, voir `features/onboarding/actions/create-admin.ts`). La preuve que
  // le compte existe est la session Supabase elle-même (vérifiée côté serveur par
  // `requireUser()` dans les pages des étapes 3 à 5), pas un flag client.
  adminFirstName: string;
  adminLastName: string;
  adminPhone: string;
  adminEmail: string;
  adminRole: string;

  // Étape 3 — Configuration
  campusCount: number;
  campusName: string;
  churchType: string;
  timezone: string;
  serviceDay: string;
  serviceTime: string;
  dateFormat: string;
  currency: string;
  modules: string[];

  // Étape 4 — Abonnement
  planCode: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  billingInterval: "monthly" | "yearly";
}

interface OnboardingState extends OnboardingDraft {
  /** `sessionStorage` ne peut être lu qu'après le montage client — avant ça, ce store contient
   * ses valeurs par défaut (vides), pas encore le brouillon réel. Les pages qui redirigent en
   * l'absence de brouillon doivent attendre `true` ici avant de conclure qu'il est vide, sinon
   * elles renvoient à tort vers `/onboarding/church` le temps d'un rendu. */
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setChurch: (
    v: Pick<
      OnboardingDraft,
      | "churchName"
      | "slug"
      | "denomination"
      | "countryCode"
      | "city"
      | "address"
      | "churchPhone"
      | "churchEmail"
      | "website"
      | "timezone"
    >,
  ) => void;
  setAdmin: (
    v: Pick<
      OnboardingDraft,
      "adminFirstName" | "adminLastName" | "adminPhone" | "adminEmail" | "adminRole"
    >,
  ) => void;
  setConfiguration: (
    v: Pick<
      OnboardingDraft,
      | "campusCount"
      | "campusName"
      | "churchType"
      | "timezone"
      | "serviceDay"
      | "serviceTime"
      | "dateFormat"
      | "currency"
      | "modules"
    >,
  ) => void;
  setSubscription: (v: Pick<OnboardingDraft, "planCode" | "billingInterval">) => void;
  reset: () => void;
}

const defaults: OnboardingDraft = {
  churchName: "",
  slug: "",
  denomination: "",
  countryCode: "CI",
  city: "",
  address: "",
  churchPhone: "",
  churchEmail: "",
  website: "",

  adminFirstName: "",
  adminLastName: "",
  adminPhone: "",
  adminEmail: "",
  adminRole: "senior_pastor",

  campusCount: 1,
  campusName: "Église Centrale",
  churchType: "local",
  timezone: "Africa/Abidjan",
  serviceDay: "sunday",
  serviceTime: "08:30",
  dateFormat: "dd/MM/yyyy",
  currency: "XOF",
  modules: DEFAULT_MODULES,

  planCode: "FREE",
  billingInterval: "monthly",
};

/** Brouillon de l'assistant d'onboarding — commodité de navigation entre étapes (jamais la
 * source de vérité : la création réelle se fait côté serveur, en plusieurs temps : le compte
 * à l'étape 2, l'organisation et le reste à la finalisation via `finalizeOnboarding`). */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...defaults,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setChurch: (v) => set(v),
      setAdmin: (v) => set(v),
      setConfiguration: (v) => set(v),
      setSubscription: (v) => set(v),
      reset: () => set(defaults),
    }),
    {
      name: "churchos-onboarding",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _hasHydrated, setHasHydrated, ...draft } = state;
        return draft;
      },
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
