// TerraFusion OS — Trust Models & Runs Hooks (Constitutional Data Layer)
// Provides calibration_runs and model_receipts for the Trust Registry.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CalibrationRunSummary {
  id: string;
  neighborhood_code: string;
  model_type: string;
  status: string;
  r_squared: number | null;
  rmse: number | null;
  sample_size: number | null;
  created_at: string;
  variables: string[];
}

export interface ModelReceiptSummary {
  id: string;
  model_type: string;
  model_version: string;
  parcel_id: string | null;
  created_at: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
}

export function useTrustRuns(limit = 25) {
  return useQuery<CalibrationRunSummary[]>({
    queryKey: ["trust-registry-runs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calibration_runs")
        .select("id, neighborhood_code, model_type, status, r_squared, rmse, sample_size, created_at, variables")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as CalibrationRunSummary[];
    },
    staleTime: 30_000,
  });
}

export function useTrustModels(limit = 25) {
  return useQuery<ModelReceiptSummary[]>({
    queryKey: ["trust-registry-models", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_receipts")
        .select("id, model_type, model_version, parcel_id, created_at, inputs, outputs")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as ModelReceiptSummary[];
    },
    staleTime: 30_000,
  });
}
