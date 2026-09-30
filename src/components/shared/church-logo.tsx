/* eslint-disable @next/next/no-img-element -- logo d'église hébergé sur Supabase Storage : domaine propre à chaque projet, donc non déclarable dans `images.remotePatterns` ; un <img> évite de lier l'affichage à cette config. */

import { cn } from "@/lib/utils";

/**
 * Logo d'une église, posé sur une pastille blanche : un logo sombre ou transparent reste lisible
 * sur le fond marine du menu latéral. À utiliser UNIQUEMENT à l'intérieur de l'application (menus,
 * barre du haut) — la Vitrine publique et les pages d'authentification gardent le logo ChurchOS.
 */
export function ChurchLogo({ url, name, className, imgClassName }: { url: string; name: string; className?: string; imgClassName?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-lg bg-white p-1.5", className)}>
      <img src={url} alt={`Logo ${name}`} className={cn("max-h-10 w-auto max-w-full object-contain", imgClassName)} />
    </span>
  );
}
