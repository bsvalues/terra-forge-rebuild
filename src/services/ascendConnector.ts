// TerraFusion OS — Ascend/Proval Staged-Data Connector
// ═══════════════════════════════════════════════════════════════
// Read-only access to Ascend/Proval pre-2015 legacy data that
// has been ETL'd into TerraFusion Supabase staging tables.
//
// Table layout:
//   ascend_property      — master parcel + owner + 5-yr embedded values
//   ascend_improvements  — building characteristics
//   ascend_land          — lot details / utilities / topography
//   ascend_sales         — excise + embedded land-record sales
//   ascend_values        — multi-year history (MKLND/MKIMP/MKTTL, ~359K rows)
//   ascend_permits       — building permits
//
// Primary key: lrsn (Ascend's unique integer property ID)
// Parcel link: parcels.lrsn = ascend_property.lrsn
//              parcels.parcel_number = ascend_property.pin
//
// Combined history: use vw_full_value_history (Ascend pre-2015 + PACS 2015+)
// ═══════════════════════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";

// ── Types ───────────────────────────────────────────────────────────────────

export interface AscendProperty {
  id: string;
  county_id: string;
  lrsn: number;
  pin: string | null;
  owner1: string | null;
  owner2: string | null;
  mail_addr: string | null;
  mail_city: string | null;
  mail_state: string | null;
  mail_zip: string | null;
  loc_addr: string | null;
  loc_city: string | null;
  loc_zip: string | null;
  prop_class: string | null;
  nei_desc: string | null;
  zoning: string | null;
  zone_desc: string | null;
  legal_ac: number | null;
  legal1: string | null;
  legal2: string | null;
  legal3: string | null;
  exempt1: string | null; exempt1_desc: string | null;
  exempt2: string | null; exempt2_desc: string | null;
  exempt3: string | null; exempt3_desc: string | null;
  assmnt1_date: string | null;
  assmnt2_date: string | null;
  assmnt3_date: string | null;
  assmnt4_date: string | null;
  assmnt5_date: string | null;
  land_val1: number | null; land_val2: number | null; land_val3: number | null;
  land_val4: number | null; land_val5: number | null;
  dwlg_val1: number | null; dwlg_val2: number | null; dwlg_val3: number | null;
  dwlg_val4: number | null; dwlg_val5: number | null;
  tot_val1: number | null;  tot_val2: number | null;  tot_val3: number | null;
  tot_val4: number | null;  tot_val5: number | null;
  taxtot1: number | null;   taxtot2: number | null;   taxtot3: number | null;
  taxtot4: number | null;   taxtot5: number | null;
  created_at: string;
  updated_at: string;
}

export interface AscendImprovement {
  id: string;
  county_id: string;
  lrsn: number;
  pin: string | null;
  impr_type: string | null;
  use_code: string | null;
  use_desc: string | null;
  yr_built: number | null;
  fin_size: number | null;
  stories: string | null;
  cond_code: string | null;
  cond_desc: string | null;
  const_frame: string | null;
  foundation: string | null;
  num_rooms: number | null;
  num_bedrooms: number | null;
  heat_type: string | null;
  central_ac: string | null;
  bsmt_area: string | null;
  att_gar_sf: string | null;
  deck_sf: string | null;
  sketch: string | null;
  imp_stat: string | null;
  last_upd_date: string | null;
}

export interface AscendSale {
  id: string;
  county_id: string;
  lrsn: number;
  pin: string | null;
  sale_date: string | null;
  sale_price: number | null;
  grantor: string | null;
  doc_ref: string | null;
  excise_number: string | null;
  gross_sale_price: number | null;
  mod_sale_price: number | null;
  source: "land_record" | "excise";
  created_at: string;
}

export interface AscendValue {
  id: string;
  county_id: string;
  lrsn: number;
  pin: string | null;
  tax_year: string;
  mklnd: number | null;   // market land
  mkimp: number | null;   // market improvement
  mkttl: number | null;   // market total
  culnd: number | null;   // current use land
  cuimp: number | null;   // current use improvement
  cuttl: number | null;   // current use total
  trv: number | null;     // taxable regular value
  avr: number | null;     // assessed value regular
}

export interface AscendBridgeCoverage {
  parcel_id: string;
  county_id: string;
  parcel_number: string;
  lrsn: number | null;
  owner1: string | null;
  latest_total_value: number | null;
  latest_assessment_date: string | null;
  has_ascend_link: boolean;
  has_value_history: boolean;
  value_history_years: number;
}

export interface FullValueHistoryRow {
  parcel_id: string;
  parcel_number: string;
  roll_year: number;
  land_value: number | null;
  impr_value: number | null;
  total_value: number | null;
  taxable_value: number | null;
  source_system: "ascend" | "pacs";
}

