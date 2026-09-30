"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { IconInput } from "@/components/shared/icon-input";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "", label: "Toutes", key: "all" },
  { value: "pending", label: "En cours", key: "pending" },
  { value: "obtained", label: "Obtenues", key: "obtained" },
  { value: "expired", label: "Expirées", key: "expired" },
] as const;

/** Onglets de statut et recherche, synchronisés dans l'URL (`?status=&q=`). */
export function CertificationsToolbar({
  status,
  initialSearch,
  counts,
}: {
  status: string;
  initialSearch: string;
  counts: Record<(typeof TABS)[number]["key"], number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function push(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function onSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => push({ q: value }), 400);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => push({ status: tab.value })}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              status === tab.value ? "bg-navy text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>
      <IconInput icon={Search} value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Rechercher une certification..." className="lg:max-w-xs" />
    </div>
  );
}
