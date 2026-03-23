// TerraFusion OS — CostForge Schedule & Valuation Connector
// ═══════════════════════════════════════════════════════════════
// Read-only access to Benton County's custom cost approach schedules
// stored in TerraFusion Supabase CostForge tables.
//
// These schedules are Benton County's own — NOT Marshall & Swift —
// and form the foundation of TerraFusion CostForge, replacing M&S
// for counties that adopt TerraFusion.
//
// Cost computation flow (RCNLD):
//   1. Look up base $/sqft from residential or commercial schedule
//   2. Apply local multiplier (geographic adjustment by class)
//   3. Apply current cost multiplier (time/inflation by section × class)
//   4. Add refinements (HVAC, sprinklers, etc.)  → RCN
//   5. Look up pct_good from depreciation table (age × effective life)
//   6. RCNLD = RCN × (pct_good / 100)
//
// Tables:
//   costforge_residential_schedules
//   costforge_commercial_schedules
//   costforge_depreciation
//   costforge_cost_multipliers
//   costforge_refinements
//   costforge_imprv_type_codes
//   costforge_calc_trace   (written by CostForge engine, read here)
//
// Views:
//   vw_costforge_coverage
//   vw_costforge_imprv_inputs
// ═══════════════════════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

export type ConstructionClass = "A" | "B" | "C" | "D" | "S" | "P";
export type QualityGrade = "Low" | "Fair" | "Average" | "Good" | "Excellent";
export type PropertyType = "residential" | "commercial";
export type RefinementType = "hvac" | "sprinkler" | "elevator" | "shape" | "height";
export type MultiplierType = "local" | "current";

export interface ResidentialScheduleRow {
  id: string;
  county_id: string;
  quality_grade: QualityGrade;
  min_area: number;
  ext_wall_type: string;
  unit_cost: number;
  schedule_year: number | null;
}

export interface CommercialScheduleRow {
  id: string;
  county_id: string;
  section_id: number;
  occupancy_code: string;
  occupancy_desc: string | null;
  construction_class: ConstructionClass;
  quality_grade: QualityGrade;
  unit_cost: number | null;
  pct_diff_to_next: number | null;
  depreciation_table: string | null;
  schedule_year: number | null;
}

export interface DepreciationRow {
  id: string;
  county_id: string;
  property_type: PropertyType;
  age_years: number;
  effective_life_years: number;
  pct_good: number;          // 0–100
  pacs_matrix_id: number | null;
}

export interface CostMultiplierRow {
  id: string;
  county_id: string;
  multiplier_type: MultiplierType;
  construction_class: ConstructionClass;
  section_id: number | null;  // null for 'local' type
  multiplier: number;          // e.g. 112.0 = 112%
  pacs_matrix_id: number | null;
}

export interface RefinementRow {
  id: string;
  county_id: string;
  refinement_type: RefinementType;
  qualifier: string;
  qualifier_desc: string | null;
  section_id: number | null;
  area_band_min: number | null;
  unit: "per_sqft" | "flat" | "multiplier";
  value: number;
}

export interface ImprvTypeCode {
  id: string;
  county_id: string;
  imprv_det_type_cd: string;
  type_desc: string | null;
  canonical_code: string | null;
  canonical_desc: string | null;
  section_id: number | null;
  occupancy_code: string | null;
  is_residential: boolean;
  is_active: boolean;
  notes: string | null;
}

export interface CalcTraceRow {
  id: string;
  county_id: string;
  parcel_id: string | null;
  lrsn: number | null;
  prop_id: number | null;
  calc_year: number;
  imprv_sequence: number;
  imprv_type_cd: string | null;
  section_id: number | null;
  occupancy_code: string | null;
  construction_class: ConstructionClass | null;
  quality_grade: QualityGrade | null;
  area_sqft: number | null;
  base_unit_cost: number | null;
  local_multiplier: number | null;
  current_cost_mult: number | null;
  rcn_before_ref: number | null;
  refinements_total: number | null;
  rcn: number | null;
  age_years: number | null;
  effective_life_years: number | null;
  pct_good: number | null;
  rcnld: number | null;
  schedule_source: string | null;
  calc_method: string;
  calc_run_at: string;
}

