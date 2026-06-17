// useQuarantine — admin review hook for the data_quarantine spine.
// Lists pending rows, allows mark-as-reviewed / restored / discarded.
//
// 🪖 The jar with the air holes finally has a label maker.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCountyId } from "@/hooks/useActiveCounty";
import type { QuarantineSeverity, QuarantineStatus, QuarantineReasonCode } from "@/services/quarantine";

export interface QuarantineRow {
  id: string;
  county_id: string;
  source: string;
  source_product: string | null;
  reason_code: QuarantineReasonCode;
  reason_detail: string | null;
  severity: QuarantineSeverity;
  status: QuarantineStatus;
  payload: Record<string, unknown>;
  payload_hash: string;
  trace_event_id: string | null;
  created_at: string;
  updated_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface QuarantineFilters {
  status?: QuarantineStatus;
  severity?: QuarantineSeverity;
  source?: string;
  limit?: number;
}

export function useQuarantineList(filters: QuarantineFilters = {}) {
  const countyId = useActiveCountyId();
  const { status = "pending", severity, source, limit = 100 } = filters;

  return useQuery({
    queryKey: ["quarantine", countyId, status, severity, source, limit],
    enabled: !!countyId,
    queryFn: async (): Promise<QuarantineRow[]> => {
      let q = (supabase as any)
        .from("data_quarantine")
        .select("*")
        .eq("county_id", countyId)
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (severity) q = q.eq("severity", severity);
      if (source) q = q.eq("source", source);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as QuarantineRow[];
    },
    staleTime: 15_000,
  });
}

export function useQuarantineCounts() {
  const countyId = useActiveCountyId();
  return useQuery({
    queryKey: ["quarantine-counts", countyId],
    enabled: !!countyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("data_quarantine")
        .select("status, severity")
        .eq("county_id", countyId);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ status: QuarantineStatus; severity: QuarantineSeverity }>;
      return {
        total: rows.length,
        pending: rows.filter((r) => r.status === "pending").length,
        critical: rows.filter((r) => r.severity === "critical" && r.status === "pending").length,
        warning: rows.filter((r) => r.severity === "warning" && r.status === "pending").length,
      };
    },
    staleTime: 30_000,
  });
}

export function useQuarantineMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: QuarantineStatus }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from("data_quarantine")
        .update({
          status: input.status,
          reviewed_by: userRes.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quarantine"] });
      qc.invalidateQueries({ queryKey: ["quarantine-counts"] });
    },
  });
}
