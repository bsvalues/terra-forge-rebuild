// TerraFusion OS — Year-Scoped Neighborhood List Hook
// Pulls from the neighborhoods dimension table (year-versioned)

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Neighborhood {
  hood_cd: string;
  hood_name: string | null;
  year: number;
}

/**
 * Fetches year-scoped neighborhoods.
 * Uses CURRENT_YEAR identity mode by default (prop_id only, sup_num ignored).
 */
export function useNeighborhoodYear(year?: number) {
  const effectiveYear = year ?? new Date().getFullYear();

  return useQuery<Neighborhood[]>({
    queryKey: ["neighborhoods-year", effectiveYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("neighborhoods" as any)
        .select("hood_cd, hood_name, year")
        .eq("year", effectiveYear)
        .order("hood_cd");

      if (error) throw error;
      return (data as unknown as Neighborhood[]) ?? [];
    },
    staleTime: 120_000,
  });
}
