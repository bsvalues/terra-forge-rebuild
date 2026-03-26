import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ParcelBridge {
  prop_id: number | null;
  geo_id: string | null;
  parcel_number: string | null;
}

/**
 * Resolve a Supabase parcel UUID to its PACS prop_id.
 * Uses the parcels.prop_id column (backfilled from pacs_assessment_roll).
 */
export function usePacsParcelBridge(parcelId: string | null) {
  return useQuery({
    queryKey: ["pacs-parcel-bridge", parcelId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("parcels")
        .select("prop_id, parcel_number")
        .eq("id", parcelId!)
        .single();
      if (error) throw error;
      return {
        prop_id: data?.prop_id ?? null,
        geo_id: data?.parcel_number ?? null,
        parcel_number: data?.parcel_number ?? null,
      } as ParcelBridge;
    },
    enabled: !!parcelId,
    staleTime: 300000, // prop_id mapping rarely changes
  });
}

/**
 * Resolve a parcel_number (geo_id string) to prop_id + Supabase parcel UUID.
 */
export function usePacsBridgeByParcelNumber(parcelNumber: string | null) {
  return useQuery({
    queryKey: ["pacs-bridge-by-number", parcelNumber],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("parcels")
        .select("id, prop_id, parcel_number")
        .eq("parcel_number", parcelNumber!)
        .single();
      if (error) throw error;
      return {
        parcelId: data?.id ?? null,
        prop_id: data?.prop_id ?? null,
        parcel_number: data?.parcel_number ?? null,
      };
    },
    enabled: !!parcelNumber,
    staleTime: 300000,
  });
}
