"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { IconInput } from "@/components/shared/icon-input";
import { FormSelect } from "@/components/shared/form-select";
import { GENDER_LABELS, MEMBER_STATUS_LABELS } from "@/features/members/schemas";

const AGE_GROUP_LABELS: Record<string, string> = {
  children: "Enfants (0-12)",
  youth: "Jeunes (13-25)",
  adult: "Adultes (26-59)",
  senior: "Seniors (60+)",
};

interface MembersFiltersProps {
  initialSearch: string;
  initialStatus: string;
  initialMinistryId: string;
  initialAgeGroup: string;
  initialGender: string;
  ministries: { id: string; name: string }[];
}

/** Recherche + filtres (statut/ministère/groupe d'âge/genre), synchronisés dans l'URL
 * (`?q=&status=&ministryId=&ageGroup=&gender=&page=`) — tous exécutés côté serveur à chaque
 * changement, jamais un filtrage client sur une page déjà chargée. */
export function MembersFilters({
  initialSearch,
  initialStatus,
  initialMinistryId,
  initialAgeGroup,
  initialGender,
  ministries,
}: MembersFiltersProps) {
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
    params.delete("page"); // toute modification de filtre repart de la page 1
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
        placeholder="Rechercher un membre..."
        className="lg:max-w-xs"
      />
      <FormSelect value={initialStatus} onChange={(e) => pushParams({ status: e.target.value })} className="lg:max-w-[160px]">
        <option value="">Statut : Tous</option>
        <option value="new">Nouveaux (ce mois-ci)</option>
        {Object.entries(MEMBER_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialMinistryId} onChange={(e) => pushParams({ ministryId: e.target.value })} className="lg:max-w-[180px]">
        <option value="">Ministère : Tous</option>
        {ministries.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialAgeGroup} onChange={(e) => pushParams({ ageGroup: e.target.value })} className="lg:max-w-[180px]">
        <option value="">Groupe d&apos;âge : Tous</option>
        {Object.entries(AGE_GROUP_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialGender} onChange={(e) => pushParams({ gender: e.target.value })} className="lg:max-w-[150px]">
        <option value="">Genre : Tous</option>
        {Object.entries(GENDER_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormSelect>
    </div>
  );
}
