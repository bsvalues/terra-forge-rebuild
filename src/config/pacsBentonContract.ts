// TerraFusion OS — PACS Benton County Sync Contract
// ═══════════════════════════════════════════════════════════
// THE SINGLE SOURCE OF TRUTH for all PACS sync operations.
// If it's not in this contract, it doesn't ship.
//
// This file defines: products, keys, joins, required fields,
// delta strategies, gate rules, PII redaction, and workflow defs.
//
// Hard gate: all sync SQL MUST originate from adapter queries
// defined here or in pacsFieldMappings/pacsWorkflowMappings.
// Ad-hoc SQL in sync runners is architecturally forbidden.
// ═══════════════════════════════════════════════════════════

import { type PACSIdentityMode, PACS_IDENTITY_MODES } from "./pacsFieldMappings";
import { PACS_WORKFLOW_MAP, type PACSWorkflowDescriptor } from "./pacsWorkflowMappings";
import { PACS_SQLSERVER_INDEX_RECOMMENDATIONS, type IndexRecommendation } from "./sqlServerHelpers";
import {
  BENTON_QUALITY_GATES,
  PACS_SCHEMA_EXPECTATIONS,
  type QualityGateDefinition,
  type SchemaExpectation,
} from "./pacsQualityGates";

// ============================================================
// 1. County Identity
// ============================================================

export interface PACSCountyContract {
  countyName: string;
  countyState: string;
  fipsCode: string;
  camaVendor: string;
  camaVersion: string;
  databaseSchema: string;
  /** How the sync engine connects: "direct_sql" or "pacs_api" */
  connectionMethod: "direct_sql" | "pacs_api";
  /** Access posture — hardcoded to "read_only", never configurable */
  readonly accessPosture: "read_only";
  /** Allowed SQL statement types */
  readonly allowedStatements: readonly string[];
}

export const BENTON_COUNTY: PACSCountyContract = {
  countyName: "Benton",
  countyState: "WA",
  fipsCode: "53005",
  camaVendor: "True Automation",
  camaVersion: "CIAPS / PropAccess",
  databaseSchema: "dbo",
  connectionMethod: "direct_sql",
  accessPosture: "read_only",
  allowedStatements: ["SELECT", "WITH", "DECLARE"] as const,
};

// ============================================================
// 2. Identity Doctrine (re-exported from pacsFieldMappings)
// ============================================================

export { PACS_IDENTITY_MODES, type PACSIdentityMode };

export const IDENTITY_DOCTRINE = {
  /** Current year ops: prop_id is the sole key, sup_num ignored */
  currentYear: PACS_IDENTITY_MODES.CURRENT_YEAR,
  /** Certified/historical years: (prop_id, sup_num, year) full key */
  certifiedYears: PACS_IDENTITY_MODES.CERTIFIED_YEARS,

  /** Appraisal year source — always from pacs_system */
  appraisalYearSource: "SELECT appr_yr FROM dbo.pacs_system",
  /** APN column — geo_id on property table */
  apnColumn: "geo_id",
  /** Neighborhood join doctrine — always year-scoped via property_val */
  neighborhoodJoinRule:
    "property_val(prop_val_yr = @yr).hood_cd → neighborhood(hood_cd, hood_yr = @yr)",
} as const;

// ============================================================
// 3. Sync Data Products
// ============================================================

export type DeltaStrategy =
  | "changelog_table"
  | "modified_timestamp"
  | "business_event_spine"
  | "hash_diff"
  | "full_refresh";

export interface SyncProductDefinition {
  id: string;
  name: string;
  description: string;
  /** Source PACS table(s) */
  sourceTables: string[];
  /** Target TerraFusion table */
  targetTable: string;
  /** Identity mode for this product */
  identityMode: PACSIdentityMode;
  /** Required fields — hard fail if missing from source */
  requiredFields: string[];
  /** Optional fields — soft warn if missing */
  optionalFields: string[];
  /** Ordered delta strategy preference (first available wins) */
  deltaStrategies: DeltaStrategy[];
  /** Quality gates applied before publishing */
  qualityGates: string[];
  /** PII columns to NEVER sync */
  piiRedactedColumns: string[];
  /** Provenance metadata shape */
  provenance: {
    sourceSystem: string;
    confidenceReason: string;
  };
}

