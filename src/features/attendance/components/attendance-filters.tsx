"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { IconInput } from "@/components/shared/icon-input";
import { FormSelect } from "@/components/shared/form-select";
import { ATTENDANCE_STATUS_LABELS } from "@/features/attendance/schemas";

export function AttendanceFilters({
  initialSearch,
  initialSessionId,
  initialPeriod,
  initialStatus,
  sessions,
}: {
  initialSearch: string;
  initialSessionId: string;
  initialPeriod: string;
  initialStatus: string;
  sessions: { id: string; title: string }[];
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
      <IconInput icon={Search} value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Rechercher un membre..." className="lg:max-w-xs" />
      <FormSelect value={initialSessionId} onChange={(e) => pushParams({ sessionId: e.target.value })} className="lg:max-w-[200px]">
        <option value="">Événement : Tous</option>
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialPeriod} onChange={(e) => pushParams({ period: e.target.value })} className="lg:max-w-[170px]">
        <option value="week">Cette semaine</option>
        <option value="today">Aujourd&apos;hui</option>
        <option value="month">Ce mois</option>
        <option value="all">Tout</option>
      </FormSelect>
      <FormSelect value={initialStatus} onChange={(e) => pushParams({ status: e.target.value })} className="lg:max-w-[160px]">
        <option value="">Statut : Tous</option>
        {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormSelect>
    </div>
  );
}
