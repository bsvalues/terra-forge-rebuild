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
      return (data || []) as any[];
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
