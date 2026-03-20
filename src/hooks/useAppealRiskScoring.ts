// TerraFusion OS — Appeal Risk Scoring Hooks (Phase 77)
// "I assessed a risk once. It was a tire swing." — Ralph Wiggum

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emitTraceEventAsync } from "@/services/terraTrace";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────
export type RiskTier = "critical" | "high" | "medium" | "low";
export type DefenseStatus = "unqueued" | "queued" | "in_progress" | "ready" | "filed";

export interface AppealRiskScore {
  id: string;
  county_id: string;
  parcel_id: string;
  parcel_number: string;
  owner_name: string | null;
  situs_address: string | null;
  neighborhood_code: string | null;
  prior_value: number;
  new_value: number;
  value_change: number;
  value_change_pct: number;
  risk_score: number;
  risk_tier: RiskTier;
  risk_factors: string[];
  defense_status: DefenseStatus;
  dossier_packet_id: string | null;
  assigned_to: string | null;
  defense_notes: string | null;
  ai_risk_summary: string | null;
  ai_defense_strategy: string | null;
  scoring_run_id: string | null;
  tax_year: number;
  created_at: string;
  updated_at: string;
}

export interface ScoringRun {
  id: string;
  county_id: string;
  status: string;
  high_change_threshold: number;
  critical_change_threshold: number;
  total_parcels_scanned: number;
  parcels_flagged: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_by: string;
  error_message: string | null;
  created_at: string;
}

export interface RiskSummary {
  total_flagged: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unqueued: number;
  queued: number;
  in_progress: number;
  ready: number;
  filed: number;
  avg_value_change_pct: number;
  max_value_change_pct: number;
  total_value_at_risk: number;
}

// ── Query Keys ───────────────────────────────────────────────────────
const RISK_SCORES_KEY = ["appeal-risk-scores"];
const RISK_SUMMARY_KEY = ["appeal-risk-summary"];
const SCORING_RUNS_KEY = ["appeal-scoring-runs"];

// ── Read Hooks ───────────────────────────────────────────────────────

/** Fetch risk summary stats */
export function useRiskSummary() {
  return useQuery({
    queryKey: RISK_SUMMARY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_appeal_risk_summary" as "get_revaluation_progress");
      if (error) throw error;
      return data as unknown as RiskSummary;
    },
    staleTime: 30_000,
  });
}

/** Fetch risk scores with optional filters */
export function useRiskScores(filters?: { tier?: RiskTier; status?: DefenseStatus; limit?: number }) {
  return useQuery({
    queryKey: [...RISK_SCORES_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from("appeal_risk_scores")
        .select("*")
        .order("risk_score", { ascending: false });

      if (filters?.tier) query = query.eq("risk_tier", filters.tier);
      if (filters?.status) query = query.eq("defense_status", filters.status);
      if (filters?.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AppealRiskScore[];
    },
    staleTime: 15_000,
  });
}

/** Fetch scoring runs */
export function useScoringRuns() {
  return useQuery({
    queryKey: SCORING_RUNS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appeal_risk_scoring_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as unknown as ScoringRun[];
    },
    staleTime: 30_000,
  });
}

// ── Write Hooks ──────────────────────────────────────────────────────

/** Run a full risk scoring scan */
export function useRunRiskScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { countyId?: string; highThreshold?: number; criticalThreshold?: number }) => {
      const { data, error } = await supabase.functions.invoke("appeal-risk-scorer", {
        body: {
          action: "scan",
          countyId: params.countyId,
          highThreshold: params.highThreshold || 15,
          criticalThreshold: params.criticalThreshold || 30,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await emitTraceEventAsync({
        sourceModule: "dais",
        eventType: "data_exported",
        eventData: { action: "appeal_risk_scan", ...data },
      });

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: RISK_SCORES_KEY });
      qc.invalidateQueries({ queryKey: RISK_SUMMARY_KEY });
      qc.invalidateQueries({ queryKey: SCORING_RUNS_KEY });
      toast.success(`Risk scan complete: ${data.flagged} parcels flagged (${data.critical} critical, ${data.high} high)`);
    },
    onError: (err: Error) => {
      toast.error("Risk scan failed", { description: err.message });
    },
  });
}

/** Run AI analysis on specific parcels */
export function useAIAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (parcelIds: string[]) => {
      const { data, error } = await supabase.functions.invoke("appeal-risk-scorer", {
        body: { action: "analyze", parcelIds },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RISK_SCORES_KEY });
      toast.success("AI defense analysis complete");
    },
    onError: (err: Error) => {
      toast.error("AI analysis failed", { description: err.message });
    },
  });
}

/** Update defense status */
export function useUpdateDefenseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scoreId, status, assignedTo, notes }: {
      scoreId: string;
      status: DefenseStatus;
      assignedTo?: string;
      notes?: string;
    }) => {
      const updates: Record<string, unknown> = {
        defense_status: status,
        updated_at: new Date().toISOString(),
      };
      if (assignedTo !== undefined) updates.assigned_to = assignedTo;
      if (notes !== undefined) updates.defense_notes = notes;

      const { error } = await supabase
        .from("appeal_risk_scores")
        .update(updates as any)
        .eq("id", scoreId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RISK_SCORES_KEY });
      qc.invalidateQueries({ queryKey: RISK_SUMMARY_KEY });
    },
  });
}

/** Bulk queue parcels for defense prep */
export function useBulkQueueDefense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scoreIds: string[]) => {
      const { error } = await supabase
        .from("appeal_risk_scores")
        .update({ defense_status: "queued", updated_at: new Date().toISOString() } as any)
        .in("id", scoreIds);
      if (error) throw error;

      await emitTraceEventAsync({
        sourceModule: "dais",
        eventType: "data_exported",
        eventData: { action: "bulk_queue_defense", count: scoreIds.length },
      });
    },
    onSuccess: (_, ids) => {
      qc.invalidateQueries({ queryKey: RISK_SCORES_KEY });
      qc.invalidateQueries({ queryKey: RISK_SUMMARY_KEY });
      toast.success(`${ids.length} parcels queued for defense prep`);
    },
  });
}