export const SYNC_PRODUCTS: SyncProductDefinition[] = [
  {
    id: "pacs_current_year_property_core",
    name: "Property Core (Current Year)",
    description: "Master property identity — prop_id, geo_id, situs, classification",
    sourceTables: ["dbo.property"],
    targetTable: "parcels",
    identityMode: "CURRENT_YEAR",
    requiredFields: ["prop_id", "geo_id"],
    optionalFields: ["situs_display", "situs_city", "prop_type_cd", "prop_inactive_dt"],
    deltaStrategies: ["modified_timestamp", "hash_diff", "full_refresh"],
    qualityGates: [],
    piiRedactedColumns: [],
    provenance: {
      sourceSystem: "PACS/CIAPS dbo.property",
      confidenceReason: "Direct SQL Server extraction",
    },
  },
  {
    id: "pacs_current_year_property_val",
    name: "Property Valuations (Current Year)",
    description: "Year-scoped values + neighborhood via property_val at appr_yr",
    sourceTables: ["dbo.property_val", "dbo.property"],
    targetTable: "parcels",
    identityMode: "CURRENT_YEAR",
    requiredFields: ["prop_id", "prop_val_yr", "hood_cd", "total_val"],
    optionalFields: ["land_val", "total_imprv_val", "sup_num"],
    deltaStrategies: ["modified_timestamp", "hash_diff", "full_refresh"],
    qualityGates: ["pacs_current_year_property_val"],
    piiRedactedColumns: [],
    provenance: {
      sourceSystem: "PACS/CIAPS dbo.property_val (ROW_NUMBER rn=1 per prop_id)",
      confidenceReason: "Year-scoped extraction at appr_yr, sup_num ignored",
    },
  },
  {
    id: "pacs_current_year_neighborhood_dim",
    name: "Neighborhood Dimension (Current Year)",
    description: "Year-versioned neighborhood codes and names",
    sourceTables: ["dbo.neighborhood"],
    targetTable: "neighborhoods",
    identityMode: "CURRENT_YEAR",
    requiredFields: ["hood_cd", "hood_yr"],
    optionalFields: ["hood_name"],
    deltaStrategies: ["hash_diff", "full_refresh"],
    qualityGates: ["pacs_current_year_neighborhood_dim"],
    piiRedactedColumns: [],
    provenance: {
      sourceSystem: "PACS/CIAPS dbo.neighborhood",
      confidenceReason: "Dimension table, year-scoped",
    },
  },
  {
    id: "pacs_workflow_appeals_current_year",
    name: "Appeals / ARB Protests (Current Year)",
    description: "Active and resolved appeals from _arb_protest for current prop_val_yr",
    sourceTables: ["dbo._arb_protest"],
    targetTable: "appeals",
    identityMode: "CURRENT_YEAR",
    requiredFields: ["prop_id", "prop_val_yr", "case_id", "prot_status"],
    optionalFields: ["prot_create_dt", "prot_complete_dt", "prot_type"],
    deltaStrategies: ["modified_timestamp", "hash_diff"],
    qualityGates: ["pacs_workflow_appeals_current_year"],
    piiRedactedColumns: [],
    provenance: {
      sourceSystem: "PACS/CIAPS dbo._arb_protest",
      confidenceReason: "Year-scoped by prop_val_yr",
    },
  },
  {
    id: "pacs_workflow_permits_open",
    name: "Open Building Permits",
    description: "Permits with non-null issue date and null completion date",
    sourceTables: ["dbo.building_permit"],
    targetTable: "permits",
    identityMode: "CURRENT_YEAR",
    requiredFields: ["bldg_permit_id", "bldg_permit_import_prop_id", "bldg_permit_status"],
    optionalFields: ["bldg_permit_cad_status", "bldg_permit_issue_dt", "bldg_permit_dt_complete", "bldg_permit_val"],
    deltaStrategies: ["modified_timestamp", "hash_diff"],
    qualityGates: ["pacs_workflow_permits_open"],
    piiRedactedColumns: [],
    provenance: {
      sourceSystem: "PACS/CIAPS dbo.building_permit (TRY_CONVERT join)",
      confidenceReason: "VARCHAR→INT prop_id cast, filtered to open permits",
    },
  },
  {
    id: "pacs_workflow_exemptions_pending",
    name: "Pending Exemptions",
    description: "Exemptions with active review request and no termination",
    sourceTables: ["dbo.property_exemption"],
    targetTable: "exemptions",
    identityMode: "CURRENT_YEAR",
    requiredFields: ["prop_id", "exmpt_tax_yr", "exmpt_type_cd"],
    optionalFields: ["review_status_cd", "review_request_date", "termination_dt", "exemption_pct"],
    deltaStrategies: ["modified_timestamp", "hash_diff"],
    qualityGates: ["pacs_workflow_exemptions_pending"],
    piiRedactedColumns: [
      "applicant_dl_num", "applicant_ssn", "applicant_dob",
      "spouse_dl_num", "spouse_ssn", "spouse_dob",
      "owner_id", "owner_name",
    ],
    provenance: {
      sourceSystem: "PACS/CIAPS dbo.property_exemption (PII redacted)",
      confidenceReason: "Year-scoped, sup_num ignored for current year ops",
    },
  },
  // ──────────────────────────────────────────────────────────
  // NEW PRODUCTS — Legacy PACS Knowledge Integration
  // ──────────────────────────────────────────────────────────
  {
    id: "pacs_current_year_owners",
    name: "Property Owners (Current Year)",
    description: "Owner identity from dbo.owner + dbo.account — substantive year auto-detection",
    sourceTables: ["dbo.owner", "dbo.account"],
    targetTable: "pacs_owners",
    identityMode: "CURRENT_YEAR",
    requiredFields: ["prop_id", "owner_id", "owner_name"],
    optionalFields: ["pct_ownership", "owner_tax_yr", "sup_num"],
    deltaStrategies: ["hash_diff", "full_refresh"],
    qualityGates: ["pacs_current_year_owners"],
    piiRedactedColumns: [],
    provenance: {
      sourceSystem: "PACS/CIAPS dbo.owner JOIN dbo.account ON owner_id = acct_id",
      confidenceReason: "Substantive year auto-detected via HAVING COUNT(*) >= 1000",
    },
  },
  {
    id: "pacs_qualified_sales",
    name: "Qualified Sales (IAAO Ratio)",
    description: "Arm's-length sales with ratio calculation for IAAO compliance",
    sourceTables: ["dbo.sale", "dbo.chg_of_owner_prop_assoc", "dbo.property_val"],
    targetTable: "pacs_sales",
    identityMode: "CURRENT_YEAR",
    requiredFields: ["chg_of_owner_id", "prop_id", "sl_price", "sl_dt"],
    optionalFields: ["sl_type_cd", "sl_county_ratio_cd", "market_value", "hood_cd", "ratio"],
    deltaStrategies: ["hash_diff", "full_refresh"],
    qualityGates: ["pacs_qualified_sales"],
    piiRedactedColumns: [],
    provenance: {
      sourceSystem: "PACS/CIAPS dbo.sale + dbo.chg_of_owner_prop_assoc",
      confidenceReason: "Filtered to ratio_cd IN ('01','02'), sl_price > 100, last 2 years",
    },
  },
  {
    id: "pacs_land_details",
    name: "Land Detail Segments",
    description: "Land segments with type, acreage, schedule codes, and ag values",
    sourceTables: ["dbo.land_detail", "dbo.land_sched"],
    targetTable: "pacs_land_details",
    identityMode: "CURRENT_YEAR",
    requiredFields: ["prop_id", "prop_val_yr", "land_seg_id"],
    optionalFields: ["land_type_cd", "land_acres", "land_sqft", "land_val", "ag_val", "market_schedule"],
    deltaStrategies: ["hash_diff", "full_refresh"],
    qualityGates: ["pacs_land_details"],
    piiRedactedColumns: [],
    provenance: {
      sourceSystem: "PACS/CIAPS dbo.land_detail + dbo.land_sched",
      confidenceReason: "Substantive year auto-detected, sale_id = 0 filter applied",
    },
  },
  {
    id: "pacs_improvements",
    name: "Improvement Headers",
    description: "Improvement master records — value, type, depreciation percentages",
    sourceTables: ["dbo.imprv"],
    targetTable: "pacs_improvements",
    identityMode: "CURRENT_YEAR",
    requiredFields: ["prop_id", "prop_val_yr", "imprv_id"],
    optionalFields: ["imprv_type_cd", "imprv_desc", "imprv_val", "flat_val", "economic_pct", "physical_pct", "functional_pct"],
    deltaStrategies: ["hash_diff", "full_refresh"],
    qualityGates: ["pacs_improvements"],
    piiRedactedColumns: [],
    provenance: {
      sourceSystem: "PACS/CIAPS dbo.imprv",
      confidenceReason: "Substantive year auto-detected, SOH exclusion applied",
    },
  },
  {
    id: "pacs_improvement_details",
    name: "Improvement Details (Beds/Baths/Area)",
    description: "Detailed improvement attributes — living area, year built, condition, quality",
    sourceTables: ["dbo.imprv_detail"],
    targetTable: "pacs_improvement_details",
    identityMode: "CURRENT_YEAR",
    requiredFields: ["prop_id", "prop_val_yr", "imprv_id", "imprv_det_id"],
    optionalFields: ["living_area", "actual_year_built", "num_bedrooms", "total_bath", "condition_cd", "imprv_det_quality_cd"],
    deltaStrategies: ["hash_diff", "full_refresh"],
    qualityGates: ["pacs_improvement_details"],
    piiRedactedColumns: [],
    provenance: {
      sourceSystem: "PACS/CIAPS dbo.imprv_detail",
      confidenceReason: "Substantive year auto-detected, sale_id = 0 filter applied",
    },
  },
  {
    id: "pacs_assessment_roll",
    name: "Assessment Roll Monitor (DOR)",
    description: "Full DOR-style property snapshot — WA state compliance reporting",
    sourceTables: [
      "dbo.property_val", "dbo.property", "dbo.owner", "dbo.account",
      "dbo.wash_prop_owner_val", "dbo.wash_prop_owner_tax_area_assoc",
      "dbo.tax_area", "dbo.situs", "dbo.property_profile",
    ],
    targetTable: "pacs_assessment_roll",
    identityMode: "CURRENT_YEAR",
    requiredFields: ["prop_id", "geo_id", "owner_id", "owner_name"],
    optionalFields: [
      "imprv_hstd_val", "imprv_non_hstd_val", "land_hstd_val", "land_non_hstd_val",
      "timber_market", "ag_market", "appraised_classified", "taxable_classified",
      "tax_area_id", "situs_display", "property_use_cd", "state_cd",
    ],
    deltaStrategies: ["full_refresh"],
    qualityGates: ["pacs_assessment_roll"],
    piiRedactedColumns: [],
    provenance: {
      sourceSystem: "PACS/CIAPS multi-table DOR roll join",
      confidenceReason: "Year-scoped, prop_type_cd IN ('R', 'MH') filter for real property",
    },
  },
];

