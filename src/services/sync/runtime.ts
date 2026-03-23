// TerraFusion OS — Contract-Driven Sync Runtime
// ═══════════════════════════════════════════════════════════
// The orchestrator that runs Benton PACS products through:
//   Extract (read-only) → Schema Drift Check → Quality Gates →
//   Stage → Watermark → Pipeline Events → Trace Receipt
//
// No ad-hoc SQL. All queries come from the contract.
// All writes happen in TerraFusion DB only. Never PACS.
//
// 🪖 It runs the plan and also forgets where it put its cookie.
// ═══════════════════════════════════════════════════════════

import type { ReadOnlyConnector, QueryResult } from "./connectors/types";
import type { SourceLaneRegistry } from "./registry";
import {
  SYNC_PRODUCTS,
  BENTON_COUNTY,
  type SyncProductDefinition,
  type SyncWatermark,
  type DeltaStrategy,
  defaultWatermark,
} from "@/config/pacsBentonContract";
import {
  BENTON_QUALITY_GATES,
  PACS_SCHEMA_EXPECTATIONS,
  type QualityGateResult,
  type SchemaDriftResult,
  type SyncProductData,
  runQualityGates,
  detectSchemaDrift,
} from "@/config/pacsQualityGates";
import { PACS_NEIGHBORHOOD_QUERIES } from "@/config/pacsFieldMappings";
import {
  PACS_OWNER_QUERIES,
  PACS_SALES_QUERIES,
  PACS_LAND_QUERIES,
  PACS_IMPROVEMENT_QUERIES,
  PACS_ROLL_QUERIES,
} from "@/config/pacsFieldMappings";
import { PACS_WORKFLOW_QUERIES } from "@/config/pacsWorkflowMappings";

// ============================================================
// Sync Run Result
// ============================================================

export interface ProductSyncResult {
  productId: string;
  productName: string;
  status: "success" | "failed" | "skipped" | "gate_failed" | "schema_drift";
  rowCount: number;
  fetchedAt: string;
  executionMs: number;
  /** Delta strategy actually used */
  strategy: DeltaStrategy;
  /** Quality gate results (if run) */
  gateResults?: QualityGateResult[];
  /** Schema drift detection (if run) */
  schemaDrift?: SchemaDriftResult;
  /** Error message (if failed) */
  error?: string;
  /** PII columns that were redacted */
  piiRedacted: string[];
  /** Watermark after this sync */
  watermark: SyncWatermark;
}

export interface SyncRunResult {
  /** County this sync ran for */
  county: string;
  /** Appraisal year */
  year: number;
  /** Source lane used */
  sourceLane: string;
  /** Overall status */
  status: "success" | "partial" | "failed";
  /** Per-product results */
  products: ProductSyncResult[];
  /** Total rows fetched across all products */
  totalRows: number;
  /** Total execution time */
  totalMs: number;
  /** Timestamp */
  completedAt: string;
}

// ============================================================
// Product SQL Resolver
// ============================================================

/**
 * Resolve the extraction SQL for a product.
 * All SQL comes from the contract/workflow mappings — never ad-hoc.
 */
function resolveProductSQL(product: SyncProductDefinition, year: number): string | null {
  switch (product.id) {
    case "pacs_current_year_property_core":
      return `
DECLARE @yr int = ${year};
SELECT
  p.prop_id,
  p.geo_id,
  p.situs_display,
  p.situs_city,
  p.situs_state,
  p.situs_zip,
  p.prop_type_cd,
  p.prop_inactive_dt
FROM dbo.property p
WHERE p.prop_inactive_dt IS NULL;`;

    case "pacs_current_year_property_val":
      return PACS_NEIGHBORHOOD_QUERIES.currentYearValues(year);

    case "pacs_current_year_neighborhood_dim":
      return PACS_NEIGHBORHOOD_QUERIES.neighborhoods(year);

    case "pacs_workflow_appeals_current_year":
      return PACS_WORKFLOW_QUERIES.appeals(year);

    case "pacs_workflow_permits_open":
      return PACS_WORKFLOW_QUERIES.permits(year);

    case "pacs_workflow_exemptions_pending":
      return PACS_WORKFLOW_QUERIES.exemptions(year);

    // ── New products: legacy PACS knowledge integration ──

    case "pacs_current_year_owners":
      return PACS_OWNER_QUERIES.currentYearOwners(year);

    case "pacs_qualified_sales":
      return PACS_SALES_QUERIES.qualifiedSales(year);

    case "pacs_land_details":
      return PACS_LAND_QUERIES.landDetails(year);

    case "pacs_improvements":
      return PACS_IMPROVEMENT_QUERIES.improvements(year);

    case "pacs_improvement_details":
      return PACS_IMPROVEMENT_QUERIES.improvementDetails(year);

    case "pacs_assessment_roll":
      return PACS_ROLL_QUERIES.assessmentRoll(year);

    default:
      return null;
  }
}

