// TerraFusion OS — SLCO Pipeline Orchestrator Hook v2
// Phase 61: Stage-gate validation, auto-retry, run history timeline.

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

export interface GateCheck {
  check: string;
  passed: boolean;
  detail: string;
}

export interface GateResult {
  passed: boolean;
  stage: string;
  checks: GateCheck[];
}

export interface StageStatus {
  stage: string;
  status: "pending" | "running" | "complete" | "failed";
  rows_in: number;
  rows_out: number;
  rows_rejected: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  metadata?: Record<string, any>;
}

export interface RunHistoryEntry {
  id: string;
  stage: string;
  status: string;
  rows_in: number;
  rows_out: number;
  rows_rejected: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number | null;
  metadata?: Record<string, any>;
}

export interface PipelineStatus {
  stages: Record<string, StageStatus>;
  gates: Record<string, GateResult>;
  tableCounts: Record<string, number>;
  runs: any[];
  history: RunHistoryEntry[];
}

async function invokePipeline(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("slco-pipeline", { body });
  if (error) throw error;
  if (data?.error && !data?.ok) throw new Error(data.error);
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
    mutationFn: ({ stage, skipGateCheck }: { stage: SLCOStage; skipGateCheck?: boolean }) =>
      invokePipeline({ action: "run_stage", stage, skipGateCheck }),
    onSuccess: (_data, { stage }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(`Stage "${stage}" completed`);
    },
    onError: (err: any, { stage }) => {
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

export function useValidateGate() {
  return useMutation({
    mutationFn: (stage: SLCOStage) => invokePipeline({ action: "validate_gate", stage }),
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
