import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DataQualityStats {
  total_parcels: number;
  has_assessed_value: number;
  has_building_area: number;
  has_year_built: number;
  has_bedrooms: number;
  has_bathrooms: number;
  has_coordinates: number;
  has_neighborhood: number;
  has_land_area: number;
}

export interface NeighborhoodQuality {
  neighborhood_code: string;
  total_parcels: number;
  has_assessed_value: number;
  has_building_area: number;
  has_coordinates: number;
  has_year_built: number;
  overall_pct: number;
}

export function useDataQualityStats() {
  return useQuery({
    queryKey: ["parcel-data-quality-stats"],
    queryFn: async (): Promise<DataQualityStats> => {
      const { data, error } = await supabase.rpc("get_parcel_data_quality_stats");
      if (error) throw error;
      return (data?.[0] ?? {
        total_parcels: 0, has_assessed_value: 0, has_building_area: 0,
        has_year_built: 0, has_bedrooms: 0, has_bathrooms: 0,
        has_coordinates: 0, has_neighborhood: 0, has_land_area: 0,
      }) as DataQualityStats;
    },
    staleTime: 60000,
  });
}

export function useNeighborhoodDataQuality() {
  return useQuery({
    queryKey: ["neighborhood-data-quality"],
    queryFn: async (): Promise<NeighborhoodQuality[]> => {
      const { data, error } = await supabase.rpc("get_neighborhood_data_quality");
      if (error) throw error;
      return (data || []) as NeighborhoodQuality[];
    },
    staleTime: 60000,
  });
}
