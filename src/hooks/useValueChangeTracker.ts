import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BENTON_COUNTY_ID = "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d";

// ── YoY Summary ───────────────────────────────────────────────────
export interface AssessmentYoYSummary {
  tax_year: number;
  prev_tax_year: number | null;
  county_id: string;
  parcel_count: number;
  yoy_parcel_count: number;
  avg_total_delta: number | null;
  sum_total_delta: number | null;
  avg_pct_change: number | null;
  increased_count: number;
  decreased_count: number;
  unchanged_count: number;
  max_pct_increase: number | null;
  max_pct_decrease: number | null;
  total_roll_value: number | null;
  avg_value: number | null;
}

export function useAssessmentYoYSummary() {
  return useQuery({
    queryKey: ["assessment-yoy-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_assessment_yoy_summary")
        .select("*")
        .eq("county_id", BENTON_COUNTY_ID)
        .order("tax_year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AssessmentYoYSummary[];
    },
    staleTime: 300000,
  });
}

// ── Top Movers ────────────────────────────────────────────────────
export interface AssessmentTopMover {
  parcel_id: string;
  parcel_number: string | null;
  address: string | null;
  neighborhood_code: string | null;
  county_id: string;
  tax_year: number;
  prev_tax_year: number | null;
  total_value: number;
  prev_total_value: number;
  total_delta: number;
  total_pct_change: number | null;
  land_delta: number | null;
  improvement_delta: number | null;
  abs_delta: number;
}

export function useAssessmentTopMovers(
  taxYear: number | null,
  direction: "gainers" | "losers" | "all" = "all",
  limit = 50,
) {
  return useQuery({
    queryKey: ["assessment-top-movers", taxYear, direction, limit],
    queryFn: async () => {
      let query = supabase
        .from("vw_assessment_top_movers")
        .select("*")
        .eq("county_id", BENTON_COUNTY_ID)
        .limit(limit);

      if (taxYear) {
        query = query.eq("tax_year", taxYear);
      }
      if (direction === "gainers") {
        query = query.gt("total_delta", 0).order("total_delta", { ascending: false });
      } else if (direction === "losers") {
        query = query.lt("total_delta", 0).order("total_delta", { ascending: true });
      } else {
        query = query.order("abs_delta", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AssessmentTopMover[];
    },
    enabled: !!taxYear,
    staleTime: 300000,
  });
}

// ── Parcel YoY History ────────────────────────────────────────────
export interface AssessmentYoYRow {
  assessment_id: string;
  parcel_id: string;
  parcel_number: string | null;
  address: string | null;
  neighborhood_code: string | null;
  county_id: string;
  tax_year: number;
  prev_tax_year: number | null;
  total_value: number;
  land_value: number;
  improvement_value: number;
  certified: boolean | null;
  prev_total_value: number | null;
  prev_land_value: number | null;
  prev_improvement_value: number | null;
  total_delta: number | null;
  land_delta: number | null;
  improvement_delta: number | null;
  total_pct_change: number | null;
  land_pct_change: number | null;
  improvement_pct_change: number | null;
}

export function useParcelYoYHistory(parcelId: string | null) {
  return useQuery({
    queryKey: ["parcel-yoy-history", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_assessment_yoy")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("tax_year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AssessmentYoYRow[];
    },
    enabled: !!parcelId,
    staleTime: 300000,
  });
}
