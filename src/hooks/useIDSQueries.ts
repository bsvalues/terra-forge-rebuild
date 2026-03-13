// TerraFusion OS — IDS Domain Query Hooks
// Data Constitution: centralized queries for Routing, Versions, Pipeline Events

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ---- Pipeline Events (Routing Pillar) ----

export function usePipelineEvents(limit = 20) {
  return useQuery({
    queryKey: ["routing-pipeline-events", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("pipeline_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    },
  });
}

// ---- Ingest Jobs (Versions Pillar) ----

export function useIngestJobsHistory(limit = 20) {
  return useQuery({
    queryKey: ["versions-ingest-jobs", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("ingest_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    },
  });
}

// ---- Study Period Snapshots (Versions Pillar) ----

export function useStudyPeriodSnapshots(limit = 10) {
  return useQuery({
    queryKey: ["versions-study-periods", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("study_periods")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    },
  });
}

// ---- Neighborhood Codes (legacy fallback for NeighborhoodSelector) ----

export function useLegacyNeighborhoodCodes(enabled: boolean) {
  return useQuery({
    queryKey: ["factory-neighborhoods-legacy"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parcels")
        .select("neighborhood_code")
        .not("neighborhood_code", "is", null)
        .order("neighborhood_code");
      return [...new Set((data || []).map((p) => p.neighborhood_code!))];
    },
    staleTime: 120_000,
    enabled,
  });
}
