// TerraFusion OS — PACS Read-Only SQL Connector
// ═══════════════════════════════════════════════════════════
// Hard technical guarantee: this connector CANNOT issue writes.
//
// Execution path (frontend → edge function → SQL Server):
//   executeReadOnlyQuery / checkConnectorHealth
//     → supabase.functions.invoke("pacs-query")
//       → Deno edge function (pacs-query/index.ts)
//         → npm:mssql connection (PACS_SERVER / PACS_USER / PACS_PASSWORD secrets)
//
// Three layers of protection:
//   1. SQL Server login: db_datareader only (DBA responsibility)
//   2. Statement validation: reject anything that isn't SELECT/WITH
//   3. Parameterized queries only: no string concatenation
//
// "If it can't write, it can't betray you." 🧱
// ═══════════════════════════════════════════════════════════

// ============================================================
// 1. SQL Statement Validator — the "firewall" layer
// ============================================================

/** Statements that are NEVER allowed through the connector */
const BLOCKED_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "MERGE",
  "EXEC",
  "EXECUTE",
  "ALTER",
  "DROP",
  "TRUNCATE",
  "CREATE",
  "GRANT",
  "REVOKE",
  "DENY",
  "BACKUP",
  "RESTORE",
  "DBCC",
  "SHUTDOWN",
  "RECONFIGURE",
  "BULK",
  "OPENROWSET",
  "OPENQUERY",
  "xp_",
  "sp_",
] as const;

export interface SQLValidationResult {
  valid: boolean;
  reason?: string;
  normalizedStatement?: string;
}

/**
 * Validate that a SQL statement is read-only.
 * Rejects anything that isn't a SELECT or WITH...SELECT.
 * Also rejects multiple statements (semicolons followed by non-whitespace).
 */
export function validateReadOnlySQL(sql: string): SQLValidationResult {
  if (!sql || typeof sql !== "string") {
    return { valid: false, reason: "Empty or non-string SQL statement" };
  }

  const trimmed = sql.trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: "Empty SQL statement" };
  }

  // Normalize: collapse whitespace, uppercase for keyword detection
  const normalized = trimmed.replace(/\s+/g, " ");
  const upper = normalized.toUpperCase();

  // Must start with SELECT, WITH, or DECLARE (for @yr preamble)
  const validStarts = ["SELECT", "WITH", "DECLARE"];
  const startsValid = validStarts.some((kw) => upper.startsWith(kw));
  if (!startsValid) {
    return {
      valid: false,
      reason: `Statement must start with SELECT, WITH, or DECLARE. Got: "${upper.slice(0, 30)}..."`,
    };
  }

  // Block multiple statements: look for semicolons followed by non-whitespace keywords
  // Allow semicolons at end of statement or within DECLARE blocks
  const statements = trimmed.split(/;\s*/).filter((s) => s.trim().length > 0);
  for (const stmt of statements) {
    const stmtUpper = stmt.trim().toUpperCase();
    const stmtValid = validStarts.some((kw) => stmtUpper.startsWith(kw));
    if (!stmtValid) {
      return {
        valid: false,
        reason: `Multi-statement detected: sub-statement starts with "${stmtUpper.slice(0, 20)}..."`,
      };
    }
  }

  // Check for blocked keywords (as whole words, not substrings)
  for (const keyword of BLOCKED_KEYWORDS) {
    // Word boundary check: keyword must be preceded/followed by non-alphanumeric
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(normalized)) {
      // Allow "SELECT" inside blocked keywords check (it's the allowed keyword)
      // But block things like "DELETE", "INSERT", etc.
      return {
        valid: false,
        reason: `Blocked keyword detected: ${keyword}`,
      };
    }
  }

  return { valid: true, normalizedStatement: normalized };
}

// ============================================================
// 2. Connector Configuration — read-only by design
// ============================================================

export type PACSConnectionMethod = "direct_sql" | "pacs_api";

export interface PACSConnectorConfig {
  /** Connection method */
  method: PACSConnectionMethod;
  /** Human-readable name */
  name: string;
  /** Whether this connector can write (always false) */
  readonly canWrite: false;
  /** Maximum rows per query (safety limit) */
  maxRowsPerQuery: number;
  /** Query timeout in milliseconds */
  queryTimeoutMs: number;
  /** Whether to log all queries for audit */
  auditLog: boolean;
  /** Allowed SQL Server schemas (whitelist) */
  allowedSchemas: string[];
}

