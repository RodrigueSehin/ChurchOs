"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { getMemberTabCounts } from "@/features/members/queries";

type TabCounts = Awaited<ReturnType<typeof getMemberTabCounts>>;

const TABS: { value: string; label: string; countKey: keyof TabCounts }[] = [
  { value: "", label: "Tous les membres", countKey: "all" },
  { value: "new", label: "Nouveaux", countKey: "new" },
  { value: "transferred", label: "Transférés", countKey: "transferred" },
  { value: "inactive", label: "Inactifs", countKey: "inactive" },
];

export function MembersTabs({ activeStatus, counts }: { activeStatus: string; counts: TabCounts }) {
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
