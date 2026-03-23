import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Sales Reconciliation ──────────────────────────────────────────

export interface SalesReconciliationRow {
  parcel_id: string | null;
  parcel_number: string | null;
  prop_id: number | null;
  tf_sale_id: string | null;
  tf_sale_date: string | null;
  tf_sale_price: number | null;
  tf_sale_type: string | null;
  tf_is_qualified: boolean | null;
  tf_grantor: string | null;
  tf_grantee: string | null;
  pacs_sale_id: string | null;
  pacs_sale_date: string | null;
  pacs_sale_price: number | null;
  pacs_sale_type: string | null;
  pacs_ratio: number | null;
  pacs_market_value: number | null;
  pacs_hood_cd: string | null;
  match_status: "matched" | "tf_only" | "pacs_only";
  price_delta: number | null;
  date_delta_days: number | null;
}

export interface ReconciliationSummary {
  match_status: string;
  record_count: number;
  avg_price_delta: number | null;
  max_price_delta: number | null;
  avg_date_delta_days: number | null;
  exact_price_matches: number;
  near_price_matches: number;
  price_discrepancies: number;
}

export function useSalesReconciliationSummary() {
  return useQuery({
    queryKey: ["sales-reconciliation-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_sales_reconciliation_summary")
        .select("*");
      if (error) throw error;
      return (data ?? []) as ReconciliationSummary[];
    },
    staleTime: 300000,
  });
}

export function useSalesReconciliationDetails(
  matchStatus: "matched" | "tf_only" | "pacs_only" | null,
  limit = 100,
) {
  return useQuery({
    queryKey: ["sales-reconciliation-details", matchStatus, limit],
    queryFn: async () => {
      let query = supabase
        .from("vw_sales_reconciliation")
        .select("*")
        .limit(limit);
      if (matchStatus) {
        query = query.eq("match_status", matchStatus);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as SalesReconciliationRow[];
    },
    enabled: !!matchStatus,
    staleTime: 300000,
  });
}

// ── Assessment Reconciliation ─────────────────────────────────────

export interface AssessmentReconciliationRow {
  parcel_id: string | null;
  parcel_number: string | null;
  prop_id: number | null;
  tf_assessment_id: string | null;
  tf_tax_year: number | null;
  tf_land_value: number | null;
  tf_improvement_value: number | null;
  tf_total_value: number | null;
  tf_certified: boolean | null;
  pacs_roll_id: string | null;
  pacs_roll_year: number | null;
  pacs_land_value: number | null;
  pacs_improvement_value: number | null;
  pacs_total_appraised: number | null;
  pacs_total_taxable: number | null;
  pacs_situs: string | null;
  pacs_use_code: string | null;
  pacs_tax_area: string | null;
  match_status: "matched" | "tf_only" | "pacs_only";
  total_value_delta: number | null;
  land_value_delta: number | null;
  improvement_value_delta: number | null;
}

export interface AssessmentReconciliationSummary {
  match_status: string;
  record_count: number;
  avg_total_delta: number | null;
  max_total_delta: number | null;
  avg_land_delta: number | null;
  avg_improvement_delta: number | null;
  exact_value_matches: number;
  near_value_matches: number;
  value_discrepancies: number;
}

export function useAssessmentReconciliationSummary() {
  return useQuery({
    queryKey: ["assessment-reconciliation-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_assessment_reconciliation_summary")
        .select("*");
      if (error) throw error;
      return (data ?? []) as AssessmentReconciliationSummary[];
    },
    staleTime: 300000,
  });
}

export function useAssessmentReconciliationDetails(
  matchStatus: "matched" | "tf_only" | "pacs_only" | null,
  limit = 100,
) {
  return useQuery({
    queryKey: ["assessment-reconciliation-details", matchStatus, limit],
    queryFn: async () => {
      let query = supabase
        .from("vw_assessment_reconciliation")
        .select("*")
        .limit(limit);
      if (matchStatus) {
        query = query.eq("match_status", matchStatus);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AssessmentReconciliationRow[];
    },
    enabled: !!matchStatus,
    staleTime: 300000,
  });
}
