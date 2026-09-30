import "server-only";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

import type { Cell, FinancialReport, ReportColumn, ReportFormat, ReportSection } from "./types";
import { REPORT_TYPE_LABELS } from "./types";

const unit = (currency: string) => (currency === "XOF" || currency === "XAF" ? "FCFA" : currency);

/** Espace normal comme séparateur de milliers : les polices PDF intégrées (WinAnsi) ne savent pas
 * rendre l'espace fine insécable que produit `Intl` en fr-FR. */
function groupThousands(value: number) {
  return String(Math.round(Math.abs(value))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatCell(value: Cell | undefined, column: ReportColumn) {
  if (value === null || value === undefined) return "—";
  if (column.kind === "money") return `${Number(value) < 0 ? "-" : ""}${groupThousands(Number(value))}`;
  if (column.kind === "percent") return `${Number(value)}%`;
  if (column.kind === "number") return String(value);
  return String(value);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function summaryRows(report: FinancialReport): [string, Cell, ReportColumn["kind"]][] {
  const s = report.summary;
  return [
    ["Total des revenus", s.revenue, "money"],
    ["Total des dépenses", s.expenses, "money"],
    ["Solde de la période", s.balance, "money"],
    ["Budget prévu", s.budgetPlanned, "money"],
    ["Taux d'exécution budget", s.executionRate, "percent"],
  ];
}

function subtitle(report: FinancialReport) {
  const filters = [report.filters.category && `Catégorie : ${report.filters.category}`, report.filters.fund && `Fonds : ${report.filters.fund}`].filter(Boolean);
  return [`Période : ${formatDate(report.period.from)} au ${formatDate(report.period.to)}`, ...filters].join("  ·  ");
}

// ---------------------------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------------------------
export function toJson(report: FinancialReport): Buffer {
  const payload = {
    meta: {
      type: report.type,
      title: report.title,
      organization: report.organizationName,
      currency: report.currency,
      generatedAt: report.generatedAt,
      generatedBy: report.generatedBy,
      period: report.period,
      filters: report.filters,
    },
    summary: report.summary,
    sections: report.sections.map((section) => ({
      title: section.title,
      // Montants et taux restent numériques (pas de chaînes formatées) : le JSON est fait pour être relu par un programme.
      rows: section.rows,
      ...(section.footer ? { totals: section.footer } : {}),
    })),
  };
  return Buffer.from(JSON.stringify(payload, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------------------------
// CSV (BOM UTF-8 pour Excel)
// ---------------------------------------------------------------------------------------------
function csvCell(value: string) {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(report: FinancialReport): Buffer {
  const lines: string[] = [csvCell(report.title), csvCell(subtitle(report)), ""];
  for (const [label, value, kind] of summaryRows(report)) lines.push([csvCell(label), csvCell(formatCell(value, { key: "", label: "", kind }))].join(","));
  for (const section of report.sections) {
    lines.push("", csvCell(section.title), section.columns.map((c) => csvCell(c.label)).join(","));
    for (const row of section.rows) lines.push(section.columns.map((c) => csvCell(formatCell(row[c.key], c))).join(","));
    if (section.footer) lines.push(section.columns.map((c) => csvCell(formatCell(section.footer![c.key], c))).join(","));
  }
  return Buffer.from("﻿" + lines.join("\r\n"), "utf-8");
}

// ---------------------------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------------------------
export async function toExcel(report: FinancialReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ChurchOS";
  workbook.created = new Date(report.generatedAt);

  const summary = workbook.addWorksheet("Synthèse");
  summary.addRow([report.title]).font = { bold: true, size: 14 };
  summary.addRow([report.organizationName]);
  summary.addRow([subtitle(report)]);
  summary.addRow([]);
  const head = summary.addRow(["Indicateur", `Valeur (${unit(report.currency)})`]);
  head.font = { bold: true };
  for (const [label, value, kind] of summaryRows(report)) {
    const row = summary.addRow([label, value ?? "—"]);
    row.getCell(2).numFmt = kind === "percent" ? '0"%"' : "#,##0";
  }
  summary.getColumn(1).width = 34;
  summary.getColumn(2).width = 22;

  for (const section of report.sections) writeSheet(workbook, section);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function writeSheet(workbook: ExcelJS.Workbook, section: ReportSection) {
  const sheet = workbook.addWorksheet(section.title.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
  const header = sheet.addRow(section.columns.map((c) => c.label));
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2A4A" } };

  const addRow = (data: Record<string, Cell>, bold = false) => {
    const row = sheet.addRow(section.columns.map((c) => data[c.key] ?? null));
    section.columns.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      if (c.kind === "money") cell.numFmt = "#,##0;[Red]-#,##0";
      if (c.kind === "percent") cell.numFmt = '0"%"';
    });
    if (bold) {
      row.font = { bold: true };
      row.border = { top: { style: "thin" } };
    }
  };
  for (const row of section.rows) addRow(row);
  if (section.footer) addRow(section.footer, true);

  section.columns.forEach((c, i) => {
    sheet.getColumn(i + 1).width = c.kind === "text" ? 32 : 18;
    if (c.kind !== "text") sheet.getColumn(i + 1).alignment = { horizontal: "right" };
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

// ---------------------------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------------------------
export async function toPdf(report: FinancialReport): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: "A4", bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const bottom = () => doc.page.height - doc.page.margins.bottom - 20;
  const NAVY = "#0F2A4A";

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#64748B").text("ChurchOS — " + report.organizationName, left, doc.y);
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(18).fillColor(NAVY).text(REPORT_TYPE_LABELS[report.type], left, doc.y);
  doc.font("Helvetica").fontSize(9).fillColor("#475569").text(subtitle(report), left, doc.y + 2);
  doc.moveDown(1);

  // Synthèse : 5 indicateurs sur une ligne.
  const cards = summaryRows(report);
  const cardW = width / cards.length;
  const cardsY = doc.y;
  cards.forEach(([label, value, kind], i) => {
    const x = left + i * cardW;
    doc.roundedRect(x + 2, cardsY, cardW - 4, 46, 4).fill("#F1F5F9");
    doc.fillColor("#64748B").font("Helvetica").fontSize(7.5).text(label, x + 8, cardsY + 7, { width: cardW - 16 });
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text(formatCell(value, { key: "", label: "", kind }) + (kind === "money" ? ` ${unit(report.currency)}` : ""), x + 8, cardsY + 25, { width: cardW - 16 });
  });
  doc.y = cardsY + 62;

  for (const section of report.sections) {
    if (doc.y + 70 > bottom()) doc.addPage();
    doc.font("Helvetica-Bold").fontSize(12).fillColor(NAVY).text(section.title, left, doc.y);
    doc.moveDown(0.5);

    // Première colonne (texte) plus large, les autres se partagent le reste.
    const textCols = section.columns.filter((c) => c.kind === "text").length;
    const firstW = Math.min(width * 0.36, width - (section.columns.length - 1) * 60);
    const otherW = (width - firstW * Math.min(textCols, 1)) / Math.max(section.columns.length - Math.min(textCols, 1), 1);
    const widths = section.columns.map((c, i) => (c.kind === "text" && i === 0 ? firstW : otherW));

    const drawRow = (values: string[], opts: { bold?: boolean; header?: boolean; shade?: boolean }) => {
      if (doc.y + 18 > bottom()) {
        doc.addPage();
      }
      const y = doc.y;
      if (opts.header) doc.rect(left, y - 3, width, 17).fill(NAVY);
      else if (opts.shade) doc.rect(left, y - 3, width, 17).fill("#F8FAFC");
      doc.font(opts.bold || opts.header ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).fillColor(opts.header ? "#FFFFFF" : "#0F172A");
      let x = left;
      values.forEach((text, i) => {
        doc.text(text, x + 4, y, { width: widths[i]! - 8, align: section.columns[i]!.kind === "text" ? "left" : "right", lineBreak: false, ellipsis: true });
        x += widths[i]!;
      });
      doc.y = y + 17;
    };

    drawRow(section.columns.map((c) => c.label), { header: true });
    section.rows.forEach((row, i) => drawRow(section.columns.map((c) => formatCell(row[c.key], c)), { shade: i % 2 === 1 }));
    if (section.footer) drawRow(section.columns.map((c) => formatCell(section.footer![c.key], c)), { bold: true });
    doc.moveDown(1.2);
  }

  // Pied de page : date de génération + pagination (nécessite bufferPages).
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    // Écrire sous la marge basse déclencherait un saut de page automatique : on la neutralise
    // pour ce seul pied de page.
    doc.page.margins.bottom = 0;
    doc.font("Helvetica").fontSize(7.5).fillColor("#94A3B8");
    doc.text(
      `Généré le ${formatDate(report.generatedAt.slice(0, 10))}${report.generatedBy ? ` par ${report.generatedBy}` : ""}  ·  Montants en ${unit(report.currency)}  ·  Page ${i + 1}/${range.count}`,
      left,
      doc.page.height - 30,
      { width, align: "center", lineBreak: false },
    );
  }

  doc.end();
  return done;
}

export const FORMAT_META: Record<ReportFormat, { contentType: string; extension: string }> = {
  pdf: { contentType: "application/pdf", extension: "pdf" },
  xlsx: { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx" },
  json: { contentType: "application/json; charset=utf-8", extension: "json" },
  csv: { contentType: "text/csv; charset=utf-8", extension: "csv" },
};

export async function exportReport(report: FinancialReport, format: ReportFormat): Promise<Buffer> {
  if (format === "pdf") return toPdf(report);
  if (format === "xlsx") return toExcel(report);
  if (format === "json") return toJson(report);
  return toCsv(report);
}
