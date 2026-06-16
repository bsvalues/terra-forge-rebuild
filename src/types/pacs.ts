// TerraFusion OS — PACS table types
// Mirrors PACS legacy tables until Supabase types are regenerated.
// Backed by (supabase as any) casts in hooks.
// Uses index signature so additional PACS columns remain accessible.

export interface PacsPropertyProfile {
  id: string;
  county_id: string;
  prop_id: number;
  prop_val_yr: number;
  [key: string]: any;
}
