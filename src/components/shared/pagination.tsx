import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** Construit l'URL d'une page donnée (le composant appelant possède les autres query params
   * — recherche, filtres — à préserver). */
  hrefForPage: (page: number) => string;
}

/** Pagination serveur : chaque page est un lien réel (`?page=N`), pas un état client qui perd
 * le résultat au rechargement. */
export function Pagination({ page, pageSize, total, hrefForPage }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
      <p className="text-slate-500">
        {from}–{to} sur {total}
      </p>
      <div className="flex items-center gap-1">
        <PageLink href={hrefForPage(page - 1)} disabled={page <= 1} aria-label="Page précédente">
          <ChevronLeft className="size-4" />
        </PageLink>
        <span className="px-2 text-slate-600">
          Page {page} / {pageCount}
        </span>
        <PageLink href={hrefForPage(page + 1)} disabled={page >= pageCount} aria-label="Page suivante">
          <ChevronRight className="size-4" />
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
  ...props
}: { href: string; disabled: boolean; children: React.ReactNode } & React.HTMLAttributes<HTMLAnchorElement>) {
  if (disabled) {
    return (
      <span className="flex size-8 items-center justify-center rounded-md text-slate-300" aria-disabled>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      className={cn("flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100")}
      {...props}
    >
      {children}
    </Link>
  );
}
