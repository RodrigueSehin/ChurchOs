import type { LucideIcon } from "lucide-react";
import { Church } from "lucide-react";
import Image from "next/image";

import logo from "@/img/logo_churchos_dark.png";

export interface AuthHeroFeature {
  icon: LucideIcon;
  label: string;
}

export interface AuthHeroProps {
  headline: [string, string, string, string];
  quote: string;
  quoteRef: string;
  features: AuthHeroFeature[];
  tagline: string[];
}

/** Panneau gauche (décoratif) des écrans d'authentification / onboarding — plein écran sur
 * desktop, masqué sur mobile (le formulaire prend toute la largeur). Dégradé de marque +
 * silhouette de toit/croix reprenant le logo, sans dépendre d'une photo. */
export function AuthHero({ headline, quote, quoteRef, features, tagline }: AuthHeroProps) {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-navy via-navy to-blue lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:px-10 lg:py-10 xl:px-14">
      {/* Décor : lueur douce + silhouette de toit/croix (écho du logo), en filigrane */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/4 size-[520px] rounded-full bg-gold/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 opacity-[0.07]"
      >
        <svg viewBox="0 0 400 260" className="h-[300px] w-full" preserveAspectRatio="xMidYMax slice">
          <path d="M60 260 L200 80 L340 260 Z" fill="white" />
          <rect x="182" y="150" width="14" height="20" fill="#0B2A4A" />
          <rect x="150" y="220" width="18" height="40" fill="#0B2A4A" />
          <rect x="232" y="220" width="18" height="40" fill="#0B2A4A" />
          <rect x="193" y="30" width="14" height="60" fill="white" />
          <rect x="178" y="50" width="44" height="14" fill="white" />
        </svg>
      </div>

      <Church className="pointer-events-none absolute -bottom-16 -left-16 size-72 rotate-[-8deg] text-white/[0.04]" />

      <div className="relative">
        <Image src={logo} alt="ChurchOS" priority className="h-auto w-40" />
      </div>

      <div className="relative flex flex-col gap-8">
        <h1 className="text-4xl font-semibold leading-[1.15] text-white xl:text-[2.75rem]">
          {headline[0]}
          <br />
          {headline[1]}{" "}
          <span className="text-gold">
            {headline[2]}
            <br />
            {headline[3]}
          </span>
        </h1>

        <blockquote className="border-l-2 border-gold/50 pl-4">
          <p className="text-lg italic leading-snug text-white/85">&ldquo;{quote}&rdquo;</p>
          <cite className="mt-1.5 block text-sm not-italic text-gold/80">{quoteRef}</cite>
        </blockquote>

        <ul className="flex flex-col gap-3.5">
          {features.map((feature) => (
            <li key={feature.label} className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/10">
                <feature.icon className="size-4" />
              </span>
              <span className="text-sm text-white/85">{feature.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex items-center gap-3 border-t border-white/10 pt-5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">
        {tagline.map((word, i) => (
          <span key={word} className="flex items-center gap-3">
            {i > 0 && <span className="text-white/20">&middot;</span>}
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
