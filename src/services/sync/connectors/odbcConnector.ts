// TerraFusion OS — ODBC Read-Only Connector (ProVal / Asend / Manatron Access .mdb)
// ═══════════════════════════════════════════════════════════
// For legacy Access databases on a Windows extractor host.
// Access ODBC drivers are Windows-only; this connector is used
// by a small "extractor agent" running near the legacy files.
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
 *   2. Access databases opened with ReadOnly=1 in connection string
 *   3. No write operations exposed in the interface
 */
export class OdbcReadOnlyConnector implements ReadOnlyConnector {
  kind: "odbc" = "odbc";
  name: string;

  capabilities: SourceCapabilities = {
    readonly: true,
    supportsParameterizedQueries: true,
    supportsIntrospection: true,
    supportsIncrementalWatermarks: false, // Access .mdb lacks change tracking
    notes: [
      "ODBC connector for legacy Access .mdb databases.",
      "Requires Windows host with Microsoft Access ODBC driver.",
      "Read-only: SQL validation + ReadOnly=1 connection flag.",
    ],
  };

  private connectionString: string;
  private queryTimeoutMs: number;

  constructor(options: OdbcConnectorOptions) {
    this.name = options.name;
    this.connectionString = options.connectionString;
    this.queryTimeoutMs = options.queryTimeoutMs ?? 30_000;
  }

  async query<Row = Record<string, unknown>>(
    sql: string,
    _params?: Record<string, string | number | boolean | null>
  ): Promise<QueryResult<Row>> {
    // Read-only enforcement
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
    return [];
  }

  async close(): Promise<void> {
    // In production: close ODBC connection
  }
}
