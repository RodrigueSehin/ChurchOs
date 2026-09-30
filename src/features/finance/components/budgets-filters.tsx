"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { IconInput } from "@/components/shared/icon-input";
import { FormSelect } from "@/components/shared/form-select";

export function BudgetsFilters({ initialSearch, year, years }: { initialSearch: string; year: number; years: number[] }) {
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

  const options = Array.from(new Set([year, ...years])).sort((a, b) => b - a);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <FormSelect value={String(year)} onChange={(e) => pushParams({ year: e.target.value })} className="lg:max-w-[170px]" aria-label="Exercice">
        {options.map((y) => (
          <option key={y} value={y}>
            Exercice {y}
          </option>
        ))}
      </FormSelect>
      <IconInput icon={Search} value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Rechercher un budget..." className="lg:max-w-xs" />
    </div>
  );
}
