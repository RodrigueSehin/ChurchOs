import { NextResponse } from "next/server";

import { checkPermission } from "@/lib/auth/guards";
import { getAttendanceReport, getFinanceReportForExport, getMembersReport, getRegistrationsReport, type ReportData } from "@/features/reports/queries";
import { toCsv, toExcel, toPdf } from "@/features/reports/exporters";

const CONTENT_TYPES: Record<string, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

/**
 * Route Handler (pas une Server Action) : une réponse binaire téléchargeable ne peut pas être
 * renvoyée par une Server Action, seulement par un Route Handler (`NextResponse` avec
 * `Content-Disposition`). N'utilise que le client authentifié via `checkPermission` — aucune
 * opération admin ici, donc pas concerné par la restriction sur le client admin Supabase.
 */
export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";
  if (!["csv", "xlsx", "pdf"].includes(format)) {
    return NextResponse.json({ error: "Format non pris en charge." }, { status: 400 });
  }

  const check = await checkPermission("reports.export");
  if (!check.allowed) {
    return NextResponse.json({ error: "Vous n'avez pas la permission d'exporter des rapports." }, { status: 403 });
  }
  const organizationId = check.organization.organization.id;
  const canAny = (code: string) => check.context.isAdmin || check.context.permissions.has(code);

  let report: ReportData;
  if (type === "members") {
    if (!canAny("members.view")) return NextResponse.json({ error: "Accès refusé (members.view)." }, { status: 403 });
    report = await getMembersReport(organizationId);
  } else if (type === "attendance") {
    if (!canAny("attendance.view")) return NextResponse.json({ error: "Accès refusé (attendance.view)." }, { status: 403 });
    report = await getAttendanceReport(organizationId);
  } else if (type === "registrations") {
    if (!canAny("registrations.view")) return NextResponse.json({ error: "Accès refusé (registrations.view)." }, { status: 403 });
    report = await getRegistrationsReport(organizationId);
  } else if (type === "finance") {
    // Gaté sur `finance.view`, jamais seulement `reports.export` — voir la leçon de la Phase 9.
    if (!canAny("finance.view")) return NextResponse.json({ error: "Accès refusé (finance.view)." }, { status: 403 });
    const to = new Date().toISOString().slice(0, 10);
    const from = `${new Date().getUTCFullYear()}-01-01`;
    report = await getFinanceReportForExport(organizationId, from, to);
  } else {
    return NextResponse.json({ error: "Type de rapport inconnu." }, { status: 404 });
  }

  const buffer = format === "csv" ? toCsv(report) : format === "xlsx" ? await toExcel(report) : await toPdf(report);

  return new NextResponse(Uint8Array.from(buffer), {
    headers: {
      "Content-Type": CONTENT_TYPES[format] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${type}-report.${format}"`,
    },
  });
}
