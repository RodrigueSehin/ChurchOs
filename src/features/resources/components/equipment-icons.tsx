import { createElement } from "react";
import { Armchair, Ellipsis, Mic, Monitor, Projector, Snowflake, Speaker, Table, Wrench, type LucideIcon } from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Sono: Speaker,
  Écrans: Monitor,
  Microphones: Mic,
  Climatisation: Snowflake,
  Projecteur: Projector,
  Chaises: Armchair,
  Tables: Table,
  Autres: Ellipsis,
};


/** Icône d'une catégorie d'équipement (composant, pour éviter de créer un composant pendant le rendu). */
export function CategoryIcon({ category, className }: { category: string | null | undefined; className?: string }) {
  return createElement((category && CATEGORY_ICONS[category]) || Wrench, { className });
}
