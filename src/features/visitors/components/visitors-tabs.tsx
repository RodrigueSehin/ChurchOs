"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { getVisitorsTabCounts } from "@/features/visitors/queries";

type TabCounts = Awaited<ReturnType<typeof getVisitorsTabCounts>>;

const TABS: { value: string; label: string; countKey: keyof TabCounts }[] = [
  { value: "", label: "Tous les visiteurs", countKey: "all" },
  { value: "new", label: "Premières visites", countKey: "new" },
  { value: "contacted", label: "Visites répétées", countKey: "contacted" },
  { value: "follow_up", label: "En cours de suivi", countKey: "follow_up" },
  { value: "converted", label: "Convertis", countKey: "converted" },
];

export function VisitorsTabs({ activeStatus, counts }: { activeStatus: string; counts: TabCounts }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleSelect(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value);
    else params.delete("status");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const isActive = activeStatus === tab.value;
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