export interface AscendLand {
  id: string;
  county_id: string;
  lrsn: number;
  pin: string | null;
  acres: number | null;
  sqft: string | null;
  lien_date: string | null;
  num_dwlg: number | null;
  num_impr: number | null;
  elec: string | null;
  gas: string | null;
  water: string | null;
  sewer: string | null;
  topo_cod1: string | null;
  land_typ1: string | null;
  impervious_sf: string | null;
}

// ── Connector config ─────────────────────────────────────────────────────────

export interface AscendConnectorConfig {
  name: string;
  readonly canWrite: false;
  maxRowsPerQuery: number;
  defaultCountyId: string;
}

export const BENTON_ASCEND_CONFIG: AscendConnectorConfig = {
  name: "Benton County Ascend/Proval (Pre-2015, Read-Only)",
  canWrite: false,
  maxRowsPerQuery: 10_000,
  defaultCountyId: "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d",
};

// ── Core query helpers ───────────────────────────────────────────────────────

/**
 * Fetch one property master record by lrsn.
 */
export async function getPropertyByLrsn(
  lrsn: number,
  countyId: string = BENTON_ASCEND_CONFIG.defaultCountyId
): Promise<AscendProperty | null> {
  const { data, error } = await supabase
    .from("ascend_property")
    .select("*")
    .eq("county_id", countyId)
    .eq("lrsn", lrsn)
    .maybeSingle();

  if (error) throw new Error(`ascendConnector.getPropertyByLrsn: ${error.message}`);
  return data as AscendProperty | null;
}

/**
 * Fetch one property master record by parcel number (PIN).
 */
export async function getPropertyByPin(
  pin: string,
  countyId: string = BENTON_ASCEND_CONFIG.defaultCountyId
): Promise<AscendProperty | null> {
  const { data, error } = await supabase
    .from("ascend_property")
    .select("*")
    .eq("county_id", countyId)
    .eq("pin", pin)
    .maybeSingle();

  if (error) throw new Error(`ascendConnector.getPropertyByPin: ${error.message}`);
  return data as AscendProperty | null;
}

/**
 * Fetch building improvements for a parcel.
 */
export async function getImprovements(
  lrsn: number,
  countyId: string = BENTON_ASCEND_CONFIG.defaultCountyId
): Promise<AscendImprovement[]> {
  const { data, error } = await supabase
    .from("ascend_improvements")
    .select("*")
    .eq("county_id", countyId)
    .eq("lrsn", lrsn)
    .order("impr_type");

  if (error) throw new Error(`ascendConnector.getImprovements: ${error.message}`);
  return (data ?? []) as AscendImprovement[];
}

/**
 * Fetch land record for a parcel.
 */
export async function getLand(
  lrsn: number,
  countyId: string = BENTON_ASCEND_CONFIG.defaultCountyId
): Promise<AscendLand | null> {
  const { data, error } = await supabase
    .from("ascend_land")
    .select("*")
    .eq("county_id", countyId)
    .eq("lrsn", lrsn)
    .maybeSingle();

  if (error) throw new Error(`ascendConnector.getLand: ${error.message}`);
  return data as AscendLand | null;
}

/**
 * Fetch all sales for a parcel (both excise + land-record sources).
 * Returns sorted by sale_date descending (most recent first).
 */
export async function getSales(
  lrsn: number,
  countyId: string = BENTON_ASCEND_CONFIG.defaultCountyId
): Promise<AscendSale[]> {
  const { data, error } = await supabase
    .from("ascend_sales")
    .select("*")
    .eq("county_id", countyId)
    .eq("lrsn", lrsn)
    .order("sale_date", { ascending: false });

  if (error) throw new Error(`ascendConnector.getSales: ${error.message}`);
  return (data ?? []) as AscendSale[];
}

/**
 * Fetch multi-year assessment value history for a parcel.
 * Returns sorted by tax_year descending (most recent first).
 * This is the goldmine: up to 20+ years of pre-2015 history.
 */
export async function getValueHistory(
  lrsn: number,
  countyId: string = BENTON_ASCEND_CONFIG.defaultCountyId
): Promise<AscendValue[]> {
  const { data, error } = await supabase
    .from("ascend_values")
    .select("*")
    .eq("county_id", countyId)
    .eq("lrsn", lrsn)
    .order("tax_year", { ascending: false });

  if (error) throw new Error(`ascendConnector.getValueHistory: ${error.message}`);
  return (data ?? []) as AscendValue[];
}

/**
 * Fetch the merged PACS + Ascend full value history for a parcel.
 * Uses vw_full_value_history (Ascend pre-2015 + PACS 2015+).
 * Returns sorted by roll_year descending.
 */
