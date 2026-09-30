"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { BarChart3, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/shared/form-select";
import { useReportDownload } from "@/features/finance/components/use-report-download";
import { REPORT_FORMATS, REPORT_FORMAT_LABELS, REPORT_TYPES, REPORT_TYPE_LABELS, type ReportFormat, type ReportType } from "@/features/finance/reports/types";

interface Option {
  id: string;
  name: string;
}

/** Filtres du rapport (synchronisés dans l'URL, l'aperçu se recalcule côté serveur) + choix du
 * type et du format, et bouton « Générer le rapport » qui télécharge le fichier. */
export function ReportsToolbar({
  from,
  to,
  type,
  format,
  categoryId,
  fundId,
  categories,
  funds,
  canExport,
}: {
  from: string;
  to: string;
  type: ReportType;
  format: ReportFormat;
  categoryId: string;
  fundId: string;
  categories: Option[];
  funds: Option[];
  canExport: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { generate, pending, error } = useReportDownload();

  function pushParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <div className="flex flex-col gap-1.5">
          <Label>Période</Label>
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="Du" value={from} onChange={(e) => pushParams({ from: e.target.value })} />
            <span className="text-slate-400">–</span>
            <Input type="date" aria-label="Au" value={to} onChange={(e) => pushParams({ to: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rep-type">Type de rapport</Label>
          <FormSelect id="rep-type" value={type} onChange={(e) => pushParams({ type: e.target.value })}>
            {REPORT_TYPES.map((t) => (
              <option key={t} value={t}>
                {REPORT_TYPE_LABELS[t]}
              </option>
            ))}
          </FormSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rep-category">Catégorie</Label>
          <FormSelect id="rep-category" value={categoryId} onChange={(e) => pushParams({ category: e.target.value })}>
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FormSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rep-fund">Fonds / Projet</Label>
          <FormSelect id="rep-fund" value={fundId} onChange={(e) => pushParams({ fund: e.target.value })}>
            <option value="">Tous les fonds</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </FormSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rep-format">Format</Label>
          <FormSelect id="rep-format" value={format} onChange={(e) => pushParams({ format: e.target.value })}>
            {REPORT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {REPORT_FORMAT_LABELS[f]}
              </option>
            ))}
          </FormSelect>
        </div>
      </div>

      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          {canExport ? "Le fichier généré reprend la période et les filtres ci-dessus." : "L'export de rapports nécessite la permission « reports.export »."}
        </p>
        <Button type="button" disabled={!canExport || pending !== null} onClick={() => generate(type, format, { from, to, category: categoryId, fund: fundId })}>
          {pending ? <Download className="size-4 animate-pulse" /> : <BarChart3 className="size-4" />}
          {pending ? "Génération..." : "Générer le rapport"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
