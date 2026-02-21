// TerraFusion OS — "What changed today?" summary counts
// Lightweight hook that queries the county timeline RPC for today's event type counts.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TodaySummary {
  imports: number;
  missions: number;
  fixes: number;
  models: number;
  workflows: number;
  total: number;
}

export function useTodaySummary() {
  return useQuery<TodaySummary>({
    queryKey: ["county-today-summary"],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase.rpc("get_county_timeline" as any, {
        p_from: todayStart.toISOString(),
        p_to: new Date().toISOString(),
        p_types: null,
        p_search: null,
        p_limit: 1000,
        p_offset: 0,
      });

      if (error) throw error;

      const result = data as any;
      const rows: any[] = result?.rows ?? [];

      const counts: TodaySummary = {
        imports: 0,
        missions: 0,
        fixes: 0,
        models: 0,
        workflows: 0,
        total: rows.length,
      };

      for (const row of rows) {
        switch (row.event_type) {
          case "ingest": counts.imports++; break;
          case "mission": counts.missions++; break;
          case "fix": counts.fixes++; break;
          case "model": counts.models++; break;
          case "workflow": counts.workflows++; break;
        }
      }

      return counts;
    },
    staleTime: 30_000,
  });
}
