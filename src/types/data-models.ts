// TerraFusion OS — Canonical data model types
// Re-exports from connectors + new PACS staging table interfaces.
// Import from here rather than directly from connectors.

// ── Re-export from ascendConnector (already fully defined there) ─────────────

export type {
  AscendProperty,
  AscendImprovement,
  AscendSale,
  AscendValue,
  AscendLand,
  FullValueHistoryRow,
  AscendBridgeCoverage,
} from "@/services/ascendConnector";

// ── Re-export from costforgeConnector ────────────────────────────────────────

export type {
  CalcTraceRow,
  CostForgeCalcInput,
  CostForgeResult,
  ConstructionClass,
  QualityGrade,
} from "@/services/costforgeConnector";

// ── PACS staging table types (tables written by ingestService.ts) ────────────

export interface PacsImprovement {
  id?: string;
  county_id: string;
  prop_id: number;
  prop_val_yr: number;
  sup_num: number;
  imprv_id: number;
  imprv_type_cd: string | null;
  imprv_desc: string | null;
  yr_built: number | null;
  area_sqft: number | null;
  condition_cd: string | null;
  const_class: string | null;
  use_code: string | null;
  num_stories: number | null;
  created_at?: string;
}

export interface PacsImprovementDetail {
  id?: string;
  county_id: string;
  prop_id: number;
  prop_val_yr: number;
  sup_num: number;
  imprv_id: number;
  imprv_det_id: number;
  imprv_det_type_cd: string | null;
  imprv_det_desc: string | null;
  area: number | null;
  yr_built: number | null;
  quality_cd: string | null;
  condition_cd: string | null;
  created_at?: string;
}

export interface PacsLandDetail {
  id?: string;
  county_id: string;
  prop_id: number;
  prop_val_yr: number;
  sup_num: number;
  land_seg_id: number;
  land_type_cd: string | null;
  land_type_desc: string | null;
  acres: number | null;
  sqft: number | null;
  unit_price: number | null;
  total_adj: number | null;
  land_value: number | null;
  created_at?: string;
}

export interface PacsOwner {
  id?: string;
  county_id: string;
  prop_id: number;
  owner_id: number;
  owner_tax_yr: number;
  sup_num: number;
  owner_name: string | null;
  owner_type_cd: string | null;
  pct_ownership: number | null;
  created_at?: string;
}

export interface PacsAssessmentRoll {
  id?: string;
  county_id: string;
  prop_id: number;
  roll_year: number;
  land_hstd_val: number | null;
  imprv_hstd_val: number | null;
  land_non_hstd_val: number | null;
  imprv_non_hstd_val: number | null;
  market_value: number | null;
  appraised_val: number | null;
  assessed_val: number | null;
  created_at?: string;
}
