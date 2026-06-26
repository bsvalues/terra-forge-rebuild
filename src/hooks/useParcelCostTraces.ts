// TerraFusion OS — Phase 210: Parcel Cost Traces Hook
// Queries costforge_calc_trace for a given parcel, ordered newest-first.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CalcTraceRow } from "@/services/costforgeConnector";

export type { CalcTraceRow };

export function useParcelCostTraces(parcelId: string | null) {
  return useQuery({
    queryKey: ["parcel-cost-traces", parcelId],
    enabled: !!parcelId,
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("costforge_calc_trace")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("calc_run_at", { ascending: false })
        .limit(10);
      if (error) throw new Error(error.message);
      return (data ?? []) as CalcTraceRow[];
    },
  });
}
