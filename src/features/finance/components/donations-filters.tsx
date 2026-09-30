"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { IconInput } from "@/components/shared/icon-input";
import { FormSelect } from "@/components/shared/form-select";
import { Input } from "@/components/ui/input";
import { PAYMENT_METHOD_LABELS } from "@/features/finance/schemas";

export function DonationsFilters({
  initialSearch,
  initialFrom,
  initialTo,
  initialMethod,
  initialFundId,
  funds,
  searchPlaceholder = "Rechercher un donateur, une référence...",
}: {
  initialSearch: string;
  initialFrom: string;
  initialTo: string;
  initialMethod: string;
  initialFundId: string;
  funds: { id: string; name: string }[];
  searchPlaceholder?: string;
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
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="flex items-center gap-2">
        <Input type="date" aria-label="Du" value={initialFrom} onChange={(e) => pushParams({ from: e.target.value })} className="w-[150px]" />
        <span className="text-slate-400">–</span>
        <Input type="date" aria-label="Au" value={initialTo} onChange={(e) => pushParams({ to: e.target.value })} className="w-[150px]" />
      </div>
      <IconInput icon={Search} value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder={searchPlaceholder} className="lg:max-w-xs" />
      <FormSelect value={initialMethod} onChange={(e) => pushParams({ method: e.target.value })} className="lg:max-w-[180px]">
        <option value="">Méthode : Toutes</option>
        {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormSelect>
      <FormSelect value={initialFundId} onChange={(e) => pushParams({ fund: e.target.value })} className="lg:max-w-[180px]">
        <option value="">Affectation : Toutes</option>
        {funds.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </FormSelect>
    </div>
  );
}
