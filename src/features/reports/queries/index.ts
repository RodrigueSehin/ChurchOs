import "server-only";

import { getAllMembersForExport } from "@/features/members/services";
import { getAttendanceSessions } from "@/features/attendance/services";
import { getFinanceReport } from "@/features/finance/services";

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportData {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, string>[];
}

const MEMBER_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  inactive: "Inactif",
  transferred: "Transféré",
  deceased: "Décédé",
  archived: "Archivé",
};

export async function getMembersReport(organizationId: string): Promise<ReportData> {
  const rows = await getAllMembersForExport(organizationId);
  return {
    title: "Rapport des membres",
    columns: [
      { key: "firstName", label: "Prénom" },
      { key: "lastName", label: "Nom" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Téléphone" },
      { key: "status", label: "Statut" },
      { key: "membershipDate", label: "Date d'adhésion" },
      { key: "campusName", label: "Campus" },
    ],
    rows: rows.map((r) => ({
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email ?? "",
      phone: r.phone ?? "",
      status: MEMBER_STATUS_LABELS[r.status] ?? r.status,
      membershipDate: r.membershipDate ?? "",
      campusName: r.campusName ?? "",
    })),
  };
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export async function getAttendanceReport(organizationId: string): Promise<ReportData> {
  const sessions = await getAttendanceSessions({ organizationId });
  return {
    title: "Rapport de présence",
    columns: [
      { key: "title", label: "Session" },
      { key: "startsAt", label: "Date" },
      { key: "location", label: "Lieu" },
      { key: "recordCount", label: "Présents" },
    ],
    rows: sessions.map((s) => ({
      title: s.title,
      startsAt: formatDateTime(s.startsAt),
      location: s.location ?? "",
      recordCount: String(s.recordCount),
    })),
  };
}

/** Réservé à l'appelant : gaté sur `finance.view`, jamais seulement `reports.export` — voir la
 * leçon de la Phase 9 (des rôles ont `reports.*` sans accès aux finances). */
export async function getFinanceReportForExport(
  organizationId: string,
  from: string,
  to: string,
): Promise<ReportData> {
  const report = await getFinanceReport({ organizationId, from, to });
  return {
    title: `Rapport financier (${from} au ${to})`,
    columns: [
      { key: "type", label: "Type" },
      { key: "categoryName", label: "Catégorie" },
      { key: "total", label: "Total (XOF)" },
    ],
    rows: report.rows.map((r) => ({
      type: r.type === "income" ? "Recette" : r.type === "expense" ? "Dépense" : r.type,
      categoryName: r.categoryName ?? "—",
      total: String(r.total ?? 0),
    })),
  };
}
