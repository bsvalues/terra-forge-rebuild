// TerraFusion OS — SLCO Pipeline Orchestrator Hook
// Manages stage execution, status polling, and live table counts.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STAGES = [
  "raw_ingest",
  "standardize",
  "identity_resolve",
  "spatial_join",
  "commercial_enrich",
  "recorder_enrich",
  "publish_marts",
] as const;

export type SLCOStage = typeof STAGES[number];

export interface StageStatus {
  stage: string;
  status: "pending" | "running" | "complete" | "failed";
  rows_in: number;
  rows_out: number;
  rows_rejected: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

export interface PipelineStatus {
  stages: Record<string, StageStatus>;
  tableCounts: Record<string, number>;
  runs: any[];
}

async function invokePipeline(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("slco-pipeline", { body });
  if (error) throw error;
  return data;
}

const QUERY_KEY = ["slco-pipeline-status"];

export function useSLCOPipelineStatus() {
  return useQuery<PipelineStatus>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await invokePipeline({ action: "status" });
      return result as PipelineStatus;
    },
    staleTime: 5_000,
    refetchInterval: 8_000,
  });
}

export function useRunStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stage: SLCOStage) => invokePipeline({ action: "run_stage", stage }),
    onSuccess: (_data, stage) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(`Stage "${stage}" completed`);
    },
    onError: (err: any, stage) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.error(`Stage "${stage}" failed`, { description: err.message });
    },
  });
}

export function useRunAllStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => invokePipeline({ action: "run_all" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Full pipeline completed");
    },
    onError: (err: any) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.error("Pipeline failed", { description: err.message });
    },
  });
}

export function useResetPipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => invokePipeline({ action: "reset" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.info("Pipeline runs cleared");
    },
  });
}

export { STAGES };
