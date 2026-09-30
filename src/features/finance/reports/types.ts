export const REPORT_TYPES = ["overview", "income_statement", "budget_execution", "cashflow", "by_ministry"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  overview: "Vue d'ensemble",
  income_statement: "État des résultats",
  budget_execution: "Exécution budgétaire",
  cashflow: "Flux de trésorerie",
  by_ministry: "Rapport par ministère",
};

export const REPORT_FORMATS = ["pdf", "xlsx", "json", "csv"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export const REPORT_FORMAT_LABELS: Record<ReportFormat, string> = {
  pdf: "PDF",
  xlsx: "Excel (.xlsx)",
  json: "JSON",
  csv: "CSV",
};

export interface ReportParams {
  from: string;
  to: string;
  categoryId?: string;
  fundId?: string;
}

export type ColumnKind = "text" | "money" | "percent" | "number";
export type Cell = string | number | null;

export interface ReportColumn {
  key: string;
  label: string;
  kind: ColumnKind;
}

export interface ReportSection {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, Cell>[];
  footer?: Record<string, Cell>;
}

export interface FinancialReport {
  type: ReportType;
  title: string;
  organizationName: string;
  currency: string;
  generatedAt: string;
  generatedBy: string | null;
  period: { from: string; to: string };
  filters: { category: string | null; fund: string | null };
  summary: {
    revenue: number;
    expenses: number;
    balance: number;
    budgetPlanned: number;
    /** Dépenses / budget prévu, en % — null s'il n'y a aucun budget sur la période. */
    executionRate: number | null;
  };
  sections: ReportSection[];
}
