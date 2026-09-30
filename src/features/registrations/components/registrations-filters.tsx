"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { IconInput } from "@/components/shared/icon-input";
import { FormSelect } from "@/components/shared/form-select";
import { REGISTRATION_STATUS_LABELS } from "@/features/registrations/schemas";

export function RegistrationsFilters({
  initialSearch,
  initialEventId,
  initialStatus,
  initialParticipantType,
  events,
}: {
  initialSearch: string;
  initialEventId: string;
  initialStatus: string;
  initialParticipantType: string;
  events: { id: string; title: string }[];
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
      <IconInput icon={Search} value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Rechercher un inscrit..." className="lg:max-w-xs" />
      <FormSelect value={initialEventId} onChange={(e) => pushParams({ eventId: e.target.value })} className="lg:max-w-[200px]">
        <option value="">Événement : Tous</option>
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.title}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialStatus} onChange={(e) => pushParams({ status: e.target.value })} className="lg:max-w-[170px]">
        <option value="">Statut : Tous</option>
        {Object.entries(REGISTRATION_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialParticipantType} onChange={(e) => pushParams({ participantType: e.target.value })} className="lg:max-w-[170px]">
        <option value="">Type : Tous</option>
        <option value="member">Membre</option>
        <option value="guest">Visiteur</option>
      </FormSelect>
    </div>
  );
}
