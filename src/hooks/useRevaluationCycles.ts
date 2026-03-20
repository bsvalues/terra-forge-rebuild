// TerraFusion OS — Phase 71: Revaluation Cycle Hooks
// Read-contract: revaluation_cycles | Write-lane: forge (revaluation launch)
// "I launched the revaluation and it launched me back." — Ralph Wiggum

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { emitTraceEventAsync } from "@/services/terraTrace";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

export interface RevaluationCycle {
  id: string;
  county_id: string;
  tax_year: number;
  cycle_name: string;
  status: string;
  neighborhoods: string[];
  total_parcels: number;
  parcels_calibrated: number;
  parcels_valued: number;
  model_types: string[];
  defensibility_score: number | null;
  quality_score: number | null;
  launched_at: string | null;
  launched_by: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LaunchResult {
  cycle_id: string;
  status: string;
  tax_year: number;
  neighborhoods: string[];
  total_parcels: number;
  calibrated_neighborhoods: number;
  model_types: string[];
  quality_score: number;
  defensibility_score: number;
  error?: string;
}

const QUERY_KEY = ["revaluation-cycles"];

/** Fetch all revaluation cycles */
export function useRevaluationCycles() {
  const countyId = useActiveCountyId();

  return useQuery<RevaluationCycle[]>({
    queryKey: [...QUERY_KEY, countyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revaluation_cycles")
        .select("*")
        .eq("county_id", countyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as RevaluationCycle[]) || [];
    },
    enabled: !!countyId,
    staleTime: 60_000,
  });
}

/** Launch a new revaluation cycle via RPC */
export function useLaunchRevaluation() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation<LaunchResult, Error, {
    cycleName?: string;
    taxYear?: number;
    neighborhoods?: string[];
  }>({
    mutationFn: async ({ cycleName, taxYear, neighborhoods }) => {
      const { data, error } = await supabase.rpc(
        "launch_revaluation_cycle" as any,
        {
          p_cycle_name: cycleName || "Annual Revaluation",
          p_tax_year: taxYear || new Date().getFullYear(),
          p_neighborhoods: neighborhoods || null,
        }
      );
      if (error) throw error;
      const result = data as unknown as LaunchResult;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["county-vitals"] });
      await emitTraceEventAsync({
        sourceModule: "forge",
        eventType: "revaluation_launched",
        eventData: {
          cycle_id: result.cycle_id,
          tax_year: result.tax_year,
          neighborhoods: result.neighborhoods?.length,
          total_parcels: result.total_parcels,
        },
      });
      toast({
        title: "Revaluation Launched",
        description: `Cycle started for ${result.total_parcels.toLocaleString()} parcels across ${result.neighborhoods?.length || 0} neighborhoods`,
      });
    },
    onError: (err) => {
      toast({
        title: "Launch Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}