// ============================================================
// 4. Sync Watermark Contract
// ============================================================

export interface SyncWatermark {
  productId: string;
  lastSuccessAt: string | null;
  lastSeenChangeId: string | null;
  lastModifiedAt: string | null;
  lastRowCount: number;
  lastStrategy: DeltaStrategy;
  status: "success" | "failed" | "running" | "never_run";
}

/** Default watermark for a product that has never been synced */
export function defaultWatermark(productId: string): SyncWatermark {
  return {
    productId,
    lastSuccessAt: null,
    lastSeenChangeId: null,
    lastModifiedAt: null,
    lastRowCount: 0,
    lastStrategy: "full_refresh",
    status: "never_run",
  };
}

// ============================================================
// 5. Workflow Definitions (re-exported)
// ============================================================

export { PACS_WORKFLOW_MAP, type PACSWorkflowDescriptor };

// ============================================================
// 6. Quality Gates (re-exported)
// ============================================================

export { BENTON_QUALITY_GATES, type QualityGateDefinition };

// ============================================================
// 7. Schema Expectations (re-exported)
// ============================================================

export { PACS_SCHEMA_EXPECTATIONS, type SchemaExpectation };

// ============================================================
// 8. Index Recommendations (re-exported)
// ============================================================

export { PACS_SQLSERVER_INDEX_RECOMMENDATIONS, type IndexRecommendation };

