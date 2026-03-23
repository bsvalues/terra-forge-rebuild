import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../supabase/client'

export function useSaveCalcTrace() {
  return useMutation(async (trace: any) => {
    const { data, error } = await (supabase as any).from('costforge_calc_trace').insert([trace])
    if (error) throw error
    return data
  })
}

export default useSaveCalcTrace
