"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { IconInput } from "@/components/shared/icon-input";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "rooms", label: "Salles" },
  { value: "equipment", label: "Équipements" },
  { value: "reservations", label: "Réservations" },
  { value: "calendar", label: "Calendrier" },
] as const;

/** Onglets (liens `?tab=`) et recherche synchronisée dans l'URL (`?q=`), sauf sur le calendrier. */
export function ResourcesToolbar({
  tab,
  initialSearch,
  actions,
}: {
  tab: string;
  initialSearch: string;
  actions?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("q", value);
      else params.delete("q");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, 400);
  }

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value === "rooms" ? "/resources" : `/resources?tab=${t.value}`}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t.value
                ? "bg-navy text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {tab !== "calendar" && (
          <IconInput
            icon={Search}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={
              tab === "equipment"
                ? "Rechercher un équipement..."
                : tab === "reservations"
                  ? "Rechercher une réservation..."
                  : "Rechercher une salle..."
            }
            className="sm:w-64"
          />
        )}
        {actions}
      </div>
    </div>
  );
}
