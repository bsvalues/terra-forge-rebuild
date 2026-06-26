// TerraFusion OS -- Phase 221: Data Quality Scores RPC Hook
// Calls get_parcel_data_quality_stats RPC for DQ scores per domain

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DomainScore {
  domain: string;
  score: number;
  count: number;
}

export interface DataQualityStats {
  totalParcels: number;
  overallScore: number;
  domains: DomainScore[];
}

/**
 * Fetches aggregated data quality stats from the get_parcel_data_quality_stats RPC.
 * The RPC takes no arguments and returns completeness counts per field.
 */
export function useDataQualityScores() {
  return useQuery({
    queryKey: ["dq-scores"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<DataQualityStats | null> => {
      const { data, error } = await supabase.rpc("get_parcel_data_quality_stats");
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) return null;

      const row = data[0];
      const total = row.total_parcels || 1;

      // Build domain scores from the has_* fields
      const fields: { domain: string; key: keyof typeof row }[] = [
        { domain: "Assessed Value", key: "has_assessed_value" },
        { domain: "Bathrooms", key: "has_bathrooms" },
        { domain: "Bedrooms", key: "has_bedrooms" },
        { domain: "Building Area", key: "has_building_area" },
        { domain: "Coordinates", key: "has_coordinates" },
        { domain: "Land Area", key: "has_land_area" },
        { domain: "Neighborhood", key: "has_neighborhood" },
        { domain: "Year Built", key: "has_year_built" },
      ];

      const domains: DomainScore[] = fields.map((f) => ({
        domain: f.domain,
        score: Math.round(((row[f.key] as number) / total) * 100),
        count: row[f.key] as number,
      }));

      const overallScore = Math.round(
        domains.reduce((sum, d) => sum + d.score, 0) / domains.length
      );

      return { totalParcels: total, overallScore, domains };
    },
  });
}
