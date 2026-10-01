"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bookmark, Search } from "lucide-react";

import { FormSelect } from "@/components/shared/form-select";
import { IconInput } from "@/components/shared/icon-input";
import { RESOURCE_FORMAT_LABELS, RESOURCE_TYPE_TABS } from "@/features/library/schemas";
import { cn } from "@/lib/utils";

/** Onglets par type, recherche, filtres (catégorie, format), tri et favoris — synchronisés dans l'URL. */
export function LibraryToolbar({
  type,
  categoryId,
  format,
  sort,
  bookmarked,
  initialSearch,
  categories,
}: {
  type: string;
  categoryId: string;
  format: string;
  sort: string;
  bookmarked: boolean;
  initialSearch: string;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function push(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function onSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => push({ q: value }), 400);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const tabs: [string, string][] = [["", "Toutes les ressources"], ...Object.entries(RESOURCE_TYPE_TABS)];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map(([value, label]) => (
          <button
            key={value || "all"}
            type="button"
            onClick={() => push({ type: value })}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              type === value ? "bg-navy text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
        <IconInput icon={Search} value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Rechercher une ressource..." />
        <FormSelect aria-label="Catégorie" value={categoryId} onChange={(e) => push({ categoryId: e.target.value })}>
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </FormSelect>
        <FormSelect aria-label="Format" value={format} onChange={(e) => push({ format: e.target.value })}>
          <option value="">Tous les types</option>
          {Object.entries(RESOURCE_FORMAT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </FormSelect>
        <FormSelect aria-label="Trier" value={sort} onChange={(e) => push({ sort: e.target.value === "recent" ? "" : e.target.value })}>
          <option value="recent">Date récente</option>
          <option value="downloads">Plus téléchargées</option>
          <option value="views">Plus consultées</option>
          <option value="title">Ordre alphabétique</option>
        </FormSelect>
        <button
          type="button"
          onClick={() => push({ saved: bookmarked ? "" : "1" })}
          aria-pressed={bookmarked}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium",
            bookmarked ? "border-primary bg-primary/5 text-primary" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          )}
        >
          <Bookmark className={cn("size-4", bookmarked && "fill-current")} />
          Mes favoris
        </button>
      </div>
    </div>
  );
}
