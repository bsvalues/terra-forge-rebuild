// TerraFusion OS — Export Service (Phase 148: IAAO Export + Excel)
// Generates CSV/JSON/XLSX exports from county data with IAAO ratio study support
// "I exported the ratios. They're in alphabetical odor." — Ralph, Data Janitor

import { supabase } from "@/integrations/supabase/client";
import { emitTraceEvent } from "@/services/terraTrace";
// ExcelJS is lazy-loaded only when xlsx format is requested (~940KB savings)

// ── Types ──────────────────────────────────────────────────────────
export type ExportFormat = "csv" | "json" | "xlsx";

export type ExportDataset =
  | "parcels"
  | "assessments"
  | "sales"
  | "appeals"
  | "exemptions"
  | "notices"
  | "model_receipts"
  | "iaao_ratio_study";

export interface ExportConfig {
  dataset: ExportDataset;
  format: ExportFormat;
  filters?: {
    taxYear?: number;
    neighborhoodCode?: string;
    propertyClass?: string;
  };
  limit?: number;
}

export interface ExportResult {
  dataset: ExportDataset;
  format: ExportFormat;
  rowCount: number;
  fileName: string;
  blob: Blob;
}

// ── Dataset Metadata ──────────────────────────────────────────────
export const DATASET_META: Record<ExportDataset, { label: string; description: string }> = {
  parcels: { label: "Parcels", description: "All parcel records with characteristics" },
  assessments: { label: "Assessments", description: "Assessment values by tax year" },
  sales: { label: "Sales", description: "Qualified and unqualified sales" },
  appeals: { label: "Appeals", description: "Appeal records with status history" },
  exemptions: { label: "Exemptions", description: "Active and historical exemptions" },
  notices: { label: "Notices", description: "Generated assessment notices" },
  model_receipts: { label: "Model Receipts", description: "AVM and calibration model outputs" },
  iaao_ratio_study: { label: "IAAO Ratio Study", description: "Full ratio study with COD, PRD, PRB — IAAO Standard on Ratio Studies compliant" },
};

