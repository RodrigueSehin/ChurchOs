import "server-only";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

import type { ReportData } from "@/features/reports/queries";

function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Préfixe BOM UTF-8 : sans lui, Excel (souvent le premier consommateur d'un export "CSV" côté
 * église) interprète les accents comme du Latin-1 et affiche des caractères corrompus. */
export function toCsv(report: ReportData): Buffer {
  const header = report.columns.map((c) => escapeCsvCell(c.label)).join(",");
  const lines = report.rows.map((row) => report.columns.map((c) => escapeCsvCell(row[c.key] ?? "")).join(","));
  const content = "﻿" + [header, ...lines].join("\r\n");
  return Buffer.from(content, "utf-8");
}

export async function toExcel(report: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(report.title.slice(0, 31));

  sheet.addRow(report.columns.map((c) => c.label));
  sheet.getRow(1).font = { bold: true };
  for (const row of report.rows) {
    sheet.addRow(report.columns.map((c) => row[c.key] ?? ""));
  }
  sheet.columns.forEach((col) => {
    col.width = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Tableau dessiné manuellement (pdfkit n'a pas de composant tableau intégré) : colonnes de
 * largeur égale, en-tête en gras, nouvelle page automatique quand on approche du bas. */
export async function toPdf(report: ReportData): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = pageWidth / report.columns.length;
  const rowHeight = 20;
  const startX = doc.page.margins.left;

  doc.fontSize(16).font("Helvetica-Bold").text(report.title, startX, doc.y);
  doc.moveDown(1);

  function drawHeader() {
    doc.font("Helvetica-Bold").fontSize(9);
    const y = doc.y;
    report.columns.forEach((col, i) => {
      doc.text(col.label, startX + i * colWidth, y, { width: colWidth - 4 });
    });
    doc.moveDown(1);
    doc.font("Helvetica").fontSize(9);
  }

  drawHeader();

  for (const row of report.rows) {
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawHeader();
    }
    const y = doc.y;
    report.columns.forEach((col, i) => {
      doc.text(row[col.key] ?? "", startX + i * colWidth, y, { width: colWidth - 4 });
    });
    doc.moveDown(1);
  }

  doc.end();
  return done;
}
