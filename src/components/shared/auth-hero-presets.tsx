import { BarChart3, HeartHandshake, ShieldCheck, Users } from "lucide-react";

import type { AuthHeroProps } from "@/components/shared/auth-hero";

const TAGLINE = ["ÉGLISE", "COMMUNAUTÉ", "MISSION", "IMPACT"];

/** Contenu du panneau gauche pour login / mot de passe oublié. */
export const LOGIN_HERO: AuthHeroProps = {
  headline: ["Ensemble pour des", "Églises", "plus fortes", "demain."],
  quote: "Car celui qui a fait la promesse est fidèle.",
  quoteRef: "Hébreux 10:23",
  tagline: TAGLINE,
  features: [
    { icon: Users, label: "Une communauté plus forte" },
    { icon: BarChart3, label: "Une Église plus efficace" },
    { icon: HeartHandshake, label: "Un plus grand impact" },
  ],
};

/** Contenu du panneau gauche pour l'assistant de création d'église (onboarding 5 étapes). */
export const ONBOARDING_HERO: AuthHeroProps = {
  headline: ["Bâtir aujourd'hui", "une Église", "plus forte", "demain."],
  quote: "Tout est possible à celui qui croit.",
  quoteRef: "Marc 9:23",
  tagline: TAGLINE,
  features: [
    { icon: Users, label: "Gérez vos membres" },
    { icon: ShieldCheck, label: "Des données sécurisées" },
    { icon: BarChart3, label: "Suivez votre croissance" },
  ],
};
