"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function DonationsTabs({
  activeCategoryId,
  categories,
  counts,
  allLabel = "Tous",
}: {
  activeCategoryId: string;
  categories: { id: string; name: string }[];
  counts: { all: number; byCategory: Record<string, number> };
  allLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleSelect(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("category", value);
    else params.delete("category");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const tabs = [{ id: "", name: allLabel, count: counts.all }, ...categories.map((c) => ({ id: c.id, name: c.name, count: counts.byCategory[c.id] ?? 0 }))];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id || "all"}
          type="button"
          onClick={() => handleSelect(tab.id)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeCategoryId === tab.id ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          )}
        >
          {tab.name} ({tab.count})
        </button>
      ))}
    </div>
  );
}
