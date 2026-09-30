"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { IconInput } from "@/components/shared/icon-input";
import { FormSelect } from "@/components/shared/form-select";
import { EVENT_STATUS_LABELS } from "@/features/events/schemas";

export function EventsFilters({
  initialSearch,
  initialCategoryId,
  initialStatus,
  initialLocation,
  categories,
  locations,
}: {
  initialSearch: string;
  initialCategoryId: string;
  initialStatus: string;
  initialLocation: string;
  categories: { id: string; name: string }[];
  locations: string[];
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
        placeholder="Rechercher un événement..."
        className="lg:max-w-xs"
      />
      <FormSelect value={initialCategoryId} onChange={(e) => pushParams({ categoryId: e.target.value })} className="lg:max-w-[180px]">
        <option value="">Type : Tous</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialStatus} onChange={(e) => pushParams({ status: e.target.value })} className="lg:max-w-[160px]">
        <option value="">Statut : Tous</option>
        {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialLocation} onChange={(e) => pushParams({ location: e.target.value })} className="lg:max-w-[180px]">
        <option value="">Lieu : Tous</option>
        {locations.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </FormSelect>
    </div>
  );
}
