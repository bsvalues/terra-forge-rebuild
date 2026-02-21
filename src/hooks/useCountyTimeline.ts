// TerraFusion OS — County Timeline Hook (Constitutional Data Layer)
// Query Key: ["county-timeline", from, to, types, search]
// Per DATA_CONSTITUTION: no supabase.from() in components.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TimelineEvent {
  id: string;
  event_time: string;
  event_type: "ingest" | "mission" | "fix" | "model" | "workflow";
  subtype: string;
  title: string;
  summary: string;
  actor: string;
  links: Record<string, string | null>;
  sources: string[];
  confidence: string | null;
  confidence_reason: string | null;
  metadata: Record<string, unknown> | null;
  severity: "info" | "warn" | "critical";
}

export interface TimelineResult {
  total: number;
  from: string;
  to: string;
  limit: number;
  offset: number;
  rows: TimelineEvent[];
}

export type TimelineRange = "1h" | "24h" | "7d" | "30d" | "all";

function rangeToDate(range: TimelineRange): string {
  if (range === "all") {
    return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  }
  const ms: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() - ms[range]).toISOString();
}

interface UseCountyTimelineOptions {
  range?: TimelineRange;
  types?: string[] | null;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useCountyTimeline({
  range = "7d",
  types = null,
  search = "",
  limit = 100,
  offset = 0,
}: UseCountyTimelineOptions = {}) {
  return useQuery<TimelineResult>({
    queryKey: ["county-timeline", range, types, search, limit, offset],
    queryFn: async () => {
      const from = rangeToDate(range);
      const to = new Date().toISOString();

      const { data, error } = await supabase.rpc("get_county_timeline" as any, {
        p_from: from,
        p_to: to,
        p_types: types,
        p_search: search || null,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw error;
      return data as unknown as TimelineResult;
    },
    staleTime: 15_000,
  });
}
