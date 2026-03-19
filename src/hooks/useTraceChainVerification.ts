// TerraFusion OS — Phase 81: Trace Chain Verification Hook
// Calls verify_trace_chain RPC to validate hash-chain integrity.
// Query Key: ["trace-chain-verification", countyId] • Stale: 30s

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ChainVerificationResult {
  total_checked: number;
  chain_valid: boolean;
  first_broken_sequence: number | null;
  first_broken_id: string | null;
}

/**
 * Verify the hash-chain integrity of trace_events for the current county.
 */
export function useTraceChainVerification(countyId?: string, limit = 100) {
  return useQuery<ChainVerificationResult | null>({
    queryKey: ["trace-chain-verification", countyId, limit],
    queryFn: async () => {
      if (!countyId) return null;

      const { data, error } = await supabase.rpc("verify_trace_chain", {
        p_county_id: countyId,
        p_limit: limit,
      });

      if (error) throw error;
      // RPC returns a single-row table
      const row = Array.isArray(data) ? data[0] : data;
      return row as ChainVerificationResult;
    },
    enabled: !!countyId,
    staleTime: 30_000,
  });
}

/**
 * Redact a trace event (admin-only). Preserves event shell, clears PII.
 */
export function useRedactTraceEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await supabase.rpc("redact_trace_event", {
        p_event_id: eventId,
      });
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["terra-trace-feed"] });
      qc.invalidateQueries({ queryKey: ["trace-chain-verification"] });
      qc.invalidateQueries({ queryKey: ["trust-registry-events"] });
    },
  });
}
