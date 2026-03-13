import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EquityOverlay {
  neighborhood_code: string;
  parcel_count: number;
  avg_ratio: number;
  median_ratio: number;
  cod: number;
  prd: number;
  center_lat: number;
  center_lng: number;
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
}

/**
 * Server-side equity overlay computation via RPC.
 * Replaces the heavy client-side useNeighborhoodOverlays that batched sales queries.
 */
export function useEquityOverlays(studyPeriodId?: string) {
  return useQuery({
    queryKey: ["equity-overlays", studyPeriodId],
    queryFn: async (): Promise<EquityOverlay[]> => {
      const { data, error } = await supabase.rpc("get_neighborhood_equity_overlays", {
        p_study_period_id: studyPeriodId ?? null,
      });
      if (error) throw error;
      return (data || []) as EquityOverlay[];
    },
    staleTime: 120000,
  });
}
