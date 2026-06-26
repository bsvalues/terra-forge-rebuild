// TerraFusion OS — Phase 211: Neighborhood Stats Hooks
// Calls real Supabase RPCs for neighborhood stats and equity overlays.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useNeighborhoodStats(
  neighborhoodCode: string | null,
  countyId: string | null
) {
  return useQuery({
    queryKey: ["neighborhood-stats", neighborhoodCode, countyId],
    enabled: !!(neighborhoodCode && countyId),
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_neighborhood_stats" as any, {
        p_county_id: countyId!,
        p_neighborhood_code: neighborhoodCode!,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useNeighborhoodEquityOverlay(countyId: string | null) {
  return useQuery({
    queryKey: ["neighborhood-equity-overlay", countyId],
    enabled: !!countyId,
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_neighborhood_equity_overlays" as any, {
        p_county_id: countyId!,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}
