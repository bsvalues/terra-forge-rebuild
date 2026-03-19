// TerraFusion OS — Phase 74: Revaluation Report Hook
// "The spreadsheet told me a secret. It said I'm numbers." — Ralph Wiggum

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClassSummary {
  property_class: string;
  parcel_count: number;
  land_value: number;
  improvement_value: number;
  total_value: number;
}

export interface NeighborhoodSummary {
  neighborhood: string;
  parcel_count: number;
  total_value: number;
  avg_value: number;
}

export interface ValueBucket {
  bucket: string;
  count: number;
  total_value: number;
}

export interface RatioStudySummary {
  sample_size: number;
  median_ratio: number | null;
  cod: number | null;
  prd: number | null;
}

export interface RevaluationReport {
  cycle_id: string;
  cycle_name: string;
  tax_year: number;
  status: string;
  total_parcels: number;
  total_land_value: number;
  total_improvement_value: number;
  total_assessed_value: number;
  prior_year_assessed: number;
  value_change_pct: number | null;
  class_summary: ClassSummary[];
  neighborhood_summary: NeighborhoodSummary[];
  value_distribution: ValueBucket[];
  ratio_study: RatioStudySummary;
  generated_at: string;
  error?: string;
}

export function useRevaluationReport(cycleId: string | null) {
  return useQuery<RevaluationReport | null>({
    queryKey: ["revaluation-report", cycleId],
    queryFn: async () => {
      if (!cycleId) return null;
      const { data, error } = await supabase.rpc(
        "get_revaluation_report" as any,
        { p_cycle_id: cycleId }
      );
      if (error) throw error;
      const result = data as unknown as RevaluationReport;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    enabled: !!cycleId,
    staleTime: 60_000,
  });
}
