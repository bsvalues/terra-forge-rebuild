// TerraFusion OS — Phase 87: Cost Approach Hook
// Manages cost schedules and cost approach run data.
// Query Key: ["cost-schedules", countyId] • Stale: 30s

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CostSchedule {
  id: string;
  county_id: string;
  property_class: string;
  quality_grade: string;
  base_cost_per_sqft: number;
  effective_year: number;
  created_at: string;
  updated_at: string;
}

export interface CostApproachRun {
  id: string;
  county_id: string;
  schedule_id: string;
  neighborhood_code: string;
  parcels_processed: number;
  parcels_matched: number;
  mean_ratio: number | null;
  median_ratio: number | null;
  cod: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/** Fetch cost schedules for the county. */
export function useCostSchedules(countyId?: string) {
  return useQuery<CostSchedule[]>({
    queryKey: ["cost-schedules", countyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_schedules")
        .select("*")
        .eq("county_id", countyId!)
        .order("effective_year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CostSchedule[];
    },
    enabled: !!countyId,
    staleTime: 30_000,
  });
}

/** Fetch cost approach runs for the county. */
export function useCostApproachRuns(countyId?: string) {
  return useQuery<CostApproachRun[]>({
    queryKey: ["cost-approach-runs", countyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_approach_runs")
        .select("*")
        .eq("county_id", countyId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CostApproachRun[];
    },
    enabled: !!countyId,
    staleTime: 30_000,
  });
}
