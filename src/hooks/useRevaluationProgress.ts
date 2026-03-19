// TerraFusion OS — Phase 72: Revaluation Progress Hook
// "The progress bar is my only friend now." — Ralph Wiggum

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NeighborhoodProgress {
  hood_cd: string;
  parcel_count: number;
  assessed_count: number;
  certified_count: number;
  calibration_status: string;
  r_squared: number | null;
  avg_value: number | null;
  phase: "pending" | "calibrated" | "valued" | "certified";
}

export interface RevaluationProgress {
  cycle_id: string;
  cycle_name: string;
  tax_year: number;
  status: string;
  launched_at: string | null;
  total_parcels: number;
  total_assessed: number;
  total_certified: number;
  calibration_pct: number;
  assessment_pct: number;
  certification_pct: number;
  neighborhoods: NeighborhoodProgress[];
  error?: string;
}

export function useRevaluationProgress(cycleId: string | null) {
  return useQuery<RevaluationProgress | null>({
    queryKey: ["revaluation-progress", cycleId],
    queryFn: async () => {
      if (!cycleId) return null;
      const { data, error } = await supabase.rpc(
        "get_revaluation_progress" as any,
        { p_cycle_id: cycleId }
      );
      if (error) throw error;
      const result = data as unknown as RevaluationProgress;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    enabled: !!cycleId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
