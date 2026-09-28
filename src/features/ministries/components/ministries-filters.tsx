"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { IconInput } from "@/components/shared/icon-input";
import { FormSelect } from "@/components/shared/form-select";

export function MinistriesFilters({
  initialSearch,
  initialCategory,
  initialLeaderPersonId,
  categories,
  leaders,
}: {
  initialSearch: string;
  initialCategory: string;
  initialLeaderPersonId: string;
  categories: string[];
  leaders: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushParams({ q: value }), 400);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <IconInput
        icon={Search}
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Rechercher un ministère..."
        className="lg:max-w-xs"
      />
      <FormSelect value={initialCategory} onChange={(e) => pushParams({ category: e.target.value })} className="lg:max-w-[170px]">
        <option value="">Catégorie : Toutes</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialLeaderPersonId} onChange={(e) => pushParams({ leaderPersonId: e.target.value })} className="lg:max-w-[200px]">
        <option value="">Responsable : Tous</option>
        {leaders.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </FormSelect>
    </div>
  );
}
