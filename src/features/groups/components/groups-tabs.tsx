"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { GROUP_TYPE_LABELS } from "@/features/groups/schemas";

const TAB_TYPES = ["cell", "team", "youth", "women", "men", "children"] as const;

export function GroupsTabs({ activeType, counts }: { activeType: string; counts: Record<string, number> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleSelect(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("type", value);
    else params.delete("type");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const tabs = [{ value: "", label: "Tous les groupes", count: counts.all ?? 0 }, ...TAB_TYPES.map((t) => ({ value: t, label: GROUP_TYPE_LABELS[t], count: counts[t] ?? 0 }))];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = activeType === tab.value;
        return (
          <button
            key={tab.value || "all"}
            type="button"
            onClick={() => handleSelect(tab.value)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {tab.label} ({tab.count})
          </button>
        );
      })}
    </div>
  );
}
