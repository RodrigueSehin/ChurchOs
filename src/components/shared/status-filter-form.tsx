"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { FormSelect } from "@/components/shared/form-select";

/** Filtre à valeur unique (statut, type...) synchronisé dans l'URL — voir `SearchBox` pour son
 * équivalent texte. Le nom du paramètre est toujours `status` ; pour un autre champ (ex. `type`
 * pour les groupes), passer `paramName`. */
export function StatusFilterForm({
  initialStatus,
  options,
  allLabel,
  paramName = "status",
}: {
  initialStatus: string;
  options: { value: string; label: string }[];
  allLabel: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(paramName, value);
    else params.delete(paramName);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <FormSelect value={initialStatus} onChange={(e) => handleChange(e.target.value)} className="sm:max-w-[200px]">
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </FormSelect>
  );
}
