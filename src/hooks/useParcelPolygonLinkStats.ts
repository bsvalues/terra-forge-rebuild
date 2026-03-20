import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ParcelPolygonLinkStats {
  county_id: string;
  parcels_total: number;
  parcels_with_situs_point: number;
  parcels_with_polygon: number;
  coverage_pct_of_situs: number;
  features_ingested: number;
  features_linked_to_parcels: number;
}

export function useParcelPolygonLinkStats(countyId: string) {
  return useQuery({
    queryKey: ["parcel-polygon-link-stats", countyId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as Function)(
        "get_parcel_polygon_link_stats",
        { p_county_id: countyId }
      );
      if (error) throw error;
      return data as unknown as ParcelPolygonLinkStats;
    },
    enabled: !!countyId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
