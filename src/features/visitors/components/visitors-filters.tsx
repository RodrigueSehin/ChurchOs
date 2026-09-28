"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { IconInput } from "@/components/shared/icon-input";
import { FormSelect } from "@/components/shared/form-select";
import { VISITOR_STATUS_LABELS } from "@/features/visitors/schemas";

export function VisitorsFilters({
  initialSearch,
  initialStatus,
  initialSource,
  sources,
}: {
  initialSearch: string;
  initialStatus: string;
  initialSource: string;
  sources: string[];
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
        placeholder="Rechercher un visiteur..."
        className="lg:max-w-xs"
      />
      <FormSelect value={initialStatus} onChange={(e) => pushParams({ status: e.target.value })} className="lg:max-w-[180px]">
        <option value="">Statut : Tous</option>
        {Object.entries(VISITOR_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialSource} onChange={(e) => pushParams({ source: e.target.value })} className="lg:max-w-[180px]">
        <option value="">Source : Toutes</option>
        {sources.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </FormSelect>
    </div>
  );
}
