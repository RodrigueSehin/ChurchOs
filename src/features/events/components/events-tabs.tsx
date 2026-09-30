"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { getEventsTabCounts } from "@/features/events/queries";

type TabCounts = Awaited<ReturnType<typeof getEventsTabCounts>>;

const TABS: { value: string; label: string; countKey: keyof TabCounts }[] = [
  { value: "", label: "Tous les événements", countKey: "all" },
  { value: "upcoming", label: "À venir", countKey: "upcoming" },
  { value: "past", label: "Passés", countKey: "past" },
  { value: "mine", label: "Mes événements", countKey: "mine" },
];

export function EventsTabs({ activeView, counts }: { activeView: string; counts: TabCounts }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleSelect(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("view", value);
    else params.delete("view");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const isActive = activeView === tab.value;
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
            {tab.label} ({counts[tab.countKey]})
          </button>
        );
      })}
    </div>
  );
}
