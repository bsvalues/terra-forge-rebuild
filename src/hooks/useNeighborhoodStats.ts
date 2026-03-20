// TerraFusion OS — Year-Scoped Neighborhood Stats Hook
// Uses get_neighborhood_stats() RPC for rollup analytics

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

export interface NeighborhoodStat {
  hood_cd: string;
  hood_name: string | null;
  parcel_count: number;
  avg_assessed_value: number;
  min_assessed_value: number;
  max_assessed_value: number;
  avg_land_value: number;
  avg_improvement_value: number;
  total_assessed_value: number;
}

export function useNeighborhoodStats(year?: number) {
  const countyId = useActiveCountyId();
  const effectiveYear = year ?? new Date().getFullYear();

  return useQuery<NeighborhoodStat[]>({
    queryKey: ["neighborhood-stats", countyId, effectiveYear],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_neighborhood_stats" as any,
        { p_year: effectiveYear, p_county_id: countyId }
      );
      if (error) throw error;
      return (data as NeighborhoodStat[]) ?? [];
    },
    enabled: !!countyId,
    staleTime: 120_000,
  });
}