// ============================================================
// 9. Contract Validation
// ============================================================

export interface ContractValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  productCount: number;
  gateCount: number;
  schemaCount: number;
}

/**
 * Validate the contract is internally consistent:
 * - All products reference valid quality gate keys
 * - All products reference existing schema expectations
 * - All required fields are non-empty
 * - PII columns are properly declared
 */
export function validateContract(): ContractValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const product of SYNC_PRODUCTS) {
    // Check quality gate references
    for (const gateKey of product.qualityGates) {
      if (!BENTON_QUALITY_GATES[gateKey]) {
        errors.push(`Product '${product.id}' references unknown gate '${gateKey}'`);
      }
    }

    // Check required fields are non-empty
    if (product.requiredFields.length === 0) {
      warnings.push(`Product '${product.id}' has no required fields`);
    }

    // Check PII redaction is declared for exemptions
    if (product.id.includes("exemption") && product.piiRedactedColumns.length === 0) {
      errors.push(`Product '${product.id}' handles exemptions but has no PII redaction rules`);
    }

    // Check delta strategies are defined
    if (product.deltaStrategies.length === 0) {
      errors.push(`Product '${product.id}' has no delta strategies`);
    }
  }

  // Check schema expectations cover all source tables
  const coveredTables = new Set(PACS_SCHEMA_EXPECTATIONS.map((e) => e.table));
  for (const product of SYNC_PRODUCTS) {
    for (const table of product.sourceTables) {
      if (!coveredTables.has(table)) {
        warnings.push(`Source table '${table}' (product '${product.id}') has no schema expectation`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    productCount: SYNC_PRODUCTS.length,
    gateCount: Object.keys(BENTON_QUALITY_GATES).length,
    schemaCount: PACS_SCHEMA_EXPECTATIONS.length,
  };
}

// ============================================================
// 10. Contract Summary (for diagnostics / health panel)
// ============================================================

export function getContractSummary() {
  const validation = validateContract();
  return {
    county: BENTON_COUNTY,
    identity: {
      currentYear: IDENTITY_DOCTRINE.currentYear.description,
      certifiedYears: IDENTITY_DOCTRINE.certifiedYears.description,
      neighborhoodRule: IDENTITY_DOCTRINE.neighborhoodJoinRule,
    },
    products: SYNC_PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      sourceTables: p.sourceTables,
      targetTable: p.targetTable,
      requiredFields: p.requiredFields.length,
      qualityGates: p.qualityGates.length,
      piiRedacted: p.piiRedactedColumns.length,
      deltaStrategy: p.deltaStrategies[0],
    })),
    validation,
  };
}
