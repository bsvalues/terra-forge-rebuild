// TerraFusion OS — Phase 86: AVM Pipeline Hook
// Manages AVM run lifecycle: launch, monitor, view results.
// Query Key: ["avm-runs", countyId] • Stale: 15s

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AvmRun {
  id: string;
  county_id: string;
  model_name: string;
  model_type: string;
  model_version: string;
  status: string;
  r_squared: number | null;
  rmse: number | null;
  mae: number | null;
  mape: number | null;
  cod: number | null;
  prd: number | null;
  sample_size: number | null;
  training_time_ms: number | null;
  feature_importance: Record<string, number> | null;
  predictions: Record<string, unknown>[] | null;
  training_config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/** Fetch all AVM runs for the county, most recent first. */
export function useAvmRuns(countyId?: string) {
  return useQuery<AvmRun[]>({
    queryKey: ["avm-runs", countyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avm_runs")
        .select("*")
        .eq("county_id", countyId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AvmRun[];
    },
    enabled: !!countyId,
    staleTime: 15_000,
  });
}

/** Fetch a single AVM run by ID. */
export function useAvmRunDetail(runId?: string) {
  return useQuery<AvmRun | null>({
    queryKey: ["avm-run-detail", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avm_runs")
        .select("*")
        .eq("id", runId!)
        .single();
      if (error) throw error;
      return data as AvmRun;
    },
    enabled: !!runId,
    staleTime: 10_000,
  });
}

/** Launch a new AVM run. */
export function useLaunchAvmRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      countyId: string;
      modelName: string;
      modelType: string;
      trainingConfig?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from("avm_runs")
        .insert([{
          county_id: params.countyId,
          model_name: params.modelName,
          model_type: params.modelType,
          model_version: "1.0",
          status: "queued",
          training_config: params.trainingConfig ?? {},
        }])
        .select()
        .single();
      if (error) throw error;
      return data as AvmRun;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["avm-runs", data.county_id] });
    },
  });
}