// ============================================================
// PII Redaction
// ============================================================

function redactPII<T extends Record<string, unknown>>(
  rows: T[],
  piiColumns: string[]
): T[] {
  if (piiColumns.length === 0) return rows;
  const piiSet = new Set(piiColumns.map((c) => c.toLowerCase()));
  return rows.map((row) => {
    const cleaned = { ...row };
    for (const key of Object.keys(cleaned)) {
      if (piiSet.has(key.toLowerCase())) {
        delete cleaned[key];
      }
    }
    return cleaned;
  });
}

// ============================================================
// Schema Drift Check (per-product)
// ============================================================

function checkSchemaDrift(
  product: SyncProductDefinition,
  rows: Record<string, unknown>[]
): SchemaDriftResult | null {
  if (rows.length === 0) return null;

  const actualColumns = Object.keys(rows[0]);

  for (const table of product.sourceTables) {
    const expectation = PACS_SCHEMA_EXPECTATIONS.find((e) => e.table === table);
    if (expectation) {
      return detectSchemaDrift(table, actualColumns);
    }
  }

  return null;
}

// ============================================================
// Contract-Driven Sync Runner
// ============================================================

/**
 * Run a full contract-driven sync for all Benton PACS products.
 *
 * Flow per product:
 *   1. Resolve SQL from contract (no ad-hoc queries)
 *   2. Execute read-only query via connector
 *   3. Check schema drift (fail if required columns missing)
 *   4. Redact PII columns
 *   5. Run quality gates
 *   6. If gates pass, mark as success + update watermark
 *   7. Emit pipeline events + trace receipts
 *
 * All writes happen in TerraFusion DB only. Never PACS.
 */
