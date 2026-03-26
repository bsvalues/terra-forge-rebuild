import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PropertyProfileRow {
  id: string;
  prop_id: number;
  prop_val_yr: number;
  sup_num: number;
  // Classification
  class_cd: string | null;
  state_cd: string | null;
  property_use_cd: string | null;
  imprv_type_cd: string | null;
  imprv_det_sub_class_cd: string | null;
  num_imprv: number | null;
  // Building
  yr_blt: number | null;
  actual_year_built: number | null;
  eff_yr_blt: number | null;
  actual_age: number | null;
  living_area: number | null;
  condition_cd: string | null;
  percent_complete: number | null;
  heat_ac_code: string | null;
  class_cd_highvalue_imprv: string | null;
  living_area_highvalue_imprv: number | null;
  // Improvement valuation
  imprv_unit_price: number | null;
  imprv_add_val: number | null;
  appraised_val: number | null;
  // Land measurements
  land_type_cd: string | null;
  land_sqft: number | null;
  land_acres: number | null;
  land_total_acres: number | null;
  land_useable_acres: number | null;
  land_useable_sqft: number | null;
  land_front_feet: number | null;
  land_depth: number | null;
  land_num_lots: number | null;
  land_total_sqft: number | null;
  // Land valuation
  land_unit_price: number | null;
  main_land_unit_price: number | null;
  main_land_total_adj: number | null;
  land_appr_method: string | null;
  ls_table: string | null;
  size_adj_pct: number | null;
  // Geographic
  neighborhood: string | null;
  region: string | null;
  abs_subdv: string | null;
  subset_cd: string | null;
  map_id: string | null;
  sub_market_cd: string | null;
  // Site
  zoning: string | null;
  characteristic_zoning1: string | null;
  characteristic_zoning2: string | null;
  characteristic_view: string | null;
  visibility_access_cd: string | null;
  road_access: string | null;
  utilities: string | null;
  topography: string | null;
  school_id: string | null;
  city_id: string | null;
  last_appraisal_dt: string | null;
  // Mobile home
  mbl_hm_make: string | null;
  mbl_hm_model: string | null;
  mbl_hm_sn: string | null;
  mbl_hm_hud_num: string | null;
  mbl_hm_title_num: string | null;
}

export function usePropertyProfile(propId: number | null) {
  return useQuery({
    queryKey: ["pacs-property-profile", propId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pacs_property_profiles")
        .select("*")
        .eq("prop_id", propId!)
        .order("prop_val_yr", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as PropertyProfileRow | null;
    },
    enabled: !!propId,
    staleTime: 300000,
  });
}

export function usePropertyProfileHistory(propId: number | null) {
  return useQuery({
    queryKey: ["pacs-property-profile-history", propId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pacs_property_profiles")
        .select("*")
        .eq("prop_id", propId!)
        .order("prop_val_yr", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PropertyProfileRow[];
    },
    enabled: !!propId,
    staleTime: 300000,
  });
}
