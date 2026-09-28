"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navSections } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavListProps {
  /** Masque les libellés texte (utilisé pour le rail icône du breakpoint tablette). */
  iconOnly?: boolean;
  onNavigate?: () => void;
}

export function NavList({ iconOnly = false, onNavigate }: NavListProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5 px-3 py-4">
      {navSections.map((section, sectionIndex) => (
        <div key={section.label ?? `section-${sectionIndex}`} className="flex flex-col gap-1">
          {section.label && !iconOnly && (
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-white/40">
              {section.label}
            </p>
          )}
          {section.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const link = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2 text-sm font-medium transition-colors",
                  iconOnly && "justify-center px-2",
                  isActive
                    ? "border-gold bg-white/10 text-gold"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {!iconOnly && <span className="truncate">{item.title}</span>}
              </Link>
            );

            if (!iconOnly) return link;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
