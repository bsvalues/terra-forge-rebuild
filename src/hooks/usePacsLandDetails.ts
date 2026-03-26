import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PacsLandDetail {
  id: string;
  county_id: string;
  prop_id: number;
  prop_val_yr: number;
  sup_num: number | null;
  land_seg_id: number | null;
  land_type_cd: string | null;
  land_class_code: string | null;
  land_soil_code: string | null;
  land_acres: number | null;
  land_sqft: number | null;
  land_adj_factor: number | null;
  num_lots: number | null;
  land_unit_price: number | null;
  land_val: number | null;
  ag_val: number | null;
  ag_use_val: number | null;
  market_schedule: string | null;
  ag_schedule: string | null;
}

export function usePacsLandDetails(propId: number | null) {
  return useQuery({
    queryKey: ["pacs-land-details", propId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pacs_land_details")
        .select("*")
        .eq("prop_id", propId!)
        .order("prop_val_yr", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PacsLandDetail[];
    },
    enabled: !!propId,
    staleTime: 60000,
  });
}