export async function getFullValueHistory(
  parcelId: string
): Promise<FullValueHistoryRow[]> {
  const { data, error } = await supabase
    .from("vw_full_value_history")
    .select("*")
    .eq("parcel_id", parcelId)
    .order("roll_year", { ascending: false });

  if (error) throw new Error(`ascendConnector.getFullValueHistory: ${error.message}`);
  return (data ?? []) as FullValueHistoryRow[];
}

/**
 * Fetch bridge coverage summary for a county.
 * Returns which parcels have Ascend links and value history.
 */
export async function getBridgeCoverage(
  countyId: string = BENTON_ASCEND_CONFIG.defaultCountyId,
  limit: number = 500
): Promise<AscendBridgeCoverage[]> {
  const { data, error } = await supabase
    .from("vw_ascend_bridge_coverage")
    .select("*")
    .eq("county_id", countyId)
    .limit(limit);

  if (error) throw new Error(`ascendConnector.getBridgeCoverage: ${error.message}`);
  return (data ?? []) as AscendBridgeCoverage[];
}

/**
 * Compute Ascend bridge statistics for a county.
 * Returns counts of parcels with/without Ascend links and value history.
 */
export async function getBridgeStats(
  countyId: string = BENTON_ASCEND_CONFIG.defaultCountyId
): Promise<{
  totalParcels: number;
  withAscendLink: number;
  withValueHistory: number;
  coveragePct: number;
}> {
  const { data, error } = await supabase
    .from("vw_ascend_bridge_coverage")
    .select("has_ascend_link, has_value_history")
    .eq("county_id", countyId);

  if (error) throw new Error(`ascendConnector.getBridgeStats: ${error.message}`);
  const rows = data ?? [];
  const withLink = rows.filter((r) => r.has_ascend_link).length;
  const withHistory = rows.filter((r) => r.has_value_history).length;
  return {
    totalParcels: rows.length,
    withAscendLink: withLink,
    withValueHistory: withHistory,
    coveragePct: rows.length > 0 ? Math.round((withLink / rows.length) * 1000) / 10 : 0,
  };
}

/**
 * Fetch excise sales for a date range (county-wide).
 * Useful for sales ratio analysis on pre-2015 Ascend data.
 */
export async function getSalesByDateRange(
  fromDate: string,
  toDate: string,
  countyId: string = BENTON_ASCEND_CONFIG.defaultCountyId,
  sourceFilter?: "land_record" | "excise"
): Promise<AscendSale[]> {
  let query = supabase
    .from("ascend_sales")
    .select("*")
    .eq("county_id", countyId)
    .gte("sale_date", fromDate)
    .lte("sale_date", toDate)
    .order("sale_date", { ascending: false })
    .limit(BENTON_ASCEND_CONFIG.maxRowsPerQuery);

  if (sourceFilter) {
    query = query.eq("source", sourceFilter);
  }

  const { data, error } = await query;
  if (error) throw new Error(`ascendConnector.getSalesByDateRange: ${error.message}`);
  return (data ?? []) as AscendSale[];
}

/**
 * Fetch county-wide value history for a specific tax year.
 * Useful for Ascend-era ratio studies and trend analysis.
 */
export async function getValuesByYear(
  taxYear: string,
  countyId: string = BENTON_ASCEND_CONFIG.defaultCountyId
): Promise<AscendValue[]> {
  const { data, error } = await supabase
    .from("ascend_values")
    .select("lrsn, pin, tax_year, mklnd, mkimp, mkttl, avr, trv")
    .eq("county_id", countyId)
    .eq("tax_year", taxYear)
    .limit(BENTON_ASCEND_CONFIG.maxRowsPerQuery);

  if (error) throw new Error(`ascendConnector.getValuesByYear: ${error.message}`);
  return (data ?? []) as AscendValue[];
}

/**
 * Fetch connector health summary.
 * Checks row counts across all Ascend staging tables.
 */
export async function checkConnectorHealth(
  countyId: string = BENTON_ASCEND_CONFIG.defaultCountyId
): Promise<{
  healthy: boolean;
  tables: Record<string, number>;
  checkedAt: string;
}> {
  const tables = [
    "ascend_property",
    "ascend_improvements",
    "ascend_land",
    "ascend_sales",
    "ascend_values",
    "ascend_permits",
  ] as const;

  const counts: Record<string, number> = {};
  let healthy = true;

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("county_id", countyId);

    if (error) {
      counts[table] = -1;
      healthy = false;
    } else {
      counts[table] = count ?? 0;
    }
  }

  return { healthy, tables: counts, checkedAt: new Date().toISOString() };
}
