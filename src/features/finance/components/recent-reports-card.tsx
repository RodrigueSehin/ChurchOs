import { FileJson, FileSpreadsheet, FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getRecentReportRuns } from "@/features/finance/reports/queries";

type Run = Awaited<ReturnType<typeof getRecentReportRuns>>[number];

const FORMATS: Record<string, { label: string; icon: React.ElementType; badge: string; tile: string }> = {
  pdf: { label: "PDF", icon: FileText, badge: "bg-red-50 text-red-600", tile: "bg-red-50 text-red-500" },
  xlsx: { label: "Excel", icon: FileSpreadsheet, badge: "bg-green-50 text-green-700", tile: "bg-green-50 text-green-600" },
  json: { label: "JSON", icon: FileJson, badge: "bg-amber-50 text-amber-700", tile: "bg-amber-50 text-amber-600" },
  csv: { label: "CSV", icon: FileText, badge: "bg-slate-100 text-slate-600", tile: "bg-slate-100 text-slate-500" },
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

function redownloadHref(meta: Run["meta"]) {
  const qs = new URLSearchParams({ type: meta.type ?? "overview", format: meta.format ?? "pdf", from: meta.from ?? "", to: meta.to ?? "", nolog: "1" });
  if (meta.category) qs.set("category", meta.category);
  if (meta.fund) qs.set("fund", meta.fund);
  return `/api/finance/report?${qs.toString()}`;
}

/** Historique des rapports générés (journal d'audit `finance.report.generated`) ; un clic
 * régénère le fichier avec les mêmes paramètres (aucun fichier n'est stocké). */
export function RecentReportsCard({ runs, canExport }: { runs: Run[]; canExport: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rapports récents</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {runs.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Aucun rapport généré pour le moment.</p>
        ) : (
          runs.map((run) => {
            const fmt = FORMATS[run.meta.format ?? "pdf"] ?? FORMATS.pdf!;
            const Icon = fmt.icon;
            const body = (
              <>
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${fmt.tile}`}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy">{run.meta.title ?? "Rapport financier"}</span>
                  <span className="block text-xs text-slate-400">
                    Généré le {dateFormat.format(run.createdAt)}
                    {run.actor ? ` par ${run.actor}` : ""}
                  </span>
                </span>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${fmt.badge}`}>{fmt.label}</span>
              </>
            );
            return canExport ? (
              <a key={run.id} href={redownloadHref(run.meta)} download className="flex items-center gap-3 rounded-lg p-1 hover:bg-slate-50">
                {body}
              </a>
            ) : (
              <div key={run.id} className="flex items-center gap-3 p-1">
                {body}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