export interface CostForgeCoverage {
  county_id: string;
  res_schedule_rows: number;
  comm_occupancies: number;
  comm_schedule_rows: number;
  depreciation_rows: number;
  multiplier_rows: number;
  refinement_rows: number;
  type_code_rows: number;
}

/** Inputs needed to run a CostForge valuation on one improvement */
export interface CostForgeCalcInput {
  lrsn: number | null;
  pin: string | null;
  county_id: string;
  imprv_det_type_cd: string | null;
  yr_built: number | null;
  area_sqft: number | null;
  condition_code: string | null;
  construction_class_raw: string | null;  // raw from Ascend/PACS
  use_code: string | null;
  section_id: number | null;
  occupancy_code: string | null;
  is_residential: boolean | null;
}

/** The computed RCNLD result */
export interface CostForgeResult {
  baseUnitCost:       number | null;
  localMultiplier:    number | null;
  currentCostMult:    number | null;
  rcnBeforeRef:       number | null;
  refinementsTotal:   number | null;
  rcn:                number | null;
  ageYears:           number | null;
  effectiveLifeYears: number | null;
  pctGood:            number | null;
  rcnld:              number | null;
  scheduleSource:     string;
}

// ── Connector config ─────────────────────────────────────────────────────────

export interface CostForgeConnectorConfig {
  name: string;
  readonly canWrite: false;
  defaultCountyId: string;
  currentCalcYear: number;
}

export const BENTON_COSTFORGE_CONFIG: CostForgeConnectorConfig = {
  name: "Benton County CostForge (Custom Schedules, Read-Only)",
  canWrite: false,
  defaultCountyId: "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d",
  currentCalcYear: new Date().getFullYear(),
};

// ── Schedule lookups ─────────────────────────────────────────────────────────

/**
 * Look up residential base unit cost for a given quality, area, and exterior wall type.
 * Returns the row where min_area is the largest value ≤ actual_area.
 */
export async function lookupResidentialCost(
  qualityGrade: QualityGrade,
  areaSqft: number,
  extWallType: string,
  countyId: string = BENTON_COSTFORGE_CONFIG.defaultCountyId
): Promise<ResidentialScheduleRow | null> {
  const { data, error } = await supabase
    .from("costforge_residential_schedules")
    .select("*")
    .eq("county_id", countyId)
    .eq("quality_grade", qualityGrade)
    .eq("ext_wall_type", extWallType)
    .lte("min_area", areaSqft)
    .order("min_area", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`costforgeConnector.lookupResidentialCost: ${error.message}`);
  return data as ResidentialScheduleRow | null;
}

/**
 * Look up commercial base unit cost for a given section, occupancy, class, and quality.
 */
export async function lookupCommercialCost(
  sectionId: number,
  occupancyCode: string,
  constructionClass: ConstructionClass,
  qualityGrade: QualityGrade,
  countyId: string = BENTON_COSTFORGE_CONFIG.defaultCountyId
): Promise<CommercialScheduleRow | null> {
  const { data, error } = await supabase
    .from("costforge_commercial_schedules")
    .select("*")
    .eq("county_id", countyId)
    .eq("section_id", sectionId)
    .eq("occupancy_code", occupancyCode)
    .eq("construction_class", constructionClass)
    .eq("quality_grade", qualityGrade)
    .maybeSingle();

  if (error) throw new Error(`costforgeConnector.lookupCommercialCost: ${error.message}`);
  return data as CommercialScheduleRow | null;
}

/**
 * Look up depreciation pct_good for a property type, age, and effective life.
 */
