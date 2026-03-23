// TerraFusion OS — PACS Data Quality Gates
// IAAO-style integrity checks run before publishing any sync product.
// If gates fail → sync is marked "failed" → NBA mission created → timeline event emitted.
//
// "Numbers are slippery, so we catch them with GROUP BY." — Agent Alpha

// ============================================================
// Gate Definitions
// ============================================================

export type GateSeverity = "hard" | "soft";
export type GateStatus = "pass" | "warn" | "fail";

export interface QualityGateResult {
  gateId: string;
  name: string;
  severity: GateSeverity;
  status: GateStatus;
  actual: number;
  threshold: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface QualityGateReport {
  productId: string;
  year: number;
  runAt: string;
  gates: QualityGateResult[];
  overallStatus: GateStatus;
  publishable: boolean;
}

export interface QualityGateDefinition {
  id: string;
  name: string;
  severity: GateSeverity;
  /** Function that evaluates the gate against product data */
  evaluate: (data: SyncProductData) => QualityGateResult;
}

/** Data shape passed to quality gates for evaluation */
export interface SyncProductData {
  year: number;
  productId: string;
  records: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
}

// ============================================================
// Benton-Specific Gate Implementations
// ============================================================

/**
 * property_val rows for appr_yr should be ~1 per prop_id.
 * Duplicate prop_ids indicate sup_num ghost leakage.
 */
const gateOneRowPerPropId: QualityGateDefinition = {
  id: "one_row_per_prop_id",
  name: "One row per prop_id (no sup_num ghosts)",
  severity: "hard",
  evaluate: (data) => {
    const propIds = data.records.map((r) => String(r.prop_id ?? r.parcel_number ?? ""));
    const unique = new Set(propIds).size;
    const duplicateRate = propIds.length > 0 ? (propIds.length - unique) / propIds.length : 0;
    const threshold = 0.01; // Allow max 1% duplicates

    return {
      gateId: "one_row_per_prop_id",
      name: "One row per prop_id (no sup_num ghosts)",
      severity: "hard",
      status: duplicateRate <= threshold ? "pass" : "fail",
      actual: Math.round(duplicateRate * 100 * 100) / 100,
      threshold: threshold * 100,
      message: duplicateRate <= threshold
        ? `${unique} unique prop_ids, ${duplicateRate * 100}% duplicate rate`
        : `Duplicate rate ${(duplicateRate * 100).toFixed(1)}% exceeds ${threshold * 100}% — sup_num ghosts detected`,
      details: { totalRows: propIds.length, uniquePropIds: unique },
    };
  },
};

/**
 * % parcels missing hood_cd should be below threshold.
 */
const gateHoodCoverage: QualityGateDefinition = {
  id: "hood_coverage",
  name: "Neighborhood code coverage",
  severity: "hard",
  evaluate: (data) => {
    const total = data.records.length;
    const missing = data.records.filter(
      (r) => r.hood_cd == null || r.hood_cd === "" || r.hood_cd === "0"
    ).length;
    const missingRate = total > 0 ? missing / total : 0;
    const threshold = 0.05; // Max 5% missing

    return {
      gateId: "hood_coverage",
      name: "Neighborhood code coverage",
      severity: "hard",
      status: missingRate <= threshold ? "pass" : missingRate <= 0.10 ? "warn" : "fail",
      actual: Math.round(missingRate * 100 * 100) / 100,
      threshold: threshold * 100,
      message: missingRate <= threshold
        ? `${((1 - missingRate) * 100).toFixed(1)}% parcels have hood_cd`
        : `${(missingRate * 100).toFixed(1)}% parcels missing hood_cd — exceeds ${threshold * 100}% threshold`,
      details: { total, missing, covered: total - missing },
    };
  },
};

/**
 * % parcels missing geo_id (APN) should be below threshold.
 */
const gateGeoIdCoverage: QualityGateDefinition = {
  id: "geo_id_coverage",
  name: "APN (geo_id) coverage",
  severity: "soft",
  evaluate: (data) => {
    const total = data.records.length;
    const missing = data.records.filter(
      (r) => r.geo_id == null || r.geo_id === ""
    ).length;
    const missingRate = total > 0 ? missing / total : 0;
    const threshold = 0.02;

    return {
      gateId: "geo_id_coverage",
      name: "APN (geo_id) coverage",
      severity: "soft",
      status: missingRate <= threshold ? "pass" : "warn",
      actual: Math.round(missingRate * 100 * 100) / 100,
      threshold: threshold * 100,
      message: `${(missingRate * 100).toFixed(1)}% parcels missing geo_id`,
      details: { total, missing },
    };
  },
};

/**
 * Permit prop_id cast success rate should be > 99%.
 */
const gatePermitCastSuccess: QualityGateDefinition = {
  id: "permit_cast_success",
  name: "Permit prop_id cast success rate",
  severity: "hard",
  evaluate: (data) => {
    const total = data.records.length;
    const castFailed = data.records.filter(
      (r) => r.prop_id == null || r.prop_id === "" || r.prop_id === "0"
    ).length;
    const successRate = total > 0 ? (total - castFailed) / total : 1;
    const threshold = 0.99;

    return {
      gateId: "permit_cast_success",
      name: "Permit prop_id cast success rate",
      severity: "hard",
      status: successRate >= threshold ? "pass" : "fail",
      actual: Math.round(successRate * 100 * 100) / 100,
      threshold: threshold * 100,
      message: successRate >= threshold
        ? `${(successRate * 100).toFixed(1)}% permits resolved to prop_id`
        : `Cast success ${(successRate * 100).toFixed(1)}% below ${threshold * 100}% — check bldg_permit_import_prop_id format`,
      details: { total, castFailed, resolved: total - castFailed },
    };
  },
};

/**
 * Value sanity: total_val >= land_val and total_imprv_val >= 0.
 */
const gateValueSanity: QualityGateDefinition = {
  id: "value_sanity",
  name: "Valuation math integrity",
  severity: "hard",
  evaluate: (data) => {
    let violations = 0;
    const details: string[] = [];

    for (const r of data.records) {
      const total = Number(r.total_val ?? 0);
      const land = Number(r.land_val ?? 0);
      const imprv = Number(r.imprv_val ?? r.total_imprv_val ?? 0);

      if (total < land) {
        violations++;
        if (details.length < 5) details.push(`prop_id=${r.prop_id}: total(${total}) < land(${land})`);
      }
      if (imprv < 0) {
        violations++;
        if (details.length < 5) details.push(`prop_id=${r.prop_id}: imprv(${imprv}) < 0`);
      }
    }

    const violationRate = data.records.length > 0 ? violations / data.records.length : 0;
    const threshold = 0.005; // Max 0.5%

    return {
      gateId: "value_sanity",
      name: "Valuation math integrity",
      severity: "hard",
      status: violationRate <= threshold ? "pass" : "fail",
      actual: Math.round(violationRate * 100 * 1000) / 1000,
      threshold: threshold * 100,
      message: violationRate <= threshold
        ? `${violations} valuation anomalies (${(violationRate * 100).toFixed(2)}%)`
        : `${violations} valuation violations (${(violationRate * 100).toFixed(2)}%) — exceeds ${threshold * 100}%`,
      details: { violations, samples: details },
    };
  },
};

// ============================================================
// Owner Coverage Gate
// ============================================================

const gateOwnerCoverage: QualityGateDefinition = {
  id: "owner_coverage",
  name: "Owner coverage (owner_name + owner_id present)",
  severity: "hard",
  evaluate: (data) => {
    const total = data.records.length;
    const missing = data.records.filter(
      (r) => !r.owner_name || !r.owner_id
    ).length;
    const missingRate = total > 0 ? missing / total : 0;
    const threshold = 0.01;

    return {
      gateId: "owner_coverage",
      name: "Owner coverage (owner_name + owner_id present)",
      severity: "hard",
      status: missingRate <= threshold ? "pass" : "fail",
      actual: Math.round(missingRate * 100 * 100) / 100,
      threshold: threshold * 100,
      message: missingRate <= threshold
        ? `${((1 - missingRate) * 100).toFixed(1)}% owner coverage`
        : `${(missingRate * 100).toFixed(1)}% missing owners exceeds ${threshold * 100}% threshold`,
      details: { total, missing },
    };
  },
};

// ============================================================
// Sales Price Sanity Gate
// ============================================================

const gateSalesPriceSanity: QualityGateDefinition = {
  id: "sales_price_sanity",
  name: "Sales price sanity (reject if >5% sales ≤ $100)",
  severity: "hard",
  evaluate: (data) => {
    const total = data.records.length;
    const lowPrice = data.records.filter(
      (r) => Number(r.sl_price ?? r.sale_price ?? 0) <= 100
    ).length;
    const lowRate = total > 0 ? lowPrice / total : 0;
    const threshold = 0.05;

    return {
      gateId: "sales_price_sanity",
      name: "Sales price sanity (reject if >5% sales ≤ $100)",
      severity: "hard",
      status: lowRate <= threshold ? "pass" : "fail",
      actual: Math.round(lowRate * 100 * 100) / 100,
      threshold: threshold * 100,
      message: lowRate <= threshold
        ? `${(lowRate * 100).toFixed(1)}% low-price sales — within tolerance`
        : `${(lowRate * 100).toFixed(1)}% sales ≤ $100 — unqualified data may have leaked through`,
      details: { total, lowPrice },
    };
  },
};

// ============================================================
// IAAO Ratio Distribution Gate
// ============================================================

const gateRatioDistribution: QualityGateDefinition = {
  id: "ratio_distribution",
  name: "IAAO ratio distribution (median 0.90–1.10)",
  severity: "soft",
  evaluate: (data) => {
    const ratios = data.records
      .map((r) => Number(r.ratio ?? 0))
      .filter((v) => v > 0 && v < 10)
      .sort((a, b) => a - b);

    if (ratios.length === 0) {
      return {
        gateId: "ratio_distribution",
        name: "IAAO ratio distribution (median 0.90–1.10)",
        severity: "soft",
        status: "warn",
        actual: 0,
        threshold: 0,
        message: "No valid ratios to evaluate",
        details: { ratioCount: 0 },
      };
    }

    const median = ratios[Math.floor(ratios.length / 2)];
    const inBand = median >= 0.90 && median <= 1.10;

    return {
      gateId: "ratio_distribution",
      name: "IAAO ratio distribution (median 0.90–1.10)",
      severity: "soft",
      status: inBand ? "pass" : "warn",
      actual: Math.round(median * 10000) / 10000,
      threshold: 1.0,
      message: inBand
        ? `Median ratio ${median.toFixed(4)} within IAAO band (0.90–1.10)`
        : `Median ratio ${median.toFixed(4)} outside IAAO band (0.90–1.10)`,
      details: { ratioCount: ratios.length, median, min: ratios[0], max: ratios[ratios.length - 1] },
    };
  },
};

// ============================================================
// Land Segment Coverage Gate
// ============================================================

const gateLandSegmentCoverage: QualityGateDefinition = {
  id: "land_segment_coverage",
  name: "Land segment coverage (land_val present)",
  severity: "soft",
  evaluate: (data) => {
    const total = data.records.length;
    const missing = data.records.filter(
      (r) => r.land_val == null || Number(r.land_val) === 0
    ).length;
    const missingRate = total > 0 ? missing / total : 0;
    const threshold = 0.10;

    return {
      gateId: "land_segment_coverage",
      name: "Land segment coverage (land_val present)",
      severity: "soft",
      status: missingRate <= threshold ? "pass" : "warn",
      actual: Math.round(missingRate * 100 * 100) / 100,
      threshold: threshold * 100,
      message: `${(missingRate * 100).toFixed(1)}% land segments with zero/null value`,
      details: { total, missing },
    };
  },
};

// ============================================================
// Improvement Year Built Gate
// ============================================================

const gateImprovementYearBuilt: QualityGateDefinition = {
  id: "imprv_year_built",
  name: "Improvement year_built sanity",
  severity: "soft",
  evaluate: (data) => {
    const currentYear = new Date().getFullYear();
    const outOfRange = data.records.filter((r) => {
      const yr = Number(r.actual_year_built ?? r.yr_built ?? 0);
      return yr > 0 && (yr < 1700 || yr > currentYear + 2);
    }).length;
    const total = data.records.length;
    const outRate = total > 0 ? outOfRange / total : 0;
    const threshold = 0.02;

    return {
      gateId: "imprv_year_built",
      name: "Improvement year_built sanity",
      severity: "soft",
      status: outRate <= threshold ? "pass" : "warn",
      actual: Math.round(outRate * 100 * 100) / 100,
      threshold: threshold * 100,
      message: `${(outRate * 100).toFixed(1)}% improvements with out-of-range year_built`,
      details: { total, outOfRange },
    };
  },
};

// ============================================================
// Gate Registry — all gates for Benton products
// ============================================================

export const BENTON_QUALITY_GATES: Record<string, QualityGateDefinition[]> = {
  pacs_current_year_property_val: [gateOneRowPerPropId, gateHoodCoverage, gateGeoIdCoverage, gateValueSanity],
  pacs_current_year_neighborhood_dim: [gateHoodCoverage],
  pacs_workflow_appeals_current_year: [gateOneRowPerPropId],
  pacs_workflow_permits_open: [gatePermitCastSuccess],
  pacs_workflow_exemptions_pending: [gateOneRowPerPropId],
  pacs_current_year_owners: [gateOneRowPerPropId, gateOwnerCoverage],
  pacs_qualified_sales: [gateSalesPriceSanity, gateRatioDistribution],
  pacs_land_details: [gateOneRowPerPropId, gateLandSegmentCoverage],
  pacs_improvements: [gateOneRowPerPropId, gateImprovementYearBuilt],
  pacs_improvement_details: [gateOneRowPerPropId, gateImprovementYearBuilt],
  pacs_assessment_roll: [gateOneRowPerPropId, gateOwnerCoverage, gateValueSanity],
};

// ============================================================
// Gate Runner
// ============================================================

/**
 * Run all quality gates for a given sync product.
 * Returns a full report with overall publishability determination.
 */
export function runQualityGates(data: SyncProductData): QualityGateReport {
  const gates = BENTON_QUALITY_GATES[data.productId] ?? [];
  const results = gates.map((g) => g.evaluate(data));

  const hasHardFail = results.some((r) => r.severity === "hard" && r.status === "fail");
  const hasWarn = results.some((r) => r.status === "warn");

  return {
    productId: data.productId,
    year: data.year,
    runAt: new Date().toISOString(),
    gates: results,
    overallStatus: hasHardFail ? "fail" : hasWarn ? "warn" : "pass",
    publishable: !hasHardFail,
  };
}

// ============================================================
// Schema Drift Detection
// ============================================================

export interface SchemaColumn {
  name: string;
  required: boolean;
  dataType?: string;
}

export interface SchemaExpectation {
  table: string;
  columns: SchemaColumn[];
  lastValidated?: string;
}

export interface SchemaDriftResult {
  table: string;
  status: "valid" | "drift_detected" | "breaking_change";
  missingRequired: string[];
  missingOptional: string[];
  unexpected: string[];
  checkedAt: string;
}

/** Expected schemas per PACS source table — the "armor" against upgrades */
export const PACS_SCHEMA_EXPECTATIONS: SchemaExpectation[] = [
  {
    table: "dbo.property_val",
    columns: [
      { name: "prop_id", required: true, dataType: "int" },
      { name: "prop_val_yr", required: true, dataType: "numeric" },
      { name: "hood_cd", required: true, dataType: "varchar" },
      { name: "sup_num", required: true, dataType: "int" },
      { name: "total_val", required: true, dataType: "numeric" },
      { name: "land_val", required: true, dataType: "numeric" },
      { name: "total_imprv_val", required: false, dataType: "numeric" },
    ],
  },
  {
    table: "dbo.property",
    columns: [
      { name: "prop_id", required: true, dataType: "int" },
      { name: "geo_id", required: true, dataType: "varchar" },
      { name: "prop_type_cd", required: false, dataType: "varchar" },
      { name: "prop_inactive_dt", required: false, dataType: "datetime" },
    ],
  },
  {
    table: "dbo.neighborhood",
    columns: [
      { name: "hood_cd", required: true, dataType: "varchar" },
      { name: "hood_yr", required: true, dataType: "numeric" },
      { name: "hood_name", required: false, dataType: "varchar" },
    ],
  },
  {
    table: "dbo._arb_protest",
    columns: [
      { name: "prop_id", required: true, dataType: "int" },
      { name: "prop_val_yr", required: true, dataType: "numeric" },
      { name: "case_id", required: true, dataType: "int" },
      { name: "prot_status", required: true, dataType: "varchar" },
      { name: "prot_create_dt", required: false, dataType: "datetime" },
      { name: "prot_complete_dt", required: false, dataType: "datetime" },
    ],
  },
  {
    table: "dbo.building_permit",
    columns: [
      { name: "bldg_permit_id", required: true, dataType: "int" },
      { name: "bldg_permit_import_prop_id", required: true, dataType: "varchar" },
      { name: "bldg_permit_num", required: false, dataType: "varchar" },
      { name: "bldg_permit_status", required: true, dataType: "varchar" },
      { name: "bldg_permit_cad_status", required: false, dataType: "varchar" },
      { name: "bldg_permit_issue_dt", required: false, dataType: "datetime" },
      { name: "bldg_permit_dt_complete", required: false, dataType: "datetime" },
      { name: "bldg_permit_val", required: false, dataType: "numeric" },
    ],
  },
  {
    table: "dbo.property_exemption",
    columns: [
      { name: "prop_id", required: true, dataType: "int" },
      { name: "exmpt_tax_yr", required: true, dataType: "numeric" },
      { name: "exmpt_type_cd", required: true, dataType: "varchar" },
      { name: "review_status_cd", required: false, dataType: "varchar" },
      { name: "review_request_date", required: false, dataType: "datetime" },
      { name: "termination_dt", required: false, dataType: "datetime" },
      { name: "exemption_pct", required: false, dataType: "numeric" },
    ],
  },
  {
    table: "dbo.owner",
    columns: [
      { name: "prop_id", required: true, dataType: "int" },
      { name: "owner_id", required: true, dataType: "int" },
      { name: "owner_tax_yr", required: true, dataType: "numeric" },
      { name: "sup_num", required: true, dataType: "int" },
      { name: "pct_ownership", required: false, dataType: "numeric" },
    ],
  },
  {
    table: "dbo.account",
    columns: [
      { name: "acct_id", required: true, dataType: "int" },
      { name: "file_as_name", required: true, dataType: "varchar" },
    ],
  },
  {
    table: "dbo.sale",
    columns: [
      { name: "chg_of_owner_id", required: true, dataType: "int" },
      { name: "prop_id", required: true, dataType: "int" },
      { name: "sl_price", required: true, dataType: "numeric" },
      { name: "sl_dt", required: true, dataType: "datetime" },
      { name: "sl_type_cd", required: false, dataType: "varchar" },
      { name: "sl_county_ratio_cd", required: false, dataType: "varchar" },
      { name: "sl_ratio_type_cd", required: false, dataType: "varchar" },
    ],
  },
  {
    table: "dbo.land_detail",
    columns: [
      { name: "prop_id", required: true, dataType: "int" },
      { name: "prop_val_yr", required: true, dataType: "numeric" },
      { name: "land_seg_id", required: true, dataType: "int" },
      { name: "land_type_cd", required: false, dataType: "varchar" },
      { name: "land_acres", required: false, dataType: "numeric" },
      { name: "land_sqft", required: false, dataType: "numeric" },
      { name: "land_val", required: false, dataType: "numeric" },
      { name: "ag_val", required: false, dataType: "numeric" },
    ],
  },
  {
    table: "dbo.imprv",
    columns: [
      { name: "prop_id", required: true, dataType: "int" },
      { name: "prop_val_yr", required: true, dataType: "numeric" },
      { name: "imprv_id", required: true, dataType: "int" },
      { name: "imprv_type_cd", required: false, dataType: "varchar" },
      { name: "imprv_val", required: false, dataType: "numeric" },
      { name: "imprv_val_source", required: false, dataType: "varchar" },
    ],
  },
  {
    table: "dbo.imprv_detail",
    columns: [
      { name: "prop_id", required: true, dataType: "int" },
      { name: "prop_val_yr", required: true, dataType: "numeric" },
      { name: "imprv_id", required: true, dataType: "int" },
      { name: "imprv_det_id", required: true, dataType: "int" },
      { name: "living_area", required: false, dataType: "numeric" },
      { name: "yr_built", required: false, dataType: "numeric" },
      { name: "num_bedrooms", required: false, dataType: "numeric" },
      { name: "total_bath", required: false, dataType: "numeric" },
    ],
  },
];

/**
 * Check actual columns from SQL Server INFORMATION_SCHEMA against expectations.
 * @param actualColumns - Column names returned from INFORMATION_SCHEMA.COLUMNS
 */
export function detectSchemaDrift(
  table: string,
  actualColumns: string[]
): SchemaDriftResult {
  const expectation = PACS_SCHEMA_EXPECTATIONS.find((e) => e.table === table);
  if (!expectation) {
    return {
      table,
      status: "valid",
      missingRequired: [],
      missingOptional: [],
      unexpected: [],
      checkedAt: new Date().toISOString(),
    };
  }

  const actualSet = new Set(actualColumns.map((c) => c.toLowerCase()));
  const expectedSet = new Set(expectation.columns.map((c) => c.name.toLowerCase()));

  const missingRequired = expectation.columns
    .filter((c) => c.required && !actualSet.has(c.name.toLowerCase()))
    .map((c) => c.name);

  const missingOptional = expectation.columns
    .filter((c) => !c.required && !actualSet.has(c.name.toLowerCase()))
    .map((c) => c.name);

  const unexpected = actualColumns.filter((c) => !expectedSet.has(c.toLowerCase()));

  const status = missingRequired.length > 0
    ? "breaking_change"
    : missingOptional.length > 0
      ? "drift_detected"
      : "valid";

  return {
    table,
    status,
    missingRequired,
    missingOptional,
    unexpected,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Generate the SQL Server query to introspect a table's columns.
 * Run this against PACS before each sync to validate schema.
 */
export function schemaIntrospectionQuery(table: string): string {
  // Strip "dbo." prefix for INFORMATION_SCHEMA
  const tableName = table.replace(/^dbo\./, "");
  return `SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo'
  AND TABLE_NAME = '${tableName}'
ORDER BY ORDINAL_POSITION;`;
}
