"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { PERIOD_OPTIONS, type PeriodKey } from "@/features/analytics/period";

/** Sélecteur de période : la valeur vit dans l'URL (`?period=`), la page serveur recalcule. */
export function PeriodSelect({ value, label }: { value: PeriodKey; label: string }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy shadow-sm">
      <CalendarDays className="size-4 text-primary" aria-hidden />
      <span className="sr-only">Période</span>
      <select
        value={value}
        aria-label="Période"
        title={label}
        className="cursor-pointer bg-transparent pr-1 text-sm outline-none"
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set("period", e.target.value);
          router.push(`/analytics?${next.toString()}`);
        }}
      >
        {PERIOD_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
