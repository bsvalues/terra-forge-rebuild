// TerraFusion OS — Causal Mini-Narrative Hook
// Fetches Before→Event→After chain for a selected timeline event.
// Prefers events sharing the same link key (exact causal chain)
// before falling back to time-nearest events.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TimelineEvent } from "./useCountyTimeline";

export interface CausalNarrative {
  before: TimelineEvent | null;
  after: TimelineEvent | null;
  /** Which link key was used to match the chain, if any */
  matchedBy: string | null;
}

/** Find the strongest non-null link key from an event */
function pickStrongestLinkKey(event: TimelineEvent): { key: string; value: string } | null {
  if (!event.links) return null;
  // Priority order: receipt_id > ingest_job_id > mission_id > run_id > parcel_id
  const priority = ["receipt_id", "ingest_job_id", "mission_id", "run_id", "parcel_id"];
  for (const key of priority) {
    const val = event.links[key];
    if (val) return { key, value: val };
  }
  // Fallback: any non-null link
  for (const [key, val] of Object.entries(event.links)) {
    if (val) return { key, value: val };
  }
  return null;
}

export function useCausalNarrative(event: TimelineEvent | null) {
  return useQuery<CausalNarrative>({
    queryKey: ["causal-narrative", event?.id],
    queryFn: async (): Promise<CausalNarrative> => {
      if (!event) return { before: null, after: null, matchedBy: null };

      const eventTime = event.event_time;
      const eventTimeMs = new Date(eventTime).getTime();

      // Strategy 1: Try link-key-based causal chain first
      const linkKey = pickStrongestLinkKey(event);

      if (linkKey) {
        const { data: linkedData } = await (supabase.rpc as Function)("get_county_timeline", {
          p_from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          p_to: new Date().toISOString(),
          p_types: null,
          p_search: null,
          p_limit: 20,
          p_offset: 0,
          p_link_key: linkKey.key,
          p_link_value: linkKey.value,
          p_window_center: null,
          p_window_minutes: 10,
        });

        const linkedResult = linkedData as unknown as { rows?: TimelineEvent[] };
        const linkedRows: TimelineEvent[] = linkedResult?.rows ?? [];

        if (linkedRows.length > 1) {
          let before: TimelineEvent | null = null;
          let after: TimelineEvent | null = null;

          for (const row of linkedRows) {
            if (row.id === event.id) continue;
            const rowTime = new Date(row.event_time).getTime();

            if (rowTime < eventTimeMs) {
              if (!before || rowTime > new Date(before.event_time).getTime()) before = row;
            } else if (rowTime > eventTimeMs) {
              if (!after || rowTime < new Date(after.event_time).getTime()) after = row;
            }
          }

          // If we found at least one related event, return this chain
          if (before || after) return { before, after, matchedBy: linkKey.key };
        }
      }

      // Strategy 2: Fallback to ±15 minute time window
      const { data, error } = await supabase.rpc("get_county_timeline" as "get_revaluation_progress", {
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

      const result = data as unknown as { rows?: TimelineEvent[] };
      const rows: TimelineEvent[] = result?.rows ?? [];

      let before: TimelineEvent | null = null;
      let after: TimelineEvent | null = null;

      for (const row of rows) {
        if (row.id === event.id) continue;
        const rowTime = new Date(row.event_time).getTime();

        if (rowTime < eventTimeMs) {
          if (!before || rowTime > new Date(before.event_time).getTime()) before = row;
        } else if (rowTime > eventTimeMs) {
          if (!after || rowTime < new Date(after.event_time).getTime()) after = row;
        }
      }

      return { before, after, matchedBy: null };
    },
    enabled: !!event,
    staleTime: 60_000,
  });
}
