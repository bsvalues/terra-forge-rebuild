import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ParcelBridge {
  geo_id: string | null;
  parcel_number: string | null;
}

/**
 * Resolve a Supabase parcel UUID to its parcel_number.
 * The prop_id column has been removed.
 */
export function usePacsParcelBridge(parcelId: string | null) {
  return useQuery({
    queryKey: ["pacs-parcel-bridge", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select("parcel_number")
        .eq("id", parcelId!)
        .single();
      if (error) throw error;
      return {
        geo_id: data?.parcel_number ?? null,
        parcel_number: data?.parcel_number ?? null,
      } as ParcelBridge;
    },
    enabled: !!parcelId,
    staleTime: 300000,
  });
}

/**
 * Resolve a parcel_number (geo_id string) to Supabase parcel UUID.
 * The prop_id column has been removed.
 */
export function usePacsBridgeByParcelNumber(parcelNumber: string | null) {
  return useQuery({
    queryKey: ["pacs-bridge-by-number", parcelNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select("id, parcel_number")
        .eq("parcel_number", parcelNumber!)
        .single();
      if (error) throw error;
      return {
        parcelId: data?.id ?? null,
        parcel_number: data?.parcel_number ?? null,
      };
    },
    enabled: !!parcelNumber,
    staleTime: 300000,
  });
}