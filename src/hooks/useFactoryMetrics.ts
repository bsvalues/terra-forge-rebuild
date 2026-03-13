// TerraFusion OS — Factory Dashboard Metrics Hook
// Extracts direct supabase queries from FactoryDashboardHeader (Data Constitution)

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useActiveAdjustmentsCount() {
  return useQuery({
    queryKey: ["factory", "active-adjustments"],
    queryFn: async () => {
      const { count } = await supabase
        .from("value_adjustments")
        .select("*", { count: "exact", head: true })
        .is("rolled_back_at", null);
      return count || 0;
    },
    staleTime: 120_000,
  });
}

export function useNeighborhoodCount() {
  return useQuery({
    queryKey: ["factory", "neighborhoods"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parcels")
        .select("neighborhood_code")
        .not("neighborhood_code", "is", null)
        .limit(1000);
      return new Set((data || []).map(p => p.neighborhood_code)).size;
    },
    staleTime: 120_000,
  });
}

export function useLatestCalibrationRun() {
  return useQuery({
    queryKey: ["latest-calibration-run"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("calibration_runs")
        .select("id, neighborhood_code, r_squared, sample_size, status, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });
}
