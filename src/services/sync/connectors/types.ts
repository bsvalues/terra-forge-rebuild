// TerraFusion OS — Read-Only Connector Interface
// ═══════════════════════════════════════════════════════════
// Military-grade connector contract. It salutes and then forgets its name.
//
// ALL connectors are read-only by design. The `readonly: true` property
// is hardcoded in capabilities — there is no "writable connector."
// ═══════════════════════════════════════════════════════════

export type SourceKind = "sqlserver" | "odbc" | "api" | "files";

export interface SourceCapabilities {
  /** Always true. There is no writable connector. */
  readonly readonly: true;
  /** Whether the connector supports @p0-style parameterized queries */
  supportsParameterizedQueries: boolean;
  /** Whether listTables/listColumns are available */
  supportsIntrospection: boolean;
  /** Whether incremental watermark-based sync is possible */
  supportsIncrementalWatermarks: boolean;
  /** Whether year-scoped hood_cd joins are available */
  supportsYearScopedHood: boolean;
  /** Whether workflow tables (appeals/permits/exemptions) are available */
  supportsWorkflows: boolean;
  /** Whether DECLARE @var / CTE / ROW_NUMBER patterns work */
  supportsSqlServerDialect: boolean;
  /** Human-readable notes about this connector */
  notes?: string[];
}

export interface QueryResult<Row = Record<string, unknown>> {
  /** The fetched rows */
  rows: Row[];
  /** ISO timestamp of when the query completed */
  fetchedAt: string;
  /** Source connector name (e.g. "pacs_benton_sql") */
  source: string;
  /** Number of rows returned */
  rowCount: number;
  /** Query execution time in milliseconds */
  executionMs: number;
  /** Whether the result was truncated */
  truncated: boolean;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

/**
 * Read-Only Connector — the universal interface for all data sources.
 *
 * Implementations:
 *   - SqlServerReadOnlyConnector (direct SQL via mssql/tedious)
 *   - OdbcReadOnlyConnector (Access .mdb via ODBC on Windows extractor)
 *   - ApiReadOnlyConnector (future: PACSService API)
 *   - FileReadOnlyConnector (future: CSV/Excel static imports)
 */
export interface ReadOnlyConnector {
  /** What kind of source this is */
  kind: SourceKind;
  /** Unique connector name (e.g. "pacs_benton_sql") */
  name: string;
  /** Connector capabilities — always read-only */
  capabilities: SourceCapabilities;

  /**
   * Execute a read-only SQL query.
   * The connector MUST validate SQL is read-only before executing.
   * @throws if SQL contains write operations
   */
  query<Row = Record<string, unknown>>(
    sql: string,
    params?: Record<string, string | number | boolean | null>
  ): Promise<QueryResult<Row>>;

  /** List all tables (optional, depends on supportsIntrospection) */
  listTables?(): Promise<string[]>;

  /** List columns for a table (optional, depends on supportsIntrospection) */
  listColumns?(table: string): Promise<ColumnInfo[]>;

  /** Close the connection */
  close(): Promise<void>;
}

/**
 * Connector factory function signature.
 * Used by the registry to create connectors on demand.
 */
export type ConnectorFactory = () => Promise<ReadOnlyConnector>;

// ============================================================
// Product Capability Requirements
// ============================================================

/**
 * Defines the minimum capabilities a connector must have
 * to serve a given sync product.
 */
export interface ProductCapabilityRequirements {
  /** Product ID (must match SYNC_PRODUCTS[].id) */
  productId: string;
  /** Minimum capabilities to serve this product */
  requires: Partial<Omit<SourceCapabilities, "readonly" | "notes">>;
}

/**
 * Check if a connector satisfies capability requirements for a product.
 */
export function connectorSatisfiesRequirements(
  connector: ReadOnlyConnector,
  requirements: ProductCapabilityRequirements
): boolean {
  const caps = connector.capabilities;
  const reqs = requirements.requires;

  if (reqs.supportsParameterizedQueries && !caps.supportsParameterizedQueries) return false;
  if (reqs.supportsIntrospection && !caps.supportsIntrospection) return false;
  if (reqs.supportsIncrementalWatermarks && !caps.supportsIncrementalWatermarks) return false;
  if (reqs.supportsYearScopedHood && !caps.supportsYearScopedHood) return false;
  if (reqs.supportsWorkflows && !caps.supportsWorkflows) return false;
  if (reqs.supportsSqlServerDialect && !caps.supportsSqlServerDialect) return false;

  return true;
}

/**
 * Benton product capability requirements.
 * Defines what each product needs from a connector.
 */
export const BENTON_PRODUCT_REQUIREMENTS: ProductCapabilityRequirements[] = [
  {
    productId: "pacs_current_year_property_core",
    requires: { supportsSqlServerDialect: true },
  },
  {
    productId: "pacs_current_year_property_val",
    requires: { supportsYearScopedHood: true, supportsSqlServerDialect: true },
  },
  {
    productId: "pacs_current_year_neighborhood_dim",
    requires: { supportsYearScopedHood: true },
  },
  {
    productId: "pacs_workflow_appeals_current_year",
    requires: { supportsWorkflows: true, supportsSqlServerDialect: true },
  },
  {
    productId: "pacs_workflow_permits_open",
    requires: { supportsWorkflows: true, supportsSqlServerDialect: true },
  },
  {
    productId: "pacs_workflow_exemptions_pending",
    requires: { supportsWorkflows: true, supportsSqlServerDialect: true },
  },
];
