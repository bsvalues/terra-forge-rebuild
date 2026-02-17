// TerraFusion OS — Trust Events Hook (Constitutional Data Layer)
// Provides trace_events data for the Trust Registry.
// Query Key: ["trust-registry-events"] • Stale: 15s
// Per DATA_CONSTITUTION: no supabase.from() in components.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TraceEvent {
  id: string;
  created_at: string;
  source_module: string;
  event_type: string;
  event_data: Record<string, any> | null;
  parcel_id: string | null;
  artifact_type: string | null;
}

async function fetchTrustEvents(): Promise<TraceEvent[]> {
  const { data, error } = await supabase
    .from("trace_events")
    .select("id, created_at, source_module, event_type, event_data, parcel_id, artifact_type")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as TraceEvent[];
}

export function useTrustEvents() {
  return useQuery<TraceEvent[]>({
    queryKey: ["trust-registry-events"],
    queryFn: fetchTrustEvents,
    staleTime: 15_000,
  });
}