export async function lookupDepreciation(
  propertyType: PropertyType,
  ageYears: number,
  effectiveLifeYears: number,
  countyId: string = BENTON_COSTFORGE_CONFIG.defaultCountyId
): Promise<number | null> {
  const { data, error } = await supabase
    .from("costforge_depreciation")
    .select("pct_good")
    .eq("county_id", countyId)
    .eq("property_type", propertyType)
    .eq("age_years", ageYears)
    .eq("effective_life_years", effectiveLifeYears)
    .maybeSingle();

  if (error) throw new Error(`costforgeConnector.lookupDepreciation: ${error.message}`);
  return data ? (data as DepreciationRow).pct_good : null;
}

/**
 * Fetch all depreciation rows for a property type.
 * Used to build the full depreciation grid for display or interpolation.
 */
export async function getDepreciationTable(
  propertyType: PropertyType,
  countyId: string = BENTON_COSTFORGE_CONFIG.defaultCountyId
): Promise<DepreciationRow[]> {
  const { data, error } = await supabase
    .from("costforge_depreciation")
    .select("*")
    .eq("county_id", countyId)
    .eq("property_type", propertyType)
    .order("age_years")
    .order("effective_life_years");

  if (error) throw new Error(`costforgeConnector.getDepreciationTable: ${error.message}`);
  return (data ?? []) as DepreciationRow[];
}

/**
 * Fetch cost multipliers for a county.
 * Returns all local + current cost multipliers needed for a full calculation.
 */
export async function getCostMultipliers(
  countyId: string = BENTON_COSTFORGE_CONFIG.defaultCountyId
): Promise<CostMultiplierRow[]> {
  const { data, error } = await supabase
    .from("costforge_cost_multipliers")
    .select("*")
    .eq("county_id", countyId)
    .order("multiplier_type")
    .order("construction_class")
    .order("section_id");

  if (error) throw new Error(`costforgeConnector.getCostMultipliers: ${error.message}`);
  return (data ?? []) as CostMultiplierRow[];
}

/**
 * Fetch HVAC refinements for a section.
 */
export async function getHvacRefinements(
  sectionId: number,
  countyId: string = BENTON_COSTFORGE_CONFIG.defaultCountyId
): Promise<RefinementRow[]> {
  const { data, error } = await supabase
    .from("costforge_refinements")
    .select("*")
    .eq("county_id", countyId)
    .eq("refinement_type", "hvac")
    .eq("section_id", sectionId)
    .order("qualifier");

  if (error) throw new Error(`costforgeConnector.getHvacRefinements: ${error.message}`);
  return (data ?? []) as RefinementRow[];
}

/**
 * Resolve an imprv_det_type_cd to its TerraFusion section/occupancy mapping.
 */
export async function resolveTypeCode(
  imprvDetTypeCd: string,
  countyId: string = BENTON_COSTFORGE_CONFIG.defaultCountyId
): Promise<ImprvTypeCode | null> {
  const { data, error } = await supabase
    .from("costforge_imprv_type_codes")
    .select("*")
    .eq("county_id", countyId)
    .eq("imprv_det_type_cd", imprvDetTypeCd)
    .maybeSingle();

  if (error) throw new Error(`costforgeConnector.resolveTypeCode: ${error.message}`);
  return data as ImprvTypeCode | null;
}

/**
 * Fetch all type codes for a county (useful for admin UI / debugging).
 */
export async function getAllTypeCodes(
  countyId: string = BENTON_COSTFORGE_CONFIG.defaultCountyId,
  activeOnly = true
): Promise<ImprvTypeCode[]> {
  let query = supabase
    .from("costforge_imprv_type_codes")
    .select("*")
    .eq("county_id", countyId)
    .order("imprv_det_type_cd");

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`costforgeConnector.getAllTypeCodes: ${error.message}`);
  return (data ?? []) as ImprvTypeCode[];
}

// ── CostForge calculation engine ─────────────────────────────────────────────

