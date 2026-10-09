import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { emitTraceEventAsync } from '@/services/terraTrace'
import type { CalcTraceRow } from '@/services/costforgeConnector'

/** Fields required when inserting a new calc trace row */
export type CalcTraceInsert = Omit<CalcTraceRow, "id" | "calc_run_at">;

/**
 * Save a draft CostForge calc trace row and emit a TerraTrace audit event.
 */
export function useSaveCalcTrace() {
  return useMutation({
    mutationFn: async (trace: CalcTraceInsert | Record<string, unknown>) => {
      const { data, error } = await (supabase as any)
        .from("costforge_calc_trace")
        .insert([trace])
        .select()
        .single();
      if (error) throw new Error(error.message ?? "Failed to save calc trace");
      return data as CalcTraceRow;
    },
    // TerraTrace: CostForge saves are valuation artifacts owned by TerraForge.
    onSuccess: (row: CalcTraceRow | null, vars: CalcTraceInsert | Record<string, unknown>) => {
      const v = vars as Record<string, unknown>;
      emitTraceEventAsync({
        parcelId: (v.parcel_id as string | null) ?? undefined,
        sourceModule: "forge",
        eventType: "model_run_completed",
        artifactType: "assessment",
        artifactId: (row as { id?: string } | null)?.id,
        eventData: {
          kind: "costforge_calc_trace",
          calc_year: v.calc_year,
          rcn: v.rcn,
          rcnld: v.rcnld,
          calc_method: v.calc_method,
        },
      } as any);
    },
  });
}

export default useSaveCalcTrace;
