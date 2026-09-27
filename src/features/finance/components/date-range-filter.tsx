"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateRangeFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-from">Du</Label>
        <Input id="report-from" type="date" value={from} onChange={(e) => handleChange("from", e.target.value)} className="max-w-[180px]" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-to">Au</Label>
        <Input id="report-to" type="date" value={to} onChange={(e) => handleChange("to", e.target.value)} className="max-w-[180px]" />
      </div>
    </div>
  );
}
