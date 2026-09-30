"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { ReportFormat, ReportType } from "@/features/finance/reports/types";

/** Télécharge un rapport généré par `/api/finance/report`. `fetch` (et non un lien direct) pour
 * pouvoir afficher l'erreur JSON renvoyée en cas de refus ou d'échec, puis rafraîchir la liste
 * « Rapports récents » une fois la génération journalisée. */
export function useReportDownload() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(type: ReportType, format: ReportFormat, filters: { from: string; to: string; category: string; fund: string }) {
    setPending(type);
    setError(null);
    try {
      const qs = new URLSearchParams({ type, format, from: filters.from, to: filters.to });
      if (filters.category) qs.set("category", filters.category);
      if (filters.fund) qs.set("fund", filters.fund);
      const res = await fetch(`/api/finance/report?${qs.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Échec de la génération du rapport.");
      }
      const filename = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `rapport-financier.${format}`;
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la génération du rapport.");
    } finally {
      setPending(null);
    }
  }

  return { generate, pending, error };
}
