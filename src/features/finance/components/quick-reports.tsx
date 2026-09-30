"use client";

import { useSearchParams } from "next/navigation";
import { ArrowLeftRight, ChevronRight, PieChart, Scale, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReportDownload } from "@/features/finance/components/use-report-download";
import { REPORT_FORMATS, type ReportFormat, type ReportType } from "@/features/finance/reports/types";

const CARDS: { type: ReportType; title: string; description: string; icon: React.ElementType; tone: string }[] = [
  { type: "income_statement", title: "État des résultats", description: "Revenus, dépenses et solde sur une période donnée", icon: Scale, tone: "bg-green-50 text-green-600" },
  { type: "budget_execution", title: "Exécution budgétaire", description: "Comparaison budget vs réalisé", icon: PieChart, tone: "bg-amber-50 text-amber-600" },
  { type: "cashflow", title: "Flux de trésorerie", description: "Entrées, sorties et solde cumulé par mois", icon: ArrowLeftRight, tone: "bg-blue-50 text-blue-600" },
  { type: "by_ministry", title: "Rapport par ministère", description: "Budgets prévus et engagés par ministère", icon: Users, tone: "bg-purple-50 text-purple-600" },
];

/** Génère directement un type de rapport avec la période, les filtres et le format courants. */
export function QuickReports({ from, to, canExport }: { from: string; to: string; canExport: boolean }) {
  const searchParams = useSearchParams();
  const { generate, pending, error } = useReportDownload();
  const requested = searchParams.get("format") as ReportFormat | null;
  const format: ReportFormat = requested && REPORT_FORMATS.includes(requested) ? requested : "pdf";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rapports rapides</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CARDS.map(({ type, title, description, icon: Icon, tone }) => (
            <button
              key={type}
              type="button"
              disabled={!canExport || pending !== null}
              onClick={() => generate(type, format, { from, to, category: searchParams.get("category") ?? "", fund: searchParams.get("fund") ?? "" })}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-navy">{pending === type ? "Génération..." : title}</span>
                <span className="block text-xs text-slate-500">{description}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-slate-400" />
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
