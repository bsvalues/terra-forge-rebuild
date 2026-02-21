// TerraFusion OS — Causal Mini-Narrative Hook
// Fetches Before→Event→After chain for a selected timeline event.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TimelineEvent } from "./useCountyTimeline";

export interface CausalNarrative {
  before: TimelineEvent | null;
  after: TimelineEvent | null;
}

export function useCausalNarrative(event: TimelineEvent | null) {
  return useQuery<CausalNarrative>({
    queryKey: ["causal-narrative", event?.id],
    queryFn: async (): Promise<CausalNarrative> => {
      if (!event) return { before: null, after: null };

      const eventTime = event.event_time;

      // Fetch events in a ±15 minute window around the event
      const { data, error } = await supabase.rpc("get_county_timeline" as any, {
        p_from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        p_to: new Date().toISOString(),
        p_types: null,
        p_search: null,
        p_limit: 20,
        p_offset: 0,
        p_link_key: null,
        p_link_value: null,
        p_window_center: eventTime,
        p_window_minutes: 15,
      });

      if (error) throw error;

      const result = data as any;
      const rows: TimelineEvent[] = result?.rows ?? [];

      // Find events before and after the current one
      const eventTimeMs = new Date(eventTime).getTime();
      let before: TimelineEvent | null = null;
      let after: TimelineEvent | null = null;

      for (const row of rows) {
        if (row.id === event.id) continue;
        const rowTime = new Date(row.event_time).getTime();

        if (rowTime < eventTimeMs) {
          // Closest before
          if (!before || rowTime > new Date(before.event_time).getTime()) {
            before = row;
          }
        } else if (rowTime > eventTimeMs) {
          // Closest after
          if (!after || rowTime < new Date(after.event_time).getTime()) {
            after = row;
          }
        }
      }

      return { before, after };
    },
    enabled: !!event,
    staleTime: 60_000,
  });
}
