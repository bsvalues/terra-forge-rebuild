// TerraFusion OS — PACS table types
// Mirrors PACS legacy tables until Supabase types are regenerated.
// Backed by (supabase as any) casts in hooks.

export interface PacsPropertyProfile {
  id: string;
  county_id: string;
  prop_id: number;
  prop_val_yr: number;
  sup_num: number | null;
  geo_id: string | null;
  hood_cd: string | null;
  property_use_cd: string | null;
  state_cd: string | null;
  living_area: number | null;
  yr_blt: number | null;
  imprv_type_cd: string | null;
  class_cd: string | null;
  condition_cd: string | null;
  land_acres: number | null;
  land_sqft: number | null;
  appraised_val: number | null;
  market: number | null;
  assessed_val: number | null;
  zoning: string | null;
  situs_num: string | null;
  situs_street: string | null;
  situs_city: string | null;
  situs_state: string | null;
  situs_zip: string | null;
  legal_desc: string | null;
  owner_name: string | null;
  abs_subdv_cd: string | null;
  neighborhood: string | null;
  region: string | null;
  subset: string | null;
  map_id: string | null;
  created_at: string;
  updated_at: string;
}
