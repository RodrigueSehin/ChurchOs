"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { IconInput } from "@/components/shared/icon-input";
import { FormSelect } from "@/components/shared/form-select";
import { GROUP_TYPE_LABELS, SERVICE_DAY_LABELS } from "@/features/groups/schemas";

export function GroupsFilters({
  initialSearch,
  initialType,
  initialIsActive,
  initialMeetingDay,
}: {
  initialSearch: string;
  initialType: string;
  initialIsActive: string;
  initialMeetingDay: string;
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
        placeholder="Rechercher un groupe..."
        className="lg:max-w-xs"
      />
      <FormSelect value={initialType} onChange={(e) => pushParams({ type: e.target.value })} className="lg:max-w-[170px]">
        <option value="">Type : Tous</option>
        {Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialIsActive} onChange={(e) => pushParams({ isActive: e.target.value })} className="lg:max-w-[150px]">
        <option value="">Statut : Tous</option>
        <option value="true">Actif</option>
        <option value="false">Inactif</option>
      </FormSelect>
      <FormSelect value={initialMeetingDay} onChange={(e) => pushParams({ meetingDay: e.target.value })} className="lg:max-w-[180px]">
        <option value="">Jour de rencontre : Tous</option>
        {Object.entries(SERVICE_DAY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormSelect>
    </div>
  );
}
