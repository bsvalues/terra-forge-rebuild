import { supabase } from "@/integrations/supabase/client";
import { runQualityGates } from "@/config/pacsQualityGates";
import type { QualityGateReport } from "@/config/pacsQualityGates";

export interface GateRunResult {
  productId: string;
  tableName: string;
  report: QualityGateReport | null;
  error: string | null;
  rowCount: number;
}

const PACS_PRODUCTS = [
  { productId: "pacs_current_year_owners", table: "pacs_owners" },
  { productId: "pacs_qualified_sales", table: "pacs_sales" },
  { productId: "pacs_land_details", table: "pacs_land_details" },
  { productId: "pacs_improvements", table: "pacs_improvements" },
  { productId: "pacs_improvement_details", table: "pacs_improvement_details" },
  { productId: "pacs_assessment_roll", table: "pacs_assessment_roll" },
] as const;

export async function runGatesForProduct(
  productId: string,
  tableName: string,
  sampleSize: number = 1000,
): Promise<GateRunResult> {
  const { data, error } = await (supabase as any)
    .from(tableName)
    .select("*")
    .limit(sampleSize);

  if (error) {
    return { productId, tableName, report: null, error: String(error.message), rowCount: 0 };
  }

  const records = data ?? [];
  const report = runQualityGates({
    year: new Date().getFullYear(),
    productId,
    records,
  });

  return { productId, tableName, report, error: null, rowCount: records.length };
}

export async function runAllGates(sampleSize = 1000): Promise<GateRunResult[]> {
  const results = await Promise.allSettled(
    PACS_PRODUCTS.map((p) => runGatesForProduct(p.productId, p.table, sampleSize)),
  );
  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { productId: PACS_PRODUCTS[i].productId, tableName: PACS_PRODUCTS[i].table, report: null, error: String(r.reason), rowCount: 0 },
  );
}
