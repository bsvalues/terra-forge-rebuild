// TerraFusion OS — Trace Events Hook
// Extracts direct supabase queries from TerraTraceActivityFeed (Data Constitution)

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTraceEvents(parcelId?: string | null, limit = 20) {
  return useQuery({
    queryKey: ["terra-trace-feed", parcelId, limit],
    queryFn: async () => {
      let query = supabase
        .from("trace_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (parcelId) {
        query = query.eq("parcel_id", parcelId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLegacyModelReceipts(parcelId?: string | null, limit = 20) {
  return useQuery({
    queryKey: ["terra-trace-legacy", parcelId, limit],
    queryFn: async () => {
      let query = supabase
        .from("model_receipts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (parcelId) {
        query = query.eq("parcel_id", parcelId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

// ────────────────────────────────────────────────────────────
// Filtered query for AuditTimeline (Phase 81.3)
// ────────────────────────────────────────────────────────────

export interface TraceEventsFilter {
  countyId?: string;
  sourceModule?: string;
  eventType?: string;
  parcelId?: string;
  limit?: number;
}

export function useTraceEventsFiltered(filter: TraceEventsFilter = {}) {
  const { countyId, sourceModule, eventType, parcelId, limit = 100 } = filter;
  return useQuery({
    queryKey: ["trace-events-filtered", countyId, sourceModule, eventType, parcelId, limit],
    queryFn: async () => {
       
      let q: any = supabase
        .from("trace_events")
        .select(
          "id, created_at, source_module, event_type, event_data, parcel_id, actor_id, sequence_number, event_hash, prev_hash, agent_id, redacted, correlation_id"
        )
        .order("sequence_number", { ascending: false, nullsFirst: false })
        .limit(limit);

      if (countyId) q = q.eq("county_id", countyId);
      if (sourceModule) q = q.eq("source_module", sourceModule);
      if (eventType) q = q.ilike("event_type", `%${eventType}%`);
      if (parcelId) q = q.ilike("parcel_id", `%${parcelId}%`);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10_000,
  });
}

export function useTraceRealtimeSubscription(parcelId?: string | null, limit = 20) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("trace-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trace_events",
          ...(parcelId ? { filter: `parcel_id=eq.${parcelId}` } : {}),
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["terra-trace-feed", parcelId, limit] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parcelId, limit, queryClient]);
}
