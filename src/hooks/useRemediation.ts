// TerraFusion OS — Remediation Hook (Phase 67)
// "I applied the fix and the database smiled at me" — Ralph Wiggum, Data Whisperer

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────

export interface ProposedFix {
  id: string;
  issue_id: string;
  county_id: string;
  parcel_id: string | null;
  target_table: string;
  target_column: string;
  current_value: string | null;
  proposed_value: string | null;
  fix_method: string;
  fix_tier: string;
  confidence: number | null;
  explanation: string | null;
  source_trust: string | null;
  status: string;
  batch_id: string | null;
  applied_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface RemediationBatch {
  id: string;
  county_id: string;
  batch_name: string;
  lane: string;
  fix_tier: string;
  total_fixes: number;
  applied_count: number;
  rejected_count: number;
  rolled_back_count: number;
  status: string;
  applied_at: string | null;
  rolled_back_at: string | null;
  quality_score_before: number | null;
  quality_score_after: number | null;
  rollback_manifest: any;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────

async function invokeRemediation(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("data-quality-remediation", { body });
  if (error) throw error;
  if (data?.error && !data?.ok) throw new Error(data.error);
  return data;
}

const QUERY_KEY = ["dq-remediation"];

// ── Hooks ──────────────────────────────────────────────────────

/** Fetch proposed fixes (optionally filtered by issue, lane, or status) */
export function useProposedFixes(countyId: string | undefined, filters?: {
  issueId?: string;
  lane?: string;
  status?: string;
}) {
  return useQuery<ProposedFix[]>({
    queryKey: [...QUERY_KEY, "fixes", countyId, filters],
    queryFn: async () => {
      if (!countyId) throw new Error("No county");
      const res = await invokeRemediation({
        action: "get_fixes",
        county_id: countyId,
        issue_id: filters?.issueId,
        lane: filters?.lane,
        status: filters?.status,
      });
      return res.fixes || [];
    },
    enabled: !!countyId,
    staleTime: 15_000,
  });
}

/** Fetch remediation batch history */
export function useRemediationBatches(countyId: string | undefined) {
  return useQuery<RemediationBatch[]>({
    queryKey: [...QUERY_KEY, "batches", countyId],
    queryFn: async () => {
      if (!countyId) throw new Error("No county");
      const res = await invokeRemediation({
        action: "get_batches",
        county_id: countyId,
      });
      return res.batches || [];
    },
    enabled: !!countyId,
    staleTime: 30_000,
  });
}

/** Generate fixes for a specific issue */
export function useGenerateFixes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ countyId, issueId }: { countyId: string; issueId: string }) =>
      invokeRemediation({ action: "generate_fixes", county_id: countyId, issue_id: issueId }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Fixes generated", {
        description: `${data.fixes_generated} proposed fixes ready for review`,
      });
    },
    onError: (err: any) => toast.error("Fix generation failed", { description: err.message }),
  });
}

/** Apply a batch of fixes */
export function useApplyBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { countyId: string; fixIds: string[]; batchName?: string; lane?: string }) =>
      invokeRemediation({
        action: "apply_batch",
        county_id: params.countyId,
        fix_ids: params.fixIds,
        batch_name: params.batchName,
        lane: params.lane,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["data-doctor-status"] });
      toast.success("Batch applied", {
        description: `${data.applied} fixes applied, ${data.rejected} rejected`,
      });
    },
    onError: (err: any) => toast.error("Batch apply failed", { description: err.message }),
  });
}

/** Rollback a batch */
export function useRollbackBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { countyId: string; batchId: string }) =>
      invokeRemediation({
        action: "rollback_batch",
        county_id: params.countyId,
        batch_id: params.batchId,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["data-doctor-status"] });
      toast.success("Batch rolled back", {
        description: `${data.rolled_back} of ${data.total_entries} fixes reversed`,
      });
    },
    onError: (err: any) => toast.error("Rollback failed", { description: err.message }),
  });
}

/** Approve or reject a single fix */
export function useReviewFix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { countyId: string; fixId: string; approve: boolean }) =>
      invokeRemediation({
        action: params.approve ? "approve_fix" : "reject_fix",
        county_id: params.countyId,
        fix_id: params.fixId,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(data.status === "approved" ? "Fix approved" : "Fix rejected");
    },
    onError: (err: any) => toast.error("Review failed", { description: err.message }),
  });
}
