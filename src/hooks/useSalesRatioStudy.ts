import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BENTON_COUNTY_ID = "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d";

// ── County Summary by Year ────────────────────────────────────────
export interface RatioCountySummary {
  sale_year: number;
  county_id: string;
  total_sales: number;
  qualified_sales: number;
  mean_ratio: number;
  median_ratio: number;
  cod: number | null;
  prd: number | null;
  min_ratio: number;
  max_ratio: number;
  stddev_ratio: number | null;
  total_sale_volume: number;
  total_assessed: number;
}

export function useRatioCountySummary() {
  return useQuery({
    queryKey: ["ratio-county-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_sales_ratio_county_summary")
        .select("*")
        .eq("county_id", BENTON_COUNTY_ID)
        .order("sale_year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RatioCountySummary[];
    },
    staleTime: 300000,
  });
}

// ── Neighborhood Ratio Study ──────────────────────────────────────
export interface RatioNeighborhoodRow {
  neighborhood_code: string | null;
  county_id: string;
  sale_year: number;
  sale_count: number;
  qualified_count: number;
  mean_ratio: number;
  median_ratio: number;
  cod: number | null;
  prd: number | null;
  total_sale_volume: number;
  avg_sale_price: number;
  total_assessed: number;
  avg_assessed: number;
  min_ratio: number;
  max_ratio: number;
  stddev_ratio: number | null;
  within_10pct_count: number;
  within_10pct_pct: number | null;
  cod_iaao_grade: string | null;
  prd_iaao_grade: string | null;
  median_iaao_grade: string | null;
}

export function useRatioByNeighborhood(saleYear: number | null) {
  return useQuery({
    queryKey: ["ratio-by-neighborhood", saleYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_sales_ratio_by_neighborhood")
        .select("*")
        .eq("county_id", BENTON_COUNTY_ID)
        .eq("sale_year", saleYear!)
        .order("sale_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RatioNeighborhoodRow[];
    },
    enabled: !!saleYear,
    staleTime: 300000,
  });
}

// ── Sale-level Detail ─────────────────────────────────────────────
export interface RatioDetailRow {
  sale_id: string;
  parcel_id: string;
  parcel_number: string | null;
  address: string | null;
  neighborhood_code: string | null;
  county_id: string;
  sale_date: string | null;
  sale_year: number | null;
  sale_price: number;
  deed_type: string | null;
  is_qualified: boolean | null;
  assessment_id: string;
  tax_year: number;
  assessed_value: number;
  land_value: number;
  improvement_value: number;
  certified: boolean | null;
  ratio: number | null;
  value_delta: number | null;
  pct_over_under: number | null;
}

export function useRatioDetail(
  saleYear: number | null,
  neighborhoodCode: string | null,
  qualifiedOnly = false,
  limit = 100,
) {
  return useQuery({
    queryKey: ["ratio-detail", saleYear, neighborhoodCode, qualifiedOnly, limit],
    queryFn: async () => {
      let query = supabase
        .from("vw_sales_ratio_detail")
        .select("*")
        .eq("county_id", BENTON_COUNTY_ID)
        .limit(limit)
        .order("ratio", { ascending: true });

      if (saleYear) query = query.eq("sale_year", saleYear);
      if (neighborhoodCode) query = query.eq("neighborhood_code", neighborhoodCode);
      if (qualifiedOnly) query = query.eq("is_qualified", true);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as RatioDetailRow[];
    },
    enabled: !!saleYear,
    staleTime: 300000,
  });
}
