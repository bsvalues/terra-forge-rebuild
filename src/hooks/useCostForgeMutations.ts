import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { CalcTraceRow } from '@/services/costforgeConnector'

/** Fields required when inserting a new calc trace row */
export type CalcTraceInsert = Omit<CalcTraceRow, "id" | "calc_run_at">;

/**
 * Save a draft CostForge calc trace row and emit a TerraTrace audit event.
 */
export function useSaveCalcTrace() {
  return useMutation({
    mutationFn: async (trace: Record<string, unknown>) => {
      const { data, error } = await (supabase as any).from('costforge_calc_trace').insert([trace])
      if (error) throw error
      return data
    },
  })
}

export default useSaveCalcTrace;
