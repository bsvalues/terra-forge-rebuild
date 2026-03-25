/**
 * Typed query helpers for Supabase tables not yet in generated types.
 * Use these instead of `(supabase.from as any)("table_name")`.
 *
 * When Supabase CLI regenerates types.ts with these tables included,
 * delete the corresponding helpers from this file.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── CostForge Tables ────────────────────────────────────────

export interface CostForgeCalcTraceRow {
  id: string;
  county_id: string;
  parcel_id: string | null;
  lrsn: number | null;
  prop_id: string | null;
  calc_year: number;
  imprv_sequence: number;
  imprv_type_cd: string | null;
  section_id: number | null;
  occupancy_code: string | null;
  construction_class: string;
  quality_grade: string;
  area_sqft: number;
  base_unit_cost: number;
  local_multiplier: number | null;
  current_cost_mult: number | null;
  rcn_before_ref: number | null;
  refinements_total: number;
  rcn: number | null;
  age_years: number;
  effective_life_years: number;
  pct_good: number;
  rcnld: number | null;
  schedule_source: string | null;
  calc_method: string;
  calc_run_at: string;
}

export interface CostForgeResidentialScheduleRow {
  id: string;
  quality_grade: string;
  area_range_min: number | null;
  area_range_max: number | null;
  exterior_wall_type: string | null;
  unit_cost: number;
  effective_date: string | null;
}

export interface CostForgeCommercialScheduleRow {
  id: string;
  section_id: number;
  occupancy_code: string;
  construction_class: string;
  quality_grade: string;
  unit_cost: number;
  effective_date: string | null;
}

export interface CostForgeDepreciationRow {
  id: string;
  building_type: string;
  age_years: number;
  effective_life_years: number;
  pct_good: number;
}

// ─── Ascend Staging Tables ───────────────────────────────────
// Types already defined in ascendConnector.ts — re-export here for convenience
export type {
  AscendProperty,
  AscendImprovement,
  AscendSale,
  AscendValue,
  AscendLand,
  FullValueHistoryRow,
} from "@/services/ascendConnector";

// ─── PACS Staging Tables ─────────────────────────────────────
// Types defined in individual hook files — re-export here for convenience
export type { PacsImprovement, PacsImprovementDetail } from "@/hooks/usePacsImprovements";
export type { PacsLandDetail } from "@/hooks/usePacsLandDetails";
export type { PacsOwner } from "@/hooks/usePacsOwnerLookup";
export type { PacsAssessmentRollEntry } from "@/hooks/usePacsAssessmentRoll";

// ─── Typed Query Builders ────────────────────────────────────

/**
 * Query costforge_calc_trace with full type safety.
 * Usage: `const { data } = await queryCostForgeCalcTrace().select("*").eq("parcel_id", id);`
 */
export function queryCostForgeCalcTrace() {
  return (supabase.from as any)("costforge_calc_trace") as ReturnType<typeof supabase.from>;
}

export function queryCostForgeResidentialSchedules() {
  return (supabase.from as any)("costforge_residential_schedules") as ReturnType<typeof supabase.from>;
}

export function queryCostForgeCommercialSchedules() {
  return (supabase.from as any)("costforge_commercial_schedules") as ReturnType<typeof supabase.from>;
}

export function queryCostForgeDepreciation() {
  return (supabase.from as any)("costforge_depreciation") as ReturnType<typeof supabase.from>;
}

export function queryAscendProperty() {
  return (supabase.from as any)("ascend_property") as ReturnType<typeof supabase.from>;
}

export function queryAscendImprovements() {
  return (supabase.from as any)("ascend_improvements") as ReturnType<typeof supabase.from>;
}

export function queryAscendSales() {
  return (supabase.from as any)("ascend_sales") as ReturnType<typeof supabase.from>;
}

export function queryAscendValues() {
  return (supabase.from as any)("ascend_values") as ReturnType<typeof supabase.from>;
}

export function queryAscendLand() {
  return (supabase.from as any)("ascend_land") as ReturnType<typeof supabase.from>;
}

export function queryFullValueHistory() {
  return (supabase.from as any)("vw_full_value_history") as ReturnType<typeof supabase.from>;
}

export function queryPacsImprovements() {
  return (supabase.from as any)("pacs_improvements") as ReturnType<typeof supabase.from>;
}

export function queryPacsImprovementDetails() {
  return (supabase.from as any)("pacs_improvement_details") as ReturnType<typeof supabase.from>;
}

export function queryPacsLandDetails() {
  return (supabase.from as any)("pacs_land_details") as ReturnType<typeof supabase.from>;
}

export function queryPacsOwners() {
  return (supabase.from as any)("pacs_owners") as ReturnType<typeof supabase.from>;
}

export function queryPacsAssessmentRoll() {
  return (supabase.from as any)("pacs_assessment_roll") as ReturnType<typeof supabase.from>;
}

export function queryParcelNeighborhoodYear() {
  return (supabase.from as any)("parcel_neighborhood_year") as ReturnType<typeof supabase.from>;
}