/**
 * Core CostForge RCNLD calculation for one improvement.
 *
 * This implements Benton County's cost approach:
 *   RCN  = base_unit_cost × (local_mult/100) × (current_cost_mult/100) × area
 *   RCNL = RCN × (pct_good/100)
 *
 * Note: refinements (HVAC, sprinklers) are NOT included in this base calc —
 * they require the HVAC type from the full improvement record.
 * Use calcRCNLDWithRefinements for the full calculation.
 */
export async function calcRCNLD(
  input: CostForgeCalcInput,
  qualityGrade: QualityGrade = "Average",
  extWallType = "Metal or Vinyl Siding",
  effectiveLifeYears = 45
): Promise<CostForgeResult> {
  const currentYear = BENTON_COSTFORGE_CONFIG.currentCalcYear;
  const ageYears = input.yr_built ? currentYear - input.yr_built : null;
  const area = input.area_sqft ?? 0;

  // ── Resolve construction class ──────────────────────────────────────────
  const classRaw = (input.construction_class_raw ?? "").toUpperCase();
  const constructionClass: ConstructionClass =
    ["A","B","C","D","S","P"].includes(classRaw)
      ? (classRaw as ConstructionClass)
      : "D";  // Default: Wood/Steel Frame (most common residential)

  const isResidential = input.is_residential ?? false;
  const propType: PropertyType = isResidential ? "residential" : "commercial";

  // ── Step 1: Base unit cost ───────────────────────────────────────────────
  let baseUnitCost: number | null = null;
  let scheduleSource: string;

  if (isResidential && area > 0) {
    const resRow = await lookupResidentialCost(
      qualityGrade, area, extWallType, input.county_id
    );
    baseUnitCost = resRow?.unit_cost ?? null;
    scheduleSource = `residential/${qualityGrade}/${extWallType}`;
  } else if (!isResidential && input.section_id && input.occupancy_code) {
    const commRow = await lookupCommercialCost(
      input.section_id, input.occupancy_code,
      constructionClass, qualityGrade, input.county_id
    );
    baseUnitCost = commRow?.unit_cost ?? null;
    scheduleSource = `section${input.section_id}/${input.occupancy_code}/${constructionClass}/${qualityGrade}`;
  } else {
    scheduleSource = "unresolved";
  }

  if (baseUnitCost === null) {
    return {
      baseUnitCost: null, localMultiplier: null, currentCostMult: null,
      rcnBeforeRef: null, refinementsTotal: null, rcn: null,
      ageYears, effectiveLifeYears, pctGood: null, rcnld: null,
      scheduleSource,
    };
  }

  // ── Step 2: Cost multipliers ─────────────────────────────────────────────
  const multipliers = await getCostMultipliers(input.county_id);

  const localMult = multipliers.find(
    m => m.multiplier_type === "local" && m.construction_class === constructionClass
  )?.multiplier ?? 100;

  const currentCostMult = multipliers.find(
    m => m.multiplier_type === "current"
      && m.construction_class === constructionClass
      && m.section_id === (isResidential ? null : input.section_id)
  )?.multiplier ?? 100;

  // ── Step 3: RCN ──────────────────────────────────────────────────────────
  const rcnBeforeRef = baseUnitCost * (localMult / 100) * (currentCostMult / 100) * area;
  const rcn = rcnBeforeRef;  // refinements handled separately

  // ── Step 4: Depreciation ─────────────────────────────────────────────────
  let pctGood: number | null = null;
  if (ageYears !== null && ageYears >= 0) {
    pctGood = await lookupDepreciation(
      propType,
      Math.min(ageYears, 70),    // cap at table max
      effectiveLifeYears,
      input.county_id
    );
  }

  // ── Step 5: RCNLD ────────────────────────────────────────────────────────
  const rcnld = (rcn !== null && pctGood !== null)
    ? Math.round(rcn * (pctGood / 100))
    : null;

  return {
    baseUnitCost,
    localMultiplier: localMult,
    currentCostMult,
    rcnBeforeRef: Math.round(rcnBeforeRef),
    refinementsTotal: 0,
    rcn: Math.round(rcn),
    ageYears,
    effectiveLifeYears,
    pctGood,
    rcnld,
    scheduleSource,
  };
}

