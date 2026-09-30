"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/platform", label: "Vue d'ensemble", exact: true },
  { href: "/platform/organizations", label: "Églises", exact: false },
  { href: "/platform/plans", label: "Plans", exact: false },
  { href: "/platform/audit", label: "Journal", exact: false },
];

export function PlatformNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-white/10 text-gold" : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
