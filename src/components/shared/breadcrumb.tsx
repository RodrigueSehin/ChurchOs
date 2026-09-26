"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

import { findNavItemByHref } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Segments intermédiaires qui ne sont pas eux-mêmes une page de navigation (ex. `/settings`,
 * qui n'a pas de route propre — seules ses sous-pages comme `/settings/church` en ont une). */
const SEGMENT_LABELS: Record<string, string> = {
  settings: "Paramètres",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function labelForSegment(href: string, fallback: string): { label: string; isDynamic: boolean } {
  const navTitle = findNavItemByHref(href)?.title;
  if (navTitle) return { label: navTitle, isDynamic: false };
  if (UUID_RE.test(fallback)) return { label: "Détail", isDynamic: true };
  return { label: SEGMENT_LABELS[fallback] ?? fallback.replace(/-/g, " "), isDynamic: false };
}

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    return { href, ...labelForSegment(href, segment) };
  });

  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm text-slate-500">
      <Link href="/dashboard" className="flex items-center hover:text-navy">
        <Home className="size-3.5" />
        <span className="sr-only">Tableau de bord</span>
      </Link>
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 text-slate-300" />
            {isLast ? (
              <span className={cn("font-medium text-navy", !crumb.isDynamic && "capitalize")}>{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className={cn("hover:text-navy", !crumb.isDynamic && "capitalize")}>
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
