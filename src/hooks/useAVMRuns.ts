import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AVMRun {
  id: string;
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
  feature_importance: { feature: string; importance: number }[];
  predictions: { parcel_id: string; actual: number; predicted: number; residual_pct: number }[];
  training_config: Record<string, any>;
  training_time_ms: number | null;
  created_at: string;
}

export function useAVMRuns() {
  return useQuery({
    queryKey: ["avm-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avm_runs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AVMRun[];
    },
    staleTime: 120_000,
  });
}

export function useTrainAVM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/avm-train`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Training failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["avm-runs"] });
      toast.success("AVM Training Complete", {
        description: `${data.models} models trained on ${data.sample_size} parcels — Champion R² ${(data.champion_r2 * 100).toFixed(1)}%`,
      });
    },
    onError: (err) => {
      toast.error("Training Failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });
}
