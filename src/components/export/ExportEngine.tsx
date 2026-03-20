// TerraFusion OS — Export Engine (Swarm B)
// Generates CSV/Excel exports from ratio study, roll readiness, and BOE packet data
// "The spreadsheet grew legs and walked into production." — Ralph, Spreadsheet Wrangler

import { toast } from "sonner";
// ExcelJS is lazy-loaded only when xlsx export is requested (~940KB savings)

export interface ExportableDataset {
  title: string;
  sheets: Array<{
    name: string;
    headers: string[];
    rows: (string | number | boolean | null)[][];
  }>;
  metadata?: Record<string, string>;
}

/**
 * Export dataset as CSV (first sheet only).
 */
export function exportCSV(dataset: ExportableDataset) {
  const sheet = dataset.sheets[0];
  if (!sheet) return;

  const csvRows = [sheet.headers.join(",")];
  for (const row of sheet.rows) {
    csvRows.push(row.map(cell => {
      if (cell === null || cell === undefined) return "";
      const str = String(cell);
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(","));
  }

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${sanitizeFilename(dataset.title)}.csv`);
  toast.success("CSV exported", { description: `${sheet.rows.length} rows` });
}

/**
 * Export dataset as XLSX (multi-sheet).
 */
export async function exportXLSX(dataset: ExportableDataset) {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "TerraFusion OS";
  wb.created = new Date();

  // Add metadata sheet if present
  if (dataset.metadata) {
    const metaWs = wb.addWorksheet("Info");
    metaWs.addRow(["Property", "Value"]);
    for (const [k, v] of Object.entries(dataset.metadata)) {
      metaWs.addRow([k, v]);
    }
  }

  for (const sheet of dataset.sheets) {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31));
    ws.addRow(sheet.headers);
    for (const row of sheet.rows) {
      ws.addRow(row);
    }
    // Auto-width columns
    ws.columns.forEach((col, i) => {
      const header = sheet.headers[i] ?? "";
      const maxLen = Math.max(
        header.length,
        ...sheet.rows.map(r => String(r[i] ?? "").length)
      ) + 2;
      col.width = maxLen;
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  downloadBlob(blob, `${sanitizeFilename(dataset.title)}.xlsx`);
  toast.success("Excel exported", { description: `${dataset.sheets.length} sheet(s)` });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, "").replace(/\s+/g, "_").slice(0, 64);
}

// ── Pre-built dataset builders ──────────────────────────────────

export function buildRatioStudyDataset(params: {
  taxYear: number;
  salesWindow: string;
  sampleSize: number;
  medianRatio: number;
  cod: number;
  prd: number;
  prb: number;
  tierSlope: number;
  lowTierMedian: number;
  midTierMedian: number;
  highTierMedian: number;
}): ExportableDataset {
  return {
    title: `VEI Ratio Study TY${params.taxYear}`,
    metadata: {
      "Report": "IAAO-Compliant Ratio Study",
      "Tax Year": String(params.taxYear),
      "Sales Window": params.salesWindow,
      "Sample Size": String(params.sampleSize),
      "Generated": new Date().toISOString(),
      "System": "TerraFusion OS",
    },
    sheets: [
      {
        name: "Summary Metrics",
        headers: ["Metric", "Value", "Target", "Status"],
        rows: [
          ["Median Ratio", params.medianRatio, "1.000", Math.abs(params.medianRatio - 1) <= 0.05 ? "Pass" : "Review"],
          ["COD (%)", params.cod, "≤15.0", params.cod <= 15 ? "Pass" : "Review"],
          ["PRD", params.prd, "0.98–1.03", params.prd >= 0.98 && params.prd <= 1.03 ? "Pass" : "Review"],
          ["PRB", params.prb, "±0.05", Math.abs(params.prb) <= 0.05 ? "Pass" : "Review"],
          ["Tier Slope", params.tierSlope, "~0.00", Math.abs(params.tierSlope) <= 0.05 ? "Pass" : "Review"],
          ["Sample Size", params.sampleSize, "≥30", params.sampleSize >= 30 ? "Pass" : "Insufficient"],
        ],
      },
      {
        name: "Tier Analysis",
        headers: ["Tier", "Median Ratio", "Deviation from 1.0"],
        rows: [
          ["Q1 (Low Value)", params.lowTierMedian, +(params.lowTierMedian - 1).toFixed(4)],
          ["Q2 (Mid-Low)", params.midTierMedian, +(params.midTierMedian - 1).toFixed(4)],
          ["Q3 (Mid-High)", params.midTierMedian, +(params.midTierMedian - 1).toFixed(4)],
          ["Q4 (High Value)", params.highTierMedian, +(params.highTierMedian - 1).toFixed(4)],
        ],
      },
    ],
  };
}

export function buildRollReadinessDataset(params: {
  score: number;
  verdict: string;
  checks: Array<{ label: string; status: string; metric: string; detail?: string }>;
  neighborhoods: Array<{ code: string; score: number; certRate: number; parcelCount: number }>;
}): ExportableDataset {
  return {
    title: `Roll Readiness Report TY${new Date().getFullYear()}`,
    metadata: {
      "Report": "Pre-Certification Roll Readiness",
      "Score": `${params.score}/100`,
      "Verdict": params.verdict,
      "Generated": new Date().toISOString(),
      "System": "TerraFusion OS",
    },
    sheets: [
      {
        name: "Checklist",
        headers: ["Check", "Status", "Metric", "Detail"],
        rows: params.checks.map(c => [c.label, c.status.toUpperCase(), c.metric, c.detail ?? ""]),
      },
      {
        name: "Neighborhoods",
        headers: ["Neighborhood", "Score", "Certification Rate (%)", "Parcel Count"],
        rows: params.neighborhoods.map(n => [n.code, n.score, n.certRate, n.parcelCount]),
      },
    ],
  };
}