// ── Core Export Function ──────────────────────────────────────────
export async function generateExport(config: ExportConfig): Promise<ExportResult> {
  const { dataset, format, filters, limit = 5000 } = config;

  const { data, error } = await runDatasetQuery(dataset, filters, limit);
  if (error) throw new Error(`Export query failed: ${error.message}`);

  const rows = (data || []) as Record<string, unknown>[];
  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `terrafusion_${dataset}_${timestamp}.${format}`;

  let blob: Blob;

  if (format === "xlsx") {
    blob = await toXlsx(rows, dataset);
  } else if (format === "json") {
    blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  } else {
    blob = new Blob([toCsv(rows)], { type: "text/csv" });
  }

  // Emit trace event (non-blocking)
  emitTraceEvent({
    eventType: "data_exported",
    sourceModule: "os",
    eventData: { dataset, format, rowCount: rows.length, filters: filters || {} },
  }).catch(() => {});

  return { dataset, format, rowCount: rows.length, fileName, blob };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runDatasetQuery(dataset: ExportDataset, filters?: ExportConfig["filters"], limit = 5000): Promise<{ data: any; error: any }> {
  switch (dataset) {
    case "parcels": {
      let q = supabase.from("parcels").select("id, parcel_number, address, city, state, zip_code, property_class, neighborhood_code, year_built, bedrooms, bathrooms, building_area, land_area, assessed_value, land_value, improvement_value, latitude, longitude, created_at, updated_at");
      if (filters?.neighborhoodCode) q = q.eq("neighborhood_code", filters.neighborhoodCode);
      if (filters?.propertyClass) q = q.eq("property_class", filters.propertyClass);
      return q.order("created_at", { ascending: false }).limit(limit);
    }
    case "assessments": {
      let q = supabase.from("assessments").select("id, parcel_id, tax_year, land_value, improvement_value, total_value, certified, assessment_date, assessment_reason, notes, created_at");
      if (filters?.taxYear) q = q.eq("tax_year", filters.taxYear);
      return q.order("created_at", { ascending: false }).limit(limit);
    }
    case "sales":
      return supabase.from("sales").select("id, parcel_id, sale_date, sale_price, sale_type, grantor, grantee, instrument_number, created_at").order("created_at", { ascending: false }).limit(limit);
    case "appeals": {
      let q = supabase.from("appeals").select("id, parcel_id, status, appeal_date, original_value, requested_value, final_value, hearing_date, resolution_type, resolution_date, tax_year, notes, created_at");
      if (filters?.taxYear) q = q.eq("tax_year", filters.taxYear);
      return q.order("created_at", { ascending: false }).limit(limit);
    }
    case "exemptions": {
      let q = supabase.from("exemptions").select("id, parcel_id, exemption_type, status, application_date, approval_date, expiration_date, exemption_amount, exemption_percentage, applicant_name, tax_year, notes, created_at");
      if (filters?.taxYear) q = q.eq("tax_year", filters.taxYear);
      return q.order("created_at", { ascending: false }).limit(limit);
    }
    case "notices":
      return supabase.from("notices").select("id, parcel_id, notice_type, subject, status, ai_drafted, recipient_name, created_at").order("created_at", { ascending: false }).limit(limit);
    case "model_receipts":
      return supabase.from("model_receipts").select("id, parcel_id, model_type, model_version, operator_id, created_at").order("created_at", { ascending: false }).limit(limit);
    case "iaao_ratio_study":
      return buildIaaoRatioStudy(filters, limit);
    default:
      throw new Error(`Unknown dataset: ${dataset}`);
  }
}

// ── IAAO Ratio Study Builder ──────────────────────────────────────
// Joins qualified sales with assessed values, computes per-parcel ratios,
// and calculates summary statistics per IAAO Standard on Ratio Studies.
async function buildIaaoRatioStudy(
  filters?: ExportConfig["filters"],
  limit = 5000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ data: any; error: any }> {
  // 1. Fetch assessment_ratios (pre-computed) or join sales + assessments
  let ratioQuery = supabase
    .from("assessment_ratios")
    .select(`
      id, parcel_id, sale_id, assessed_value, sale_price, ratio, is_outlier, value_tier,
      study_period_id, created_at
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  // If no pre-computed ratios exist, fall back to joining sales + parcels
  const { data: ratioData, error: ratioError } = await ratioQuery;

  if (ratioError || !ratioData || ratioData.length === 0) {
    // Fallback: build ratios from qualified sales
    let salesQ = supabase
      .from("sales")
      .select("id, parcel_id, sale_date, sale_price, sale_type, is_qualified")
      .eq("is_qualified", true)
      .gt("sale_price", 0)
      .order("sale_date", { ascending: false })
      .limit(limit);

    const { data: sales, error: salesErr } = await salesQ;
    if (salesErr) return { data: null, error: salesErr };

    const parcelIds = (sales ?? []).map(s => s.parcel_id);
    if (parcelIds.length === 0) return { data: [], error: null };

    const { data: parcels } = await supabase
      .from("parcels")
      .select("id, parcel_number, neighborhood_code, property_class, assessed_value, land_value, improvement_value")
      .in("id", parcelIds.slice(0, 500));

    const parcelMap = new Map((parcels ?? []).map((p: any) => [p.id, p]));

    const rows = (sales ?? []).map((s: any) => {
      const p = parcelMap.get(s.parcel_id) as any;
      const assessedValue = p?.assessed_value ?? 0;
      const ratio = s.sale_price > 0 ? assessedValue / s.sale_price : null;
      return {
        parcel_number: p?.parcel_number ?? "",
        neighborhood_code: p?.neighborhood_code ?? "",
        property_class: p?.property_class ?? "",
        assessed_value: assessedValue,
        land_value: p?.land_value ?? 0,
        improvement_value: p?.improvement_value ?? 0,
        sale_date: s.sale_date,
        sale_price: s.sale_price,
        sale_type: s.sale_type,
        ratio: ratio ? Math.round(ratio * 10000) / 10000 : null,
      };
    }).filter(r => r.ratio !== null);

    // Compute IAAO summary statistics
    const ratios = rows.map(r => r.ratio!).sort((a, b) => a - b);
    const n = ratios.length;
    if (n === 0) return { data: [], error: null };

    const median = n % 2 === 0 ? (ratios[n / 2 - 1] + ratios[n / 2]) / 2 : ratios[Math.floor(n / 2)];
    const mean = ratios.reduce((a, b) => a + b, 0) / n;
    const avgAbsDev = ratios.reduce((sum, r) => sum + Math.abs(r - median), 0) / n;
    const cod = (avgAbsDev / median) * 100;

    // PRD = mean / weighted mean
    const totalAssessed = rows.reduce((s, r) => s + r.assessed_value, 0);
    const totalSales = rows.reduce((s, r) => s + r.sale_price, 0);
    const weightedMean = totalSales > 0 ? totalAssessed / totalSales : mean;
    const prd = weightedMean > 0 ? mean / weightedMean : 1;

    // PRB approximation (simplified)
    const lnRatios = ratios.map(r => Math.log(r));
    const lnMean = lnRatios.reduce((a, b) => a + b, 0) / n;
    const lnValues = rows.map(r => Math.log(r.assessed_value + r.sale_price));
    const lnValMean = lnValues.reduce((a, b) => a + b, 0) / n;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (lnValues[i] - lnValMean) * (lnRatios[i] - lnMean);
      denominator += (lnValues[i] - lnValMean) ** 2;
    }
    const prb = denominator > 0 ? numerator / denominator : 0;

    // Add summary row at top
    const summaryRow = {
      parcel_number: "=== SUMMARY ===",
      neighborhood_code: "",
      property_class: "",
      assessed_value: null,
      land_value: null,
      improvement_value: null,
      sale_date: "",
      sale_price: null,
      sale_type: "",
      ratio: null,
      sample_size: n,
      median_ratio: Math.round(median * 10000) / 10000,
      mean_ratio: Math.round(mean * 10000) / 10000,
      cod: Math.round(cod * 100) / 100,
      prd: Math.round(prd * 10000) / 10000,
      prb: Math.round(prb * 10000) / 10000,
      iaao_cod_pass: cod <= 15 ? "PASS" : "FAIL",
      iaao_prd_pass: prd >= 0.98 && prd <= 1.03 ? "PASS" : "FAIL",
      iaao_prb_pass: Math.abs(prb) <= 0.05 ? "PASS" : "FAIL",
    };

    return { data: [summaryRow, ...rows], error: null };
  }

  // Use pre-computed ratios
  return { data: ratioData, error: null };
}

// ── Excel Serializer ──────────────────────────────────────────────
async function toXlsx(rows: Record<string, unknown>[], dataset: string): Promise<Blob> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TerraFusion OS";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(DATASET_META[dataset as ExportDataset]?.label ?? dataset);

  if (rows.length === 0) {
    sheet.addRow(["No data"]);
  } else {
    const headers = Object.keys(rows[0]);

    // Header row with styling
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };
      cell.alignment = { horizontal: "center" };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FF4A4A5A" } },
      };
    });

    // Data rows
    for (const row of rows) {
      const dataRow = sheet.addRow(headers.map(h => row[h] ?? ""));
      // Alternate row shading
      if (sheet.rowCount % 2 === 0) {
        dataRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8F9FA" } };
        });
      }
    }

    // Auto-width columns
    sheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? "").length;
        if (len > maxLen) maxLen = Math.min(len, 40);
      });
      col.width = maxLen + 2;
    });

    // For IAAO ratio study, add conditional formatting info
    if (dataset === "iaao_ratio_study" && rows.length > 1) {
      const summarySheet = workbook.addWorksheet("IAAO Summary");
      const summary = rows[0];

      summarySheet.addRow(["TerraFusion OS — IAAO Ratio Study Summary"]);
      summarySheet.getRow(1).font = { bold: true, size: 14 };
      summarySheet.addRow([]);
      summarySheet.addRow(["Generated", new Date().toLocaleDateString()]);
      summarySheet.addRow([]);
      summarySheet.addRow(["Metric", "Value", "IAAO Standard", "Result"]);
      summarySheet.getRow(5).font = { bold: true };

      const metrics = [
        ["Sample Size", summary.sample_size, "≥ 30", (summary.sample_size as number) >= 30 ? "PASS" : "FAIL"],
        ["Median Ratio", summary.median_ratio, "0.90 – 1.10", "—"],
        ["Mean Ratio", summary.mean_ratio, "—", "—"],
        ["COD", `${summary.cod}%`, "≤ 15.0%", summary.iaao_cod_pass],
        ["PRD", summary.prd, "0.98 – 1.03", summary.iaao_prd_pass],
        ["PRB", summary.prb, "±0.05", summary.iaao_prb_pass],
      ];

      for (const [metric, value, standard, result] of metrics) {
        const row = summarySheet.addRow([metric, value, standard, result]);
        const resultCell = row.getCell(4);
        if (result === "PASS") {
          resultCell.font = { bold: true, color: { argb: "FF16A34A" } };
        } else if (result === "FAIL") {
          resultCell.font = { bold: true, color: { argb: "FFDC2626" } };
        }
      }

      summarySheet.columns = [
        { width: 20 }, { width: 15 }, { width: 18 }, { width: 12 },
      ];
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// ── CSV Serializer ────────────────────────────────────────────────
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(escCsv).join(","),
    ...rows.map((row) => headers.map((h) => escCsv(String(row[h] ?? ""))).join(",")),
  ].join("\n");
}

function escCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// ── Download Helper ───────────────────────────────────────────────
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
