// TerraFusion OS — Phase 72+73: Revaluation Progress Hook
// "The progress bar is my only friend now." — Ralph Wiggum

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { emitTraceEventAsync } from "@/services/terraTrace";

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
      const { data, error } = await (supabase.rpc as Function)(
        "get_revaluation_progress",
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

/** Complete (finalize) a revaluation cycle */
export function useCompleteRevaluationCycle() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    { cycle_id: string; status: string; parcels_certified: number; certification_pct: number },
    Error,
    string
  >({
    mutationFn: async (cycleId: string) => {
      const { data, error } = await (supabase.rpc as Function)(
        "complete_revaluation_cycle",
        { p_cycle_id: cycleId }
      );
      if (error) throw error;
      const result = data as unknown as { cycle_id: string; status: string; parcels_certified: number; certification_pct: number; error?: string };
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: ["revaluation-cycles"] });
      qc.invalidateQueries({ queryKey: ["revaluation-progress"] });
      qc.invalidateQueries({ queryKey: ["county-vitals"] });
      await emitTraceEventAsync({
        sourceModule: "dais",
        eventType: "county_roll_certified",
        eventData: {
          cycle_id: result.cycle_id,
          parcels_certified: result.parcels_certified,
          certification_pct: result.certification_pct,
        },
      });
      toast({
        title: "Revaluation Cycle Completed",
        description: `${result.parcels_certified} parcels certified (${result.certification_pct}%)`,
      });
    },
    onError: (err) => {
      toast({
        title: "Completion Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}
