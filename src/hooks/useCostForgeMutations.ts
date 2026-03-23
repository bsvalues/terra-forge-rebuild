import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, fromAny } from "@/integrations/supabase/client";
import { emitTraceEventAsync } from "@/services/terraTrace";
import type { CalcTraceRow } from "@/services/costforgeConnector";

/** Fields required when inserting a new calc trace row */
export type CalcTraceInsert = Omit<CalcTraceRow, "id" | "calc_run_at">;

/**
 * Save a draft CostForge calc trace row and emit a TerraTrace audit event.
 */
export function useSaveCalcTrace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (trace: CalcTraceInsert) => {
      const { data, error } = await fromAny("costforge_calc_trace")
        .insert([trace])
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (_data, variables) => {
      // Invalidate any calc-trace queries so UI refreshes
      qc.invalidateQueries({ queryKey: ["costforge-calc-trace"] });

      // Fire-and-forget TerraTrace event
      emitTraceEventAsync({
        parcelId: variables.parcel_id ?? undefined,
        sourceModule: "forge",
        eventType: "model_run_completed",
        artifactType: "assessment",
        artifactId: _data.id,
        eventData: {
          action: "draft_valuation_saved",
          rcnld: variables.rcnld,
          area_sqft: variables.area_sqft,
          calc_year: variables.calc_year,
          imprv_type_cd: variables.imprv_type_cd,
        },
      });
    },
  });
}

export default useSaveCalcTrace;