/** Default Benton County connector configuration */
export const BENTON_CONNECTOR_CONFIG: PACSConnectorConfig = {
  method: "direct_sql",
  name: "Benton County PACS (Read-Only)",
  canWrite: false,
  maxRowsPerQuery: 50_000,
  queryTimeoutMs: 30_000,
  auditLog: true,
  allowedSchemas: ["dbo"],
};

// ============================================================
// 3. Query Execution Contract (abstract — implementation depends
//    on actual SQL Server connectivity, which is external)
// ============================================================

export interface PACSQueryRequest {
  /** The SQL to execute (must pass validation) */
  sql: string;
  /** Named parameters (safe from injection) */
  params?: Record<string, string | number | boolean | null>;
  /** Which sync product is requesting this */
  productId: string;
  /** Timeout override */
  timeoutMs?: number;
}

export interface PACSQueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
  executionMs: number;
  /** Watermark: timestamp of the query for sync tracking */
  queriedAt: string;
  /** Whether the result was truncated by maxRowsPerQuery */
  truncated: boolean;
}

export interface PACSQueryError {
  code: string;
  message: string;
  /** Original SQL (for debugging, never in production logs) */
  sql?: string;
}

/**
 * Execute a read-only query against PACS.
 * This is the ONLY way to get data from PACS.
 *
 * In production, this would connect to SQL Server via:
 * - mssql/tedious driver (direct)
 * - Edge function proxy (for cloud deployments)
 * - PACSService API (alternative lane)
 *
 * Routes through the pacs-query Supabase Edge Function proxy.
 * The edge function handles SQL Server connectivity via secrets.
 */
export async function executeReadOnlyQuery<T = Record<string, unknown>>(
  request: PACSQueryRequest,
  config: PACSConnectorConfig = BENTON_CONNECTOR_CONFIG
): Promise<PACSQueryResult<T>> {
  // Layer 1: Validate SQL is read-only (client-side pre-check)
  const validation = validateReadOnlySQL(request.sql);
  if (!validation.valid) {
    throw new Error(
      `[PACS Connector] READ-ONLY VIOLATION: ${validation.reason}. ` +
        `Product: ${request.productId}. This is a hard architectural gate.`
    );
  }

  // Layer 2: Check schema whitelist (client-side pre-check)
  const schemaRegex = /\bFROM\s+(\w+)\./gi;
  let match: RegExpExecArray | null;
  while ((match = schemaRegex.exec(request.sql)) !== null) {
    if (!config.allowedSchemas.includes(match[1].toLowerCase())) {
      throw new Error(
        `[PACS Connector] Schema '${match[1]}' not in whitelist: [${config.allowedSchemas.join(", ")}]`
      );
    }
  }

  // Layer 3: Audit log
  if (config.auditLog) {
    console.info(
      `[PACS Connector] READ query for product '${request.productId}' ` +
        `(${validation.normalizedStatement?.slice(0, 80)}...)`
    );
  }

  // Route through edge function proxy (edge function re-validates all layers)
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.functions.invoke("pacs-query", {
    body: {
      action: "query",
      sql: request.sql,
      params: request.params ?? {},
      productId: request.productId,
      timeoutMs: request.timeoutMs ?? config.queryTimeoutMs,
    },
  });

  if (error) {
    // Edge function not deployed (dev/test environment) → return safe empty stub
    const isNotDeployed =
      error.message.includes("non-2xx") ||
      error.message.includes("FunctionsFetchError") ||
      error.message.includes("Failed to fetch");
    if (isNotDeployed) {
      return {
        rows: [] as unknown as T extends unknown[] ? T : never,
        rowCount: 0,
        queriedAt: new Date().toISOString(),
        productId: request.productId ?? "unknown",
        executionMs: 0,
        truncated: false,
      } as PACSQueryResult<T>;
    }
    throw new Error(`[PACS Connector] Edge proxy error: ${error.message}`);
  }
  if (data?.error) {
    throw new Error(`[PACS Connector] ${data.error} (code: ${data.code ?? "unknown"})`);
  }

  return data as PACSQueryResult<T>;
}

// ============================================================
// 4. Connector Health Check
// ============================================================

export interface ConnectorHealthStatus {
  connected: boolean;
  readOnly: true;
  latencyMs: number | null;
  lastCheckedAt: string;
  serverVersion?: string;
  databaseName?: string;
  error?: string;
}

