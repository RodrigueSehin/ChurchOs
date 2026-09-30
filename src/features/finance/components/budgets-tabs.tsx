"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { value: "", label: "Tous", key: "all" },
  { value: "active", label: "Actifs", key: "active" },
  { value: "draft", label: "Brouillons", key: "draft" },
  { value: "closed", label: "Clôturés", key: "closed" },
] as const;

export function BudgetsTabs({ activeStatus, counts }: { activeStatus: string; counts: Record<"all" | "active" | "draft" | "closed", number> }) {
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
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => handleSelect(tab.value)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeStatus === tab.value ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          )}
        >
          {tab.label} ({counts[tab.key]})
        </button>
      ))}
    </div>
  );
}
