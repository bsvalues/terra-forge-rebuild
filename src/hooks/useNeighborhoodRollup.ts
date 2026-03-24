import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NeighborhoodLandSummary {
  hood_cd: string;
  parcel_count: number;
  total_acres: number | null;
  total_sqft: number | null;
  total_land_val: number | null;
  avg_land_val: number | null;
  total_ag_val: number | null;
  land_type_count: number;
}

export interface NeighborhoodImprovementSummary {
  hood_cd: string;
  improved_parcel_count: number;
  total_improvements: number;
  total_imprv_val: number | null;
  avg_imprv_val: number | null;
  avg_living_area: number | null;
  avg_year_built: number | null;
  imprv_type_count: number;
}

export interface NeighborhoodSalesSummary {
  hood_cd: string;
  sale_count: number;
  avg_sale_price: number | null;
  median_sale_price: number | null;
  earliest_sale: string | null;
  latest_sale: string | null;
  avg_ratio: number | null;
  median_ratio: number | null;
  iaao_band_count: number;
  iaao_band_pct: number | null;
}

export interface NeighborhoodAssessmentSummary {
  hood_cd: string;
  roll_year: number;
  parcel_count: number;
  total_appraised: number | null;
  avg_appraised: number | null;
  total_taxable: number | null;
  total_imprv_val: number | null;
  total_land_val: number | null;
  tax_area_count: number;
}

export function useNeighborhoodLandSummary() {
  return useQuery({
    queryKey: ["neighborhood-land-summary"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("vw_neighborhood_land_summary")
        .select("*")
        .order("total_land_val", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NeighborhoodLandSummary[];
    },
    staleTime: 300000,
  });
}

export function useNeighborhoodImprovementSummary() {
  return useQuery({
    queryKey: ["neighborhood-improvement-summary"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("vw_neighborhood_improvement_summary")
        .select("*")
        .order("total_imprv_val", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NeighborhoodImprovementSummary[];
    },
    staleTime: 300000,
  });
}

export function useNeighborhoodSalesSummary() {
  return useQuery({
    queryKey: ["neighborhood-sales-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_neighborhood_sales_summary")
        .select("*")
        .order("sale_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NeighborhoodSalesSummary[];
    },
    staleTime: 300000,
  });
}

export function useNeighborhoodAssessmentSummary(rollYear?: number) {
  return useQuery({
    queryKey: ["neighborhood-assessment-summary", rollYear],
    queryFn: async () => {
      let query = supabase
        .from("vw_neighborhood_assessment_summary")
        .select("*")
        .order("total_appraised", { ascending: false });
      if (rollYear) {
        query = query.eq("roll_year", rollYear);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as NeighborhoodAssessmentSummary[];
    },
    staleTime: 300000,
  });
}
