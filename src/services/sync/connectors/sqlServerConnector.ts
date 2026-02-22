// TerraFusion OS — SQL Server Read-Only Connector
// ═══════════════════════════════════════════════════════════
// Connects to PACS SQL Server via the PACS Connector layer.
// FOUR layers of read-only enforcement:
//   1. SQL Server login: db_datareader only (DBA responsibility)
//   2. Statement validation via pacsConnector.validateReadOnlySQL()
//   3. Schema whitelist via pacsConnector.executeReadOnlyQuery()
//   4. Connector-level EXEC/semicolon blocking (defense-in-depth)
//
// 🐶 It fetches rows and wags its tail. It cannot write. Ever.
// ═══════════════════════════════════════════════════════════

import {
  validateReadOnlySQL,
  executeReadOnlyQuery,
  type PACSConnectorConfig,
  type PACSQueryResult,
  BENTON_CONNECTOR_CONFIG,
} from "@/services/pacsConnector";
import type {
  ReadOnlyConnector,
  QueryResult,
  SourceCapabilities,
  ColumnInfo,
} from "./types";

export interface SqlServerConnectorOptions {
  /** Unique name for this connector instance */
  name: string;
  /** PACS connector config (schema whitelist, timeouts, etc.) */
  config?: PACSConnectorConfig;
}

/**
 * Defense-in-depth: secondary blocking at the connector layer.
 * Even if validateReadOnlySQL() misses something, this catches it.
 * Blocks EXEC patterns and dangerous multi-statement payloads.
 */
function connectorLayerGuard(sql: string): void {
  const trimmed = sql.trim();

  // Block truly empty
  if (!trimmed) throw new Error("[SqlServerConnector] Empty SQL statement.");

  // Secondary semicolon check: count non-trailing semicolons
  const stripped = trimmed.replace(/;\s*$/, ""); // remove trailing semicolon
  if (stripped.includes(";")) {
    // Allow DECLARE blocks with semicolons (e.g. DECLARE @yr int = 2025;)
    const parts = stripped.split(";").map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      const upper = part.toUpperCase();
      if (
        !upper.startsWith("DECLARE") &&
        !upper.startsWith("SELECT") &&
        !upper.startsWith("WITH") &&
        !upper.startsWith("--")
      ) {
        throw new Error(
          `[SqlServerConnector] Blocked multi-statement: sub-statement starts with "${upper.slice(0, 30)}..."`
        );
      }
    }
  }

  // Secondary EXEC block (case-insensitive word boundary)
  const upper = trimmed.toUpperCase();
  if (/\bEXEC(UTE)?\s/i.test(upper)) {
    throw new Error("[SqlServerConnector] EXEC/EXECUTE blocked at connector layer.");
  }
}

/**
 * SQL Server Read-Only Connector.
 *
 * Wraps the existing pacsConnector infrastructure to provide
 * a standardized ReadOnlyConnector interface for the sync kernel.
 *
 * In production, `executeReadOnlyQuery` would connect to SQL Server
 * via mssql/tedious. Currently returns stub results shaped correctly.
 */
export class SqlServerReadOnlyConnector implements ReadOnlyConnector {
  kind: "sqlserver" = "sqlserver";
  name: string;

  capabilities: SourceCapabilities = {
    readonly: true,
    supportsParameterizedQueries: true,
    supportsIntrospection: true,
    supportsIncrementalWatermarks: true,
    supportsYearScopedHood: true,
    supportsWorkflows: true,
    supportsSqlServerDialect: true,
    notes: [
      "SQL Server connector with quadruple read-only enforcement.",
      "Statement validation + schema whitelist + db_datareader login + connector guard.",
    ],
  };

  private config: PACSConnectorConfig;

  constructor(options: SqlServerConnectorOptions) {
    this.name = options.name;
    this.config = options.config ?? BENTON_CONNECTOR_CONFIG;
  }

  async query<Row = Record<string, unknown>>(
    sql: string,
    params?: Record<string, string | number | boolean | null>
  ): Promise<QueryResult<Row>> {
    // Layer 0: Connector-level defense-in-depth guard
    connectorLayerGuard(sql);

    // Layer 1: Pre-validate read-only (redundant with executeReadOnlyQuery, but defense-in-depth)
    const validation = validateReadOnlySQL(sql);
    if (!validation.valid) {
      throw new Error(
        `[SqlServerConnector:${this.name}] READ-ONLY VIOLATION: ${validation.reason}`
      );
    }

    const result: PACSQueryResult<Row> = await executeReadOnlyQuery<Row>(
      {
        sql,
        params: params ?? undefined,
        productId: this.name,
        timeoutMs: this.config.queryTimeoutMs,
      },
      this.config
    );

    return {
      rows: result.rows,
      fetchedAt: result.queriedAt,
      source: this.name,
      rowCount: result.rowCount,
      executionMs: result.executionMs,
      truncated: result.truncated,
    };
  }

  async listTables(): Promise<string[]> {
    const result = await this.query<{ name: string }>(`
      SELECT TABLE_SCHEMA + '.' + TABLE_NAME AS name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);
    return result.rows.map((r) => r.name);
  }

  async listColumns(table: string): Promise<ColumnInfo[]> {
    const [schema, name] = table.includes(".")
      ? table.split(".")
      : ["dbo", table];
    const result = await this.query<{
      name: string;
      type: string;
      nullable: number;
    }>(`
      SELECT
        COLUMN_NAME AS name,
        DATA_TYPE AS type,
        CASE WHEN IS_NULLABLE = 'YES' THEN 1 ELSE 0 END AS nullable
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${name}'
      ORDER BY ORDINAL_POSITION
    `);
    return result.rows.map((r) => ({
      name: r.name,
      type: r.type,
      nullable: !!r.nullable,
    }));
  }

  async close(): Promise<void> {
    // Connection pool cleanup happens in pacsConnector layer
  }
}
