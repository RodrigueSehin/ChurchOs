"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { FormSelect } from "@/components/shared/form-select";
import { IconInput } from "@/components/shared/icon-input";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "", label: "Tous les cours", key: "all" },
  { value: "inprogress", label: "En cours", key: "inprogress" },
  { value: "done", label: "Terminés", key: "done" },
  { value: "mine", label: "Mes cours", key: "mine" },
] as const;

/** Onglets, recherche et tri — tout est synchronisé dans l'URL (`?view=&q=&sort=`). */
export function CoursesToolbar({
  view,
  sort,
  initialSearch,
  counts,
}: {
  view: string;
  sort: string;
  initialSearch: string;
  counts: Record<(typeof TABS)[number]["key"], number>;
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => push({ view: tab.value })}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                view === tab.value ? "bg-navy text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {tab.label} ({counts[tab.key]})
            </button>
          ))}
        </div>
        <IconInput
          icon={Search}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Rechercher un cours..."
          className="lg:max-w-xs"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-navy">Cours disponibles</h2>
        <FormSelect aria-label="Trier" value={sort} onChange={(e) => push({ sort: e.target.value === "recent" ? "" : e.target.value })} className="h-9 w-40">
          <option value="recent">Plus récents</option>
          <option value="title">Ordre alphabétique</option>
        </FormSelect>
      </div>
    </div>
  );
}
