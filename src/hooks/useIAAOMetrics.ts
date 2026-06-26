// TerraFusion OS -- Phase 220: IAAO Compliance Metrics Hook
// Queries segment_calibration_runs for COD/PRD/PRB per neighborhood

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IAAOMetrics {
  neighborhoodCode: string;
  medianRatio: number | null;
  cod: number | null;
  prd: number | null;
  prb: number | null;
  sampleSize: number;
  iaaoCompliant: boolean;
  runDate: string | null;
}

/**
 * Fetches latest IAAO compliance metrics per neighborhood from calibration runs.
 * IAAO compliant = COD <= 15 AND PRD between 0.98 and 1.03.
 */
export function useIAAOMetrics(countyId: string | null) {
  return useQuery({
    queryKey: ["iaao-metrics", countyId],
    enabled: !!countyId,
    staleTime: 15 * 60_000,
    queryFn: async (): Promise<IAAOMetrics[]> => {
      if (!countyId) return [];

      // Query segment_calibration_runs which has COD/PRD/median_ratio,
      // joined with calibration_runs for neighborhood_code
      const { data, error } = await supabase
        .from("segment_calibration_runs")
        .select("cod, prd, median_ratio, sample_size, created_at, calibration_runs!inner(neighborhood_code)")
        .eq("county_id", countyId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      if (!data) return [];

      // Deduplicate: take only the latest run per neighborhood
      const byNbhd = new Map<string, IAAOMetrics>();
      for (const row of data) {
        const calibRun = row.calibration_runs as unknown as { neighborhood_code: string } | null;
        const nbhd = calibRun?.neighborhood_code;
        if (!nbhd || byNbhd.has(nbhd)) continue;

        const cod = row.cod ?? null;
        const prd = row.prd ?? null;

        byNbhd.set(nbhd, {
          neighborhoodCode: nbhd,
          medianRatio: row.median_ratio ?? null,
          cod,
          prd,
          prb: null, // PRB not stored in segment_calibration_runs
          sampleSize: row.sample_size ?? 0,
          iaaoCompliant:
            cod != null && cod <= 15 && prd != null && prd >= 0.98 && prd <= 1.03,
          runDate: row.created_at ?? null,
        });
      }

      return Array.from(byNbhd.values());
    },
  });
}
