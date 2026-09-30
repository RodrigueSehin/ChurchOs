import { NextResponse } from "next/server";

import { checkPermission } from "@/lib/auth/guards";
import { exportReport, FORMAT_META } from "@/features/finance/reports/exporters";
import { buildFinancialReport, logReportRun, normalizeParams } from "@/features/finance/reports/queries";
import { REPORT_FORMATS, REPORT_TYPES, type ReportFormat, type ReportType } from "@/features/finance/reports/types";

/**
 * Génère un rapport financier dans le format demandé (pdf | xlsx | json | csv) et le renvoie en
 * téléchargement. Route Handler (pas une Server Action) : une réponse binaire ne peut pas passer
 * par une Server Action. Double garde : `finance.view` (les montants) ET `reports.export`
 * (l'export) — voir la leçon de la Phase 9 sur l'isolation des permissions finance.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") ?? "overview") as ReportType;
  const format = (searchParams.get("format") ?? "pdf") as ReportFormat;
  if (!REPORT_TYPES.includes(type)) return NextResponse.json({ error: "Type de rapport inconnu." }, { status: 400 });
  if (!REPORT_FORMATS.includes(format)) return NextResponse.json({ error: "Format non pris en charge." }, { status: 400 });

  const check = await checkPermission("finance.view");
  if (!check.allowed) return NextResponse.json({ error: "Accès refusé (finance.view)." }, { status: 403 });
  if (!check.context.isAdmin && !check.context.permissions.has("reports.export")) {
    return NextResponse.json({ error: "Accès refusé (reports.export)." }, { status: 403 });
  }

  const params = normalizeParams({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    categoryId: searchParams.get("category") ?? undefined,
    fundId: searchParams.get("fund") ?? undefined,
  });

  const organization = check.organization.organization;
  const profile = check.user.profile;
  const generatedBy = profile?.displayName || [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || check.user.email;

  try {
    const report = await buildFinancialReport({
      organizationId: organization.id,
      organizationName: organization.name,
      currency: organization.currency,
      generatedBy,
      type,
      params,
    });
    const buffer = await exportReport(report, format);

    // `nolog=1` : re-téléchargement depuis « Rapports récents » — pas de nouvelle entrée.
    if (searchParams.get("nolog") !== "1") {
      await logReportRun(organization.id, check.user.id, {
        type,
        format,
        title: report.title,
        from: params.from,
        to: params.to,
        category: params.categoryId ?? null,
        fund: params.fundId ?? null,
      });
    }

    const { contentType, extension } = FORMAT_META[format];
    return new NextResponse(Uint8Array.from(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="rapport-financier-${type}-${params.from}_${params.to}.${extension}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("finance report generation failed", error);
    return NextResponse.json({ error: "Échec de la génération du rapport." }, { status: 500 });
  }
}
