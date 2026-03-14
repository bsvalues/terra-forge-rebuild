// TerraFusion OS — Export Service
// Generates CSV/JSON exports from county data with configurable datasets

import { supabase } from "@/integrations/supabase/client";
import { emitTraceEvent } from "@/services/terraTrace";

// ── Types ──────────────────────────────────────────────────────────
export type ExportFormat = "csv" | "json";

export type ExportDataset =
  | "parcels"
  | "assessments"
  | "sales"
  | "appeals"
  | "exemptions"
  | "notices"
  | "model_receipts";

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
};

// ── Typed Query Builders ──────────────────────────────────────────
async function queryParcels(filters?: ExportConfig["filters"], limit = 5000) {
  let q = supabase.from("parcels").select("id, parcel_number, address, city, state, zip_code, property_class, neighborhood_code, year_built, bedrooms, bathrooms, building_area, land_area, assessed_value, land_value, improvement_value, latitude, longitude, created_at, updated_at");
  if (filters?.neighborhoodCode) q = q.eq("neighborhood_code", filters.neighborhoodCode);
  if (filters?.propertyClass) q = q.eq("property_class", filters.propertyClass);
  return q.order("created_at", { ascending: false }).limit(limit);
}

async function queryAssessments(filters?: ExportConfig["filters"], limit = 5000) {
  let q = supabase.from("assessments").select("id, parcel_id, tax_year, land_value, improvement_value, total_value, certified, assessment_date, assessment_reason, notes, created_at");
  if (filters?.taxYear) q = q.eq("tax_year", filters.taxYear);
  return q.order("created_at", { ascending: false }).limit(limit);
}

async function querySales(filters?: ExportConfig["filters"], limit = 5000) {
  return supabase.from("sales").select("id, parcel_id, sale_date, sale_price, sale_type, grantor, grantee, instrument_number, qualified, created_at").order("created_at", { ascending: false }).limit(limit);
}

async function queryAppeals(filters?: ExportConfig["filters"], limit = 5000) {
  let q = supabase.from("appeals").select("id, parcel_id, status, appeal_date, original_value, requested_value, final_value, hearing_date, resolution_type, resolution_date, tax_year, notes, created_at");
  if (filters?.taxYear) q = q.eq("tax_year", filters.taxYear);
  return q.order("created_at", { ascending: false }).limit(limit);
}

async function queryExemptions(filters?: ExportConfig["filters"], limit = 5000) {
  let q = supabase.from("exemptions").select("id, parcel_id, exemption_type, status, application_date, approval_date, expiration_date, exemption_amount, exemption_percentage, applicant_name, tax_year, notes, created_at");
  if (filters?.taxYear) q = q.eq("tax_year", filters.taxYear);
  return q.order("created_at", { ascending: false }).limit(limit);
}

async function queryNotices(_filters?: ExportConfig["filters"], limit = 5000) {
  return supabase.from("notices").select("id, parcel_id, notice_type, subject, status, ai_drafted, recipient_name, created_at").order("created_at", { ascending: false }).limit(limit);
}

async function queryModelReceipts(_filters?: ExportConfig["filters"], limit = 5000) {
  return supabase.from("model_receipts").select("id, parcel_id, model_type, model_version, operator_id, created_at").order("created_at", { ascending: false }).limit(limit);
}

const QUERY_MAP: Record<ExportDataset, (filters?: ExportConfig["filters"], limit?: number) => ReturnType<typeof queryParcels>> = {
  parcels: queryParcels,
  assessments: queryAssessments,
  sales: querySales,
  appeals: queryAppeals,
  exemptions: queryExemptions,
  notices: queryNotices,
  model_receipts: queryModelReceipts,
};

// ── Core Export Function ──────────────────────────────────────────
export async function generateExport(config: ExportConfig): Promise<ExportResult> {
  const { dataset, format, filters, limit } = config;
  const queryFn = QUERY_MAP[dataset];
  const { data, error } = await queryFn(filters, limit || 5000);

  if (error) throw new Error(`Export query failed: ${error.message}`);

  const rows = (data || []) as unknown as Record<string, unknown>[];
  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `terrafusion_${dataset}_${timestamp}.${format}`;

  let blob: Blob;
  if (format === "json") {
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

// ── CSV Serializer ────────────────────────────────────────────────
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escCsv).join(","),
    ...rows.map((row) => headers.map((h) => escCsv(String(row[h] ?? ""))).join(",")),
  ];
  return lines.join("\n");
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
