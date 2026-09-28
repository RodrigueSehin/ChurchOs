"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { IconInput } from "@/components/shared/icon-input";
import { FormSelect } from "@/components/shared/form-select";

const SIZE_LABELS: Record<string, string> = {
  small: "1-2 personnes",
  medium: "3-4 personnes",
  large: "5 personnes et plus",
};

interface FamiliesFiltersProps {
  initialSearch: string;
  initialCity: string;
  initialSize: string;
  initialMinistryId: string;
  cities: string[];
  ministries: { id: string; name: string }[];
}

export function FamiliesFilters({ initialSearch, initialCity, initialSize, initialMinistryId, cities, ministries }: FamiliesFiltersProps) {
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
        placeholder="Rechercher une famille..."
        className="lg:max-w-xs"
      />
      <FormSelect value={initialMinistryId} onChange={(e) => pushParams({ ministryId: e.target.value })} className="lg:max-w-[180px]">
        <option value="">Ministère : Tous</option>
        {ministries.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialCity} onChange={(e) => pushParams({ city: e.target.value })} className="lg:max-w-[180px]">
        <option value="">Zone / Quartier : Tous</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialSize} onChange={(e) => pushParams({ size: e.target.value })} className="lg:max-w-[180px]">
        <option value="">Taille : Toutes</option>
        {Object.entries(SIZE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormSelect>
    </div>
  );
}
