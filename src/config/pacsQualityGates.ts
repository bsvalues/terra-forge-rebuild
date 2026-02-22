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
// Gate Registry — all gates for Benton products
// ============================================================

export const BENTON_QUALITY_GATES: Record<string, QualityGateDefinition[]> = {
  pacs_current_year_property_val: [gateOneRowPerPropId, gateHoodCoverage, gateGeoIdCoverage, gateValueSanity],
  pacs_current_year_neighborhood_dim: [gateHoodCoverage],
  pacs_workflow_appeals_current_year: [gateOneRowPerPropId],
  pacs_workflow_permits_open: [gatePermitCastSuccess],
  pacs_workflow_exemptions_pending: [gateOneRowPerPropId],
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
