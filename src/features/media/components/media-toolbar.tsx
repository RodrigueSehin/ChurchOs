"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { IconInput } from "@/components/shared/icon-input";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "", label: "Tous", key: "all" },
  { value: "photo", label: "Photos", key: "photo" },
  { value: "video", label: "Vidéos", key: "video" },
  { value: "audio", label: "Audios", key: "audio" },
  { value: "document", label: "Documents", key: "document" },
] as const;

/** Onglets (type) et recherche, synchronisés dans l'URL (`?type=&q=`). */
export function MediaToolbar({ type, initialSearch, counts }: { type: string; initialSearch: string; counts: Record<(typeof TABS)[number]["key"], number> }) {
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
    <>
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => push({ type: tab.value })}
            className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors", type === tab.value ? "bg-navy text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}
          >
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>
      <IconInput icon={Search} value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Rechercher un média..." className="sm:max-w-[220px]" />
    </>
  );
}
