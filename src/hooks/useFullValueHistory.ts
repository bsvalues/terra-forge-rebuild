// TerraFusion OS — Full Value History Hook
// Queries vw_full_value_history — the unified Ascend (pre-2015) + PACS (2015+) timeline.
// View created in migration: 20260323160000_ascend_staging_tables.sql

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ValueHistoryPoint {
  parcel_id: string;
  parcel_number: string;
  roll_year: number;
  land_value: number | null;
  impr_value: number | null;
  total_value: number | null;
  taxable_value: number | null;
  source_system: "ascend" | "pacs";
}

/**
 * Fetches the full unified value timeline for a parcel from `vw_full_value_history`.
 * Covers Ascend pre-2015 and PACS 2015+ in a single sorted series.
 */
export function useFullValueHistory(parcelId: string | null, countyId?: string) {
  return useQuery<ValueHistoryPoint[]>({
    queryKey: ["full-value-history", parcelId, countyId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("vw_full_value_history")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("roll_year", { ascending: true });

      if (countyId) q = q.eq("county_id", countyId);

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as ValueHistoryPoint[];
    },
    enabled: !!parcelId,
    staleTime: 5 * 60 * 1000,
  });
}