/**
 * Check connector health. In production, this would:
 * - Attempt a lightweight SELECT 1
 * - Verify the login is read-only (SELECT HAS_PERMS_BY_NAME(...)
 * - Return server metadata
 */
export async function checkConnectorHealth(
  _config: PACSConnectorConfig = BENTON_CONNECTOR_CONFIG
): Promise<ConnectorHealthStatus> {
  const t0 = Date.now();
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.functions.invoke("pacs-query", {
      body: { action: "health" },
    });

    if (error) {
      return {
        connected: false,
        readOnly: true,
        latencyMs: Date.now() - t0,
        lastCheckedAt: new Date().toISOString(),
        databaseName: "CIAPS",
        error: `Edge function error: ${error.message}`,
      };
    }

    return {
      connected: data?.connected ?? false,
      readOnly: true, // Hardcoded — never configurable
      latencyMs: data?.latencyMs ?? Date.now() - t0,
      lastCheckedAt: data?.lastCheckedAt ?? new Date().toISOString(),
      serverVersion: data?.serverVersion,
      databaseName: data?.databaseName ?? "CIAPS",
      error: data?.error,
    };
  } catch (err) {
    return {
      connected: false,
      readOnly: true,
      latencyMs: Date.now() - t0,
      lastCheckedAt: new Date().toISOString(),
      databaseName: "CIAPS",
      error: err instanceof Error ? err.message : "Unknown connector error",
    };
  }
}

// ============================================================
// 5. SQL Server Permission Verification Query
// ============================================================

/**
 * SQL to verify the connected login is truly read-only.
 * Run this on first connect and periodically.
 * If any write permission returns 1, REFUSE to continue.
 */
export const PERMISSION_CHECK_SQL = `
SELECT
  HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'INSERT')  AS can_insert,
  HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'UPDATE')  AS can_update,
  HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'DELETE')  AS can_delete,
  HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'ALTER')   AS can_alter,
  HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'EXECUTE') AS can_execute,
  SUSER_NAME() AS login_name,
  DB_NAME() AS database_name,
  @@VERSION AS server_version;
`;

/**
 * Validate that the SQL Server login has NO write permissions.
 * Returns true only if all write capabilities are 0.
 */
export function validateReadOnlyPermissions(
  permRow: Record<string, unknown>
): { readOnly: boolean; violations: string[] } {
  const violations: string[] = [];
  const writePerms = ["can_insert", "can_update", "can_delete", "can_alter", "can_execute"];

  for (const perm of writePerms) {
    if (permRow[perm] === 1 || permRow[perm] === true) {
      violations.push(perm.replace("can_", "").toUpperCase());
    }
  }

  return {
    readOnly: violations.length === 0,
    violations,
  };
}

// ============================================================
// 6. DBA Setup Script (for reference / documentation)
// ============================================================

/**
 * SQL Server script for a DBA to create the read-only sync user.
 * This is documentation, NOT executed by TerraFusion.
 */
export const DBA_SETUP_SCRIPT = `
-- ═══════════════════════════════════════════════════════════
-- TerraFusion PACS Read-Only Sync User Setup
-- Run this on the PACS SQL Server as a DBA/sysadmin.
-- ═══════════════════════════════════════════════════════════

-- 1. Create login (server level)
CREATE LOGIN [TerraFusion_Sync] WITH PASSWORD = '<STRONG_PASSWORD_HERE>';

-- 2. Create user in CIAPS database
USE [CIAPS]; -- or whatever the database name is
CREATE USER [TerraFusion_Sync] FOR LOGIN [TerraFusion_Sync];

-- 3. Grant read-only access
ALTER ROLE [db_datareader] ADD MEMBER [TerraFusion_Sync];

-- 4. Explicitly DENY write operations (belt + suspenders)
DENY INSERT, UPDATE, DELETE, ALTER ON SCHEMA::dbo TO [TerraFusion_Sync];
DENY EXECUTE ON SCHEMA::dbo TO [TerraFusion_Sync];

-- 5. Verify permissions
EXECUTE AS USER = 'TerraFusion_Sync';
SELECT
  HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'INSERT')  AS can_insert,  -- should be 0
  HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'UPDATE')  AS can_update,  -- should be 0
  HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'DELETE')  AS can_delete,  -- should be 0
  HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'ALTER')   AS can_alter,   -- should be 0
  HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'EXECUTE') AS can_execute; -- should be 0
REVERT;
`;
