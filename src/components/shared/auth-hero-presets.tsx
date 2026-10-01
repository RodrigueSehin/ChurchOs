import { BarChart3, HeartHandshake, ShieldCheck, Users } from "lucide-react";

import type { AuthHeroProps } from "@/components/shared/auth-hero";
import { getDailyVerse } from "@/lib/verses";

const TAGLINE = ["ÉGLISE", "COMMUNAUTÉ", "MISSION", "IMPACT"];

/** Contenu du panneau gauche pour login / mot de passe oublié. */
/** Fonctions (pas des constantes de module) : le verset du jour est recalculé à chaque requête. */
export function getLoginHero(): AuthHeroProps {
  const verse = getDailyVerse("auth");
  return {
    headline: ["Ensemble pour des", "Églises", "plus fortes", "demain."],
    quote: verse.text,
    quoteRef: verse.ref,
    tagline: TAGLINE,
    features: [
      { icon: Users, label: "Une communauté plus forte" },
      { icon: BarChart3, label: "Une Église plus efficace" },
      { icon: HeartHandshake, label: "Un plus grand impact" },
    ],
  };
}

/** Contenu du panneau gauche pour l'assistant de création d'église (onboarding 5 étapes). */
export function getOnboardingHero(): AuthHeroProps {
  const verse = getDailyVerse("onboarding");
  return {
    headline: ["Bâtir aujourd'hui", "une Église", "plus forte", "demain."],
    quote: verse.text,
    quoteRef: verse.ref,
    tagline: TAGLINE,
    features: [
      { icon: Users, label: "Gérez vos membres" },
      { icon: ShieldCheck, label: "Des données sécurisées" },
      { icon: BarChart3, label: "Suivez votre croissance" },
    ],
  };
}
