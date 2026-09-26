import Link from "next/link";
import { Church } from "lucide-react";

import { AuthHero, type AuthHeroProps } from "@/components/shared/auth-hero";
import { LanguageBadge } from "@/components/shared/language-badge";
import { cn } from "@/lib/utils";

export interface AuthPageShellProps {
  hero: AuthHeroProps;
  children: React.ReactNode;
  /** Largeur de la colonne de contenu — plus large pour l'assistant d'onboarding que pour login. */
  contentClassName?: string;
}

/** Coquille commune deux colonnes des écrans publics (login, mot de passe oublié, onboarding).
 * Colonne gauche décorative (masquée en mobile), colonne droite avec badge de langue,
 * contenu centré, pied de page. */
export function AuthPageShell({ hero, children, contentClassName }: AuthPageShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface lg:flex-row">
      <AuthHero {...hero} />

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-4 pt-5 sm:px-6 lg:justify-end lg:px-10 lg:pt-6">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span className="flex size-8 items-center justify-center rounded-lg bg-navy text-white">
              <Church className="size-4" />
            </span>
            <span className="text-base font-semibold text-navy">ChurchOS</span>
          </Link>
          <LanguageBadge />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className={cn("w-full max-w-md", contentClassName)}>{children}</div>
        </div>

        <footer className="px-4 pb-5 text-center text-xs text-slate-400 sm:px-6 lg:px-10 lg:pb-6 lg:text-right">
          © {new Date().getFullYear()} ChurchOS. Tous droits réservés.
        </footer>
      </div>
    </div>
  );
}
