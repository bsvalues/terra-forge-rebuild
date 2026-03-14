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
  | "permits"
  | "notices"
  | "model_receipts";

export interface ExportConfig {
  dataset: ExportDataset;
  format: ExportFormat;
  filters?: {
    taxYear?: number;
    neighborhoodCode?: string;
    propertyClass?: string;
    dateFrom?: string;
    dateTo?: string;
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
export const DATASET_META: Record<ExportDataset, { label: string; description: string; table: string }> = {
  parcels: { label: "Parcels", description: "All parcel records with characteristics", table: "parcels" },
  assessments: { label: "Assessments", description: "Assessment values by tax year", table: "assessments" },
  sales: { label: "Sales", description: "Qualified and unqualified sales", table: "sales" },
  appeals: { label: "Appeals", description: "Appeal records with status history", table: "appeals" },
  exemptions: { label: "Exemptions", description: "Active and historical exemptions", table: "exemptions" },
  permits: { label: "Permits", description: "Building permits and status", table: "permits" },
  notices: { label: "Notices", description: "Generated assessment notices", table: "notices" },
  model_receipts: { label: "Model Receipts", description: "AVM and calibration model outputs", table: "model_receipts" },
};

// ── Column Selectors ──────────────────────────────────────────────
const DATASET_COLUMNS: Record<ExportDataset, string> = {
  parcels: "id, parcel_number, address, city, state, zip_code, property_class, neighborhood_code, year_built, bedrooms, bathrooms, building_area, land_area, assessed_value, land_value, improvement_value, latitude, longitude, created_at, updated_at",
  assessments: "id, parcel_id, tax_year, land_value, improvement_value, total_value, certified, assessment_date, assessment_reason, notes, created_at",
  sales: "id, parcel_id, sale_date, sale_price, sale_type, grantor, grantee, instrument_number, qualified, created_at",
  appeals: "id, parcel_id, status, appeal_date, original_value, requested_value, final_value, hearing_date, resolution_type, resolution_date, tax_year, notes, created_at",
  exemptions: "id, parcel_id, exemption_type, status, application_date, approval_date, expiration_date, exemption_amount, exemption_percentage, applicant_name, tax_year, notes, created_at",
  permits: "id, parcel_id, permit_number, permit_type, status, issue_date, completion_date, estimated_cost, description, created_at",
  notices: "id, parcel_id, notice_type, subject, status, ai_drafted, recipient_name, created_at",
  model_receipts: "id, parcel_id, model_type, model_version, operator_id, inputs, outputs, created_at",
};

// ── Core Export Function ──────────────────────────────────────────
export async function generateExport(config: ExportConfig): Promise<ExportResult> {
  const { dataset, format, filters, limit } = config;
  const columns = DATASET_COLUMNS[dataset];
  const table = DATASET_META[dataset].table;

  // Build query
  let query = supabase.from(table).select(columns);

  // Apply filters where applicable
  if (filters?.taxYear && ["assessments", "appeals", "exemptions"].includes(dataset)) {
    query = query.eq("tax_year", filters.taxYear);
  }
  if (filters?.neighborhoodCode && dataset === "parcels") {
    query = query.eq("neighborhood_code", filters.neighborhoodCode);
  }
  if (filters?.propertyClass && dataset === "parcels") {
    query = query.eq("property_class", filters.propertyClass);
  }
  if (filters?.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  query = query.order("created_at", { ascending: false }).limit(limit || 5000);

  const { data, error } = await query;
  if (error) throw new Error(`Export query failed: ${error.message}`);

  const rows = (data || []) as Record<string, unknown>[];
  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `terrafusion_${dataset}_${timestamp}.${format}`;

  let blob: Blob;
  if (format === "json") {
    blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  } else {
    blob = new Blob([toCsv(rows)], { type: "text/csv" });
  }

  // Emit trace event
  await emitTraceEvent({
    eventType: "data_exported",
    sourceModule: "os",
    eventData: {
      dataset,
      format,
      rowCount: rows.length,
      filters: filters || {},
    },
  }).catch(() => {}); // non-blocking

  return { dataset, format, rowCount: rows.length, fileName, blob };
}

// ── CSV Serializer ────────────────────────────────────────────────
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escCsv).join(","),
    ...rows.map((row) =>
      headers.map((h) => escCsv(String(row[h] ?? ""))).join(",")
    ),
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
