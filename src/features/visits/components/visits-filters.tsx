"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { IconInput } from "@/components/shared/icon-input";
import { FormSelect } from "@/components/shared/form-select";
import { VISIT_STATUS_LABELS, VISIT_TYPE_LABELS } from "@/features/visits/schemas";

export function VisitsFilters({
  initialSearch,
  initialVisitType,
  initialStatus,
  initialAssignedToUserId,
  assignableUsers,
}: {
  initialSearch: string;
  initialVisitType: string;
  initialStatus: string;
  initialAssignedToUserId: string;
  assignableUsers: { id: string; name: string }[];
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
        placeholder="Rechercher une visite..."
        className="lg:max-w-xs"
      />
      <FormSelect value={initialVisitType} onChange={(e) => pushParams({ visitType: e.target.value })} className="lg:max-w-[190px]">
        <option value="">Type de visite : Tous</option>
        {Object.entries(VISIT_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialStatus} onChange={(e) => pushParams({ status: e.target.value })} className="lg:max-w-[160px]">
        <option value="">Statut : Tous</option>
        {Object.entries(VISIT_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialAssignedToUserId} onChange={(e) => pushParams({ assignedToUserId: e.target.value })} className="lg:max-w-[190px]">
        <option value="">Responsable : Tous</option>
        {assignableUsers.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </FormSelect>
    </div>
  );
}