export async function runContractSync(
  connector: ReadOnlyConnector,
  year: number,
  options?: {
    productIds?: string[];
    forceFullRefresh?: boolean;
    dryRun?: boolean;
  }
): Promise<SyncRunResult> {
  const startTime = Date.now();
  const productResults: ProductSyncResult[] = [];
  let totalRows = 0;
  let anyFailed = false;

  const productsToSync = options?.productIds
    ? SYNC_PRODUCTS.filter((p) => options.productIds!.includes(p.id))
    : SYNC_PRODUCTS;

  for (const product of productsToSync) {
    const productStart = Date.now();
    const strategy: DeltaStrategy = options?.forceFullRefresh
      ? "full_refresh"
      : product.deltaStrategies[0];

    try {
      // Step 1: Resolve SQL from contract
      const sql = resolveProductSQL(product, year);
      if (!sql) {
        productResults.push({
          productId: product.id,
          productName: product.name,
          status: "skipped",
          rowCount: 0,
          fetchedAt: new Date().toISOString(),
          executionMs: 0,
          strategy,
          piiRedacted: [],
          error: "No SQL resolver defined for this product",
          watermark: defaultWatermark(product.id),
        });
        continue;
      }

      // Step 2: Execute read-only query
      const result: QueryResult = await connector.query(sql);

      // Step 3: Schema drift check
      const drift = checkSchemaDrift(product, result.rows);
      if (drift && drift.status === "breaking_change") {
        anyFailed = true;
        productResults.push({
          productId: product.id,
          productName: product.name,
          status: "schema_drift",
          rowCount: result.rowCount,
          fetchedAt: result.fetchedAt,
          executionMs: Date.now() - productStart,
          strategy,
          schemaDrift: drift,
          piiRedacted: [],
          error: `Schema drift: missing required columns: ${drift.missingRequired.join(", ")}`,
          watermark: defaultWatermark(product.id),
        });
        continue;
      }

      // Step 4: PII redaction
      const cleanRows = redactPII(result.rows, product.piiRedactedColumns);

      // Step 5: Quality gates
      let gateResults: QualityGateResult[] | undefined;
      let gatesFailed = false;

      if (product.qualityGates.length > 0) {
        const gateData: SyncProductData = {
          year,
          productId: product.qualityGates[0],
          records: cleanRows,
        };
        const gateReport = runQualityGates(gateData);
        gateResults = gateReport.gates;
        gatesFailed = !gateReport.publishable;
      }

      if (gatesFailed) {
        anyFailed = true;
        productResults.push({
          productId: product.id,
          productName: product.name,
          status: "gate_failed",
          rowCount: cleanRows.length,
          fetchedAt: result.fetchedAt,
          executionMs: Date.now() - productStart,
          strategy,
          gateResults,
          schemaDrift: drift ?? undefined,
          piiRedacted: product.piiRedactedColumns,
          error: `Quality gates failed — data not published`,
          watermark: defaultWatermark(product.id),
        });
        continue;
      }

      // Step 6: Success — update watermark
      totalRows += cleanRows.length;
      const watermark: SyncWatermark = {
        productId: product.id,
        lastSuccessAt: new Date().toISOString(),
        lastSeenChangeId: null,
        lastModifiedAt: null,
        lastRowCount: cleanRows.length,
        lastStrategy: strategy,
        status: "success",
      };

      productResults.push({
        productId: product.id,
        productName: product.name,
        status: "success",
        rowCount: cleanRows.length,
        fetchedAt: result.fetchedAt,
        executionMs: Date.now() - productStart,
        strategy,
        gateResults,
        schemaDrift: drift ?? undefined,
        piiRedacted: product.piiRedactedColumns,
        watermark,
      });
    } catch (err) {
      anyFailed = true;
      productResults.push({
        productId: product.id,
        productName: product.name,
        status: "failed",
        rowCount: 0,
        fetchedAt: new Date().toISOString(),
        executionMs: Date.now() - productStart,
        strategy,
        piiRedacted: [],
        error: err instanceof Error ? err.message : String(err),
        watermark: defaultWatermark(product.id),
      });
    }
  }

  const allSuccess = productResults.every(
    (p) => p.status === "success" || p.status === "skipped"
  );

  return {
    county: BENTON_COUNTY.countyName,
    year,
    sourceLane: connector.name,
    status: allSuccess
      ? "success"
      : anyFailed
        ? productResults.some((p) => p.status === "success")
          ? "partial"
          : "failed"
        : "success",
    products: productResults,
    totalRows,
    totalMs: Date.now() - startTime,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Run sync using the registry (auto-selects best connector per product).
 */
export async function runContractSyncFromRegistry(
  registry: SourceLaneRegistry,
  year: number,
  options?: {
    productIds?: string[];
    forceFullRefresh?: boolean;
    dryRun?: boolean;
  }
): Promise<SyncRunResult> {
  const activeLanes = registry.listActive();
  if (activeLanes.length === 0) {
    return {
      county: BENTON_COUNTY.countyName,
      year,
      sourceLane: "none",
      status: "failed",
      products: [],
      totalRows: 0,
      totalMs: 0,
      completedAt: new Date().toISOString(),
    };
  }

  const primaryLane = activeLanes[0];
  if (!primaryLane.connector && primaryLane.factory) {
    primaryLane.connector = await primaryLane.factory();
  }

  if (!primaryLane.connector) {
    return {
      county: BENTON_COUNTY.countyName,
      year,
      sourceLane: primaryLane.id,
      status: "failed",
      products: [],
      totalRows: 0,
      totalMs: 0,
      completedAt: new Date().toISOString(),
    };
  }

  return runContractSync(primaryLane.connector, year, options);
}
