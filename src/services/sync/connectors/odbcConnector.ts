// TerraFusion OS — ODBC Read-Only Connector (ProVal / Asend / Manatron Access .mdb)
// ═══════════════════════════════════════════════════════════
// For legacy Access databases on a Windows extractor host.
// Access ODBC drivers are Windows-only; this connector is used
// by a small "extractor agent" running near the legacy files.
//
// Capabilities are limited vs SQL Server:
//   - No year-scoped hood (varies by schema)
//   - No SQL Server dialect (DECLARE/TRY_CONVERT unsupported)
//   - Introspection via ODBC catalog functions
//
// 🐸 ODBC is like a tunnel. Sometimes it smells like pennies. It still works.
// ═══════════════════════════════════════════════════════════

import { validateReadOnlySQL } from "@/services/pacsConnector";
import type {
  ReadOnlyConnector,
  QueryResult,
  SourceCapabilities,
  ColumnInfo,
} from "./types";

export interface OdbcConnectorOptions {
  /** Unique name for this connector instance */
  name: string;
  /** ODBC connection string (DSN or driver string) */
  connectionString: string;
  /** Query timeout in ms */
  queryTimeoutMs?: number;
  /** Override capabilities for specific legacy systems */
  capabilityOverrides?: Partial<Omit<SourceCapabilities, "readonly">>;
}

/**
 * Defense-in-depth guard for ODBC connector.
 * Access SQL is simpler but we still block writes.
 */
function odbcLayerGuard(sql: string): void {
  const trimmed = sql.trim();
  if (!trimmed) throw new Error("[OdbcConnector] Empty SQL statement.");

  // Block EXEC (Access doesn't support it but someone might try)
  if (/\bEXEC(UTE)?\s/i.test(trimmed)) {
    throw new Error("[OdbcConnector] EXEC/EXECUTE blocked.");
  }

  // Block multiple statements
  const stripped = trimmed.replace(/;\s*$/, "");
  if (stripped.includes(";")) {
    throw new Error("[OdbcConnector] Multi-statement SQL blocked.");
  }
}

/**
 * ODBC Read-Only Connector.
 *
 * Used for legacy Access .mdb files (ProVal, Asend, Manatron).
 * In production, this would use the `odbc` npm package on a Windows host.
 * Currently returns contract-shaped stubs.
 *
 * Read-only enforcement:
 *   1. SQL validation via validateReadOnlySQL()
 *   2. ODBC layer guard (EXEC/multi-statement blocking)
 *   3. Access databases opened with ReadOnly=1 in connection string
 *   4. No write operations exposed in the interface
 */
export class OdbcReadOnlyConnector implements ReadOnlyConnector {
  kind: "odbc" = "odbc";
  name: string;

  capabilities: SourceCapabilities;

  private connectionString: string;
  private queryTimeoutMs: number;

  constructor(options: OdbcConnectorOptions) {
    this.name = options.name;
    this.connectionString = options.connectionString;
    this.queryTimeoutMs = options.queryTimeoutMs ?? 30_000;

    // Default capabilities for ODBC/Access — limited vs SQL Server
    this.capabilities = {
      readonly: true,
      supportsParameterizedQueries: true,
      supportsIntrospection: true,
      supportsIncrementalWatermarks: false, // Access .mdb lacks change tracking
      supportsYearScopedHood: false, // Schema-dependent, off by default
      supportsWorkflows: false, // Schema-dependent, off by default
      supportsSqlServerDialect: false, // Access uses Jet SQL, not T-SQL
      notes: [
        "ODBC connector for legacy Access .mdb databases.",
        "Requires Windows host with Microsoft Access ODBC driver.",
        "Read-only: SQL validation + ODBC guard + ReadOnly=1 connection flag.",
      ],
      // Apply overrides
      ...options.capabilityOverrides,
    };
  }

  async query<Row = Record<string, unknown>>(
    sql: string,
    _params?: Record<string, string | number | boolean | null>
  ): Promise<QueryResult<Row>> {
    // Layer 1: ODBC-level defense-in-depth guard
    odbcLayerGuard(sql);

    // Layer 2: Read-only enforcement
    const validation = validateReadOnlySQL(sql);
    if (!validation.valid) {
      throw new Error(
        `[OdbcConnector:${this.name}] READ-ONLY VIOLATION: ${validation.reason}`
      );
    }

    const startTime = Date.now();

    // In production: would use odbc.connect(this.connectionString)
    // then conn.query(sql, params)
    // For now: return contract-shaped stub
    return {
      rows: [] as Row[],
      fetchedAt: new Date().toISOString(),
      source: this.name,
      rowCount: 0,
      executionMs: Date.now() - startTime,
      truncated: false,
    };
  }

  async listTables(): Promise<string[]> {
    // In production: use ODBC catalog functions
    // conn.tables(null, null, null, "TABLE")
    return [];
  }

  async listColumns(table: string): Promise<ColumnInfo[]> {
    // In production: use ODBC catalog functions
    // conn.columns(null, null, table, null)
    void table;
    return [];
  }

  async close(): Promise<void> {
    // In production: close ODBC connection
  }
}
