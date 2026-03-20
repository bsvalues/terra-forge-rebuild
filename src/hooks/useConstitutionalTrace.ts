// TerraFusion OS — Constitutional Traceability Hook (Phase 62)
// Provides value lineage, write-lane violations, and appeal audit trail data.
// Per DATA_CONSTITUTION: no supabase.from() in components.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────

export interface ValueLineageEntry {
  id: string;
  parcel_id: string;
  event_type: string;
  source_module: string;
  value_before: Record<string, any>;
  value_after: Record<string, any>;
  delta_amount: number | null;
  delta_pct: number | null;
  reason: string | null;
  pipeline_stage: string | null;
  source_system: string;
  pipeline_version: string;
  lineage_hash: string | null;
  created_at: string;
}

export interface WriteLaneViolation {
  id: string;
  attempted_module: string;
  target_domain: string;
  expected_owner: string;
  violation_type: string;
  context: Record<string, any>;
  created_at: string;
}

export interface AppealAuditEntry {
  appeal_id: string;
  parcel_id: string;
  appeal_status: string;
  appeal_date: string;
  original_value: number;
  requested_value: number | null;
  final_value: number | null;
  resolution_type: string | null;
  appeal_notes: string | null;
  tax_year: number | null;
  status_change_id: string | null;
  previous_status: string | null;
  new_status: string | null;
  change_reason: string | null;
  status_changed_at: string | null;
  adjustment_id: string | null;
  adjustment_type: string | null;
  adj_previous_value: number | null;
  adj_new_value: number | null;
  adj_reason: string | null;
  adj_applied_at: string | null;
}

// ── Value Lineage ──────────────────────────────────────────────────

export function useValueLineage(parcelId?: string, limit = 50) {
  return useQuery<ValueLineageEntry[]>({
    queryKey: ["constitutional-lineage", parcelId, limit],
    queryFn: async () => {
      let query = supabase
        .from("slco_value_lineage")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (parcelId) {
        query = query.eq("parcel_id", parcelId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ValueLineageEntry[];
    },
    staleTime: 15_000,
  });
}

// ── Write-Lane Violations ──────────────────────────────────────────

export function useWriteLaneViolations(limit = 50) {
  return useQuery<WriteLaneViolation[]>({
    queryKey: ["write-lane-violations", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("write_lane_violations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as unknown as WriteLaneViolation[];
    },
    staleTime: 15_000,
  });
}

export function useLogWriteLaneViolation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (violation: {
      attempted_module: string;
      target_domain: string;
      expected_owner: string;
      violation_type?: string;
      context?: Record<string, any>;
    }) => {
      const { error } = await supabase
        .from("write_lane_violations")
        .insert([{
          attempted_module: violation.attempted_module,
          target_domain: violation.target_domain,
          expected_owner: violation.expected_owner,
          violation_type: violation.violation_type ?? "boundary_cross",
          context: (violation.context ?? {}) as Record<string, string>,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["write-lane-violations"] });
    },
  });
}

// ── Appeal Audit Trail ─────────────────────────────────────────────

export function useAppealAuditTrail(parcelId?: string, limit = 50) {
  return useQuery<AppealAuditEntry[]>({
    queryKey: ["appeal-audit-trail", parcelId, limit],
    queryFn: async () => {
      let query = supabase
        .from("appeal_audit_trail")
        .select("*")
        .limit(limit);

      if (parcelId) {
        query = query.eq("parcel_id", parcelId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AppealAuditEntry[];
    },
    staleTime: 15_000,
  });
}

// ── Lineage Summary ────────────────────────────────────────────────

export function useLineageSummary(limit = 100) {
  return useQuery({
    queryKey: ["slco-lineage-summary", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("slco_lineage_summary")
        .select("*")
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 15_000,
  });
}