// ── Calc trace queries ───────────────────────────────────────────────────────

/**
 * Fetch the most recent calc trace for a parcel (most recent calc_year first).
 */
export async function getCalcTrace(
  parcelId: string,
  countyId: string = BENTON_COSTFORGE_CONFIG.defaultCountyId
): Promise<CalcTraceRow[]> {
  const { data, error } = await supabase
    .from("costforge_calc_trace")
    .select("*")
    .eq("county_id", countyId)
    .eq("parcel_id", parcelId)
    .order("calc_year", { ascending: false })
    .order("imprv_sequence");

  if (error) throw new Error(`costforgeConnector.getCalcTrace: ${error.message}`);
  return (data ?? []) as CalcTraceRow[];
}

/**
 * Fetch calc trace by lrsn (Ascend parcel).
 */
export async function getCalcTraceByLrsn(
  lrsn: number,
  countyId: string = BENTON_COSTFORGE_CONFIG.defaultCountyId
): Promise<CalcTraceRow[]> {
  const { data, error } = await supabase
    .from("costforge_calc_trace")
    .select("*")
    .eq("county_id", countyId)
    .eq("lrsn", lrsn)
    .order("calc_year", { ascending: false });

  if (error) throw new Error(`costforgeConnector.getCalcTraceByLrsn: ${error.message}`);
  return (data ?? []) as CalcTraceRow[];
}

// ── Coverage & health ────────────────────────────────────────────────────────

/**
 * Fetch CostForge schedule coverage summary for a county.
 */
export async function getCoverage(
  countyId: string = BENTON_COSTFORGE_CONFIG.defaultCountyId
): Promise<CostForgeCoverage | null> {
  const { data, error } = await supabase
    .from("vw_costforge_coverage")
    .select("*")
    .eq("county_id", countyId)
    .maybeSingle();

  if (error) throw new Error(`costforgeConnector.getCoverage: ${error.message}`);
  return data as CostForgeCoverage | null;
}

/**
 * Fetch improvement inputs ready for CostForge calculation.
 * Returns Ascend improvements joined with type code lookups.
 */
export async function getCalcInputs(
  lrsn: number,
  countyId: string = BENTON_COSTFORGE_CONFIG.defaultCountyId
): Promise<CostForgeCalcInput[]> {
  const { data, error } = await supabase
    .from("vw_costforge_imprv_inputs")
    .select("*")
    .eq("county_id", countyId)
    .eq("lrsn", lrsn);

  if (error) throw new Error(`costforgeConnector.getCalcInputs: ${error.message}`);
  return (data ?? []) as CostForgeCalcInput[];
}

/**
 * Health check: returns row counts across all CostForge tables.
 */
export async function checkHealth(
  countyId: string = BENTON_COSTFORGE_CONFIG.defaultCountyId
): Promise<{ healthy: boolean; tables: Record<string, number>; checkedAt: string }> {
  const tables = [
    "costforge_residential_schedules",
    "costforge_commercial_schedules",
    "costforge_depreciation",
    "costforge_cost_multipliers",
    "costforge_refinements",
    "costforge_imprv_type_codes",
  ] as const;

  const counts: Record<string, number> = {};
  let healthy = true;

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("county_id", countyId);

    if (error) { counts[table] = -1; healthy = false; }
    else counts[table] = count ?? 0;
  }

  // Healthy = all tables have data
  if (Object.values(counts).some(c => c === 0)) healthy = false;

  return { healthy, tables: counts, checkedAt: new Date().toISOString() };
}
