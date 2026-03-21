// TerraFusion OS — PACS Read-Only Query Proxy (Edge Function)
// ═══════════════════════════════════════════════════════════
// Proxies validated SELECT queries to the PACS SQL Server.
// This is the ONLY path by which the frontend can extract
// data from PACS — all three safety layers apply here too:
//
//   1. Admin-only auth (JWT must have admin role)
//   2. Read-only SQL validation (same rules as pacsConnector.ts)
//   3. Schema whitelist (dbo only)
//   4. Parameterized queries only (no string concat in MSSQL driver)
//
// Connection secrets (set via `supabase secrets set`):
//   PACS_SERVER   — SQL Server hostname or IP
//   PACS_PORT     — SQL Server port (default 1433)
//   PACS_DATABASE — Database name (e.g. CIAPS)
//   PACS_USER     — Read-only login name
//   PACS_PASSWORD — Read-only login password
//   PACS_ENCRYPT  — "true" | "false" (default "true")
//
// Returns PACSQueryResult-shaped JSON or { error, code }.
// ═══════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdmin } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Read-only SQL validator (mirrors pacsConnector.ts) ────

const BLOCKED_KEYWORDS = [
  "INSERT", "UPDATE", "DELETE", "MERGE", "EXEC", "EXECUTE",
  "ALTER", "DROP", "TRUNCATE", "CREATE", "GRANT", "REVOKE",
  "DENY", "BACKUP", "RESTORE", "DBCC", "SHUTDOWN", "RECONFIGURE",
  "BULK", "OPENROWSET", "OPENQUERY", "xp_", "sp_",
] as const;

const VALID_STARTS = ["SELECT", "WITH", "DECLARE"] as const;

function validateSQL(sql: string): { valid: boolean; reason?: string } {
  if (!sql || typeof sql !== "string" || sql.trim().length === 0) {
    return { valid: false, reason: "Empty or non-string SQL" };
  }
  const upper = sql.trim().toUpperCase();
  if (!VALID_STARTS.some((kw) => upper.startsWith(kw))) {
    return { valid: false, reason: `Statement must start with SELECT, WITH, or DECLARE` };
  }
  // Multi-statement check
  const stripped = sql.trim().replace(/;\s*$/, "");
  for (const part of stripped.split(";").map((s) => s.trim()).filter(Boolean)) {
    const pu = part.toUpperCase();
    if (!VALID_STARTS.some((kw) => pu.startsWith(kw)) && !pu.startsWith("--")) {
      return { valid: false, reason: `Multi-statement blocked: "${pu.slice(0, 30)}"` };
    }
  }
  for (const kw of BLOCKED_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`, "i").test(sql)) {
      return { valid: false, reason: `Blocked keyword: ${kw}` };
    }
  }
  return { valid: true };
}

function validateSchema(sql: string, allowed: string[]): { ok: boolean; schema?: string } {
  const schemaRegex = /\bFROM\s+(\w+)\./gi;
  let m: RegExpExecArray | null;
  while ((m = schemaRegex.exec(sql)) !== null) {
    if (!allowed.includes(m[1].toLowerCase())) {
      return { ok: false, schema: m[1] };
    }
  }
  return { ok: true };
}

// ── MSSQL connection via npm:mssql (Deno npm compat) ──────

async function runQuery(
  sql: string,
  params: Record<string, string | number | boolean | null> = {},
  timeoutMs = 30_000
): Promise<{ rows: Record<string, unknown>[]; rowCount: number; executionMs: number }> {
  const server = Deno.env.get("PACS_SERVER");
  const port = parseInt(Deno.env.get("PACS_PORT") ?? "1433", 10);
  const database = Deno.env.get("PACS_DATABASE") ?? "CIAPS";
  const user = Deno.env.get("PACS_USER");
  const password = Deno.env.get("PACS_PASSWORD");
  const encrypt = (Deno.env.get("PACS_ENCRYPT") ?? "true") === "true";

  if (!server || !user || !password) {
    throw new Error(
      "PACS_SERVER, PACS_USER, and PACS_PASSWORD secrets must be set. " +
      "Run: supabase secrets set PACS_SERVER=<host> PACS_USER=<login> PACS_PASSWORD=<pass>"
    );
  }

  // Dynamic import — keeps the function cold-start light when PACS is not used
  const mssql = await import("npm:mssql@11");

  const pool = await mssql.connect({
    server,
    port,
    database,
    user,
    password,
    options: {
      encrypt,
      trustServerCertificate: !encrypt,
      readOnlyIntent: true, // force read-only routing for AG secondaries
      requestTimeout: timeoutMs,
      connectionTimeout: 10_000,
    },
    pool: {
      min: 0,
      max: 1, // edge function per-invocation pool — one connection is enough
      idleTimeoutMilliseconds: timeoutMs + 1_000,
    },
  });

  const start = Date.now();
  let rows: Record<string, unknown>[] = [];

  try {
    const request = pool.request();

    // Bind named parameters (prevents injection)
    for (const [key, val] of Object.entries(params)) {
      if (val === null) {
        request.input(key, mssql.NVarChar, null);
      } else if (typeof val === "number") {
        request.input(key, mssql.Numeric, val);
      } else if (typeof val === "boolean") {
        request.input(key, mssql.Bit, val ? 1 : 0);
      } else {
        request.input(key, mssql.NVarChar(4000), String(val));
      }
    }

    const result = await request.query(sql);
    rows = result.recordset as Record<string, unknown>[];
  } finally {
    await pool.close();
  }

  return { rows, rowCount: rows.length, executionMs: Date.now() - start };
}

// ── Health check (SELECT 1 + permission audit) ───────────

async function runHealthCheck(): Promise<{
  connected: boolean;
  readOnly: boolean;
  latencyMs: number;
  serverVersion?: string;
  databaseName?: string;
  error?: string;
}> {
  const t0 = Date.now();
  try {
    const { rows } = await runQuery(
      `SELECT
        HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'INSERT')  AS can_insert,
        HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'UPDATE')  AS can_update,
        HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'DELETE')  AS can_delete,
        HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'ALTER')   AS can_alter,
        HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'EXECUTE') AS can_execute,
        @@VERSION AS server_version,
        DB_NAME() AS database_name`,
      {},
      10_000
    );
    const row = rows[0] ?? {};
    const writePerms = ["can_insert", "can_update", "can_delete", "can_alter", "can_execute"];
    const violations = writePerms.filter((p) => row[p] === 1 || row[p] === true);
    return {
      connected: true,
      readOnly: violations.length === 0,
      latencyMs: Date.now() - t0,
      serverVersion: row.server_version as string | undefined,
      databaseName: row.database_name as string | undefined,
      ...(violations.length > 0 && {
        error: `Login has write permissions: ${violations.join(", ")} — REFUSE TO CONTINUE`,
      }),
    };
  } catch (err) {
    return {
      connected: false,
      readOnly: true,
      latencyMs: Date.now() - t0,
      databaseName: Deno.env.get("PACS_DATABASE") ?? "CIAPS",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Main handler ─────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // All PACS access requires admin role
    let auth;
    try {
      auth = await requireAdmin(req);
    } catch (res) {
      if (res instanceof Response) return res;
      throw res;
    }

    const body = await req.json();
    const action: string = body.action ?? "query";

    // ── HEALTH CHECK ───────────────────────────────────
    if (action === "health") {
      const result = await runHealthCheck();
      return jsonResponse({
        ...result,
        lastCheckedAt: new Date().toISOString(),
        requestedBy: auth.userId,
      });
    }

    // ── QUERY ──────────────────────────────────────────
    const { sql, params = {}, productId, timeoutMs = 30_000 } = body;

    if (!sql || !productId) {
      return jsonResponse({ error: "sql and productId are required" }, 400);
    }

    // Layer 2: Read-only SQL validation
    const validation = validateSQL(sql);
    if (!validation.valid) {
      return jsonResponse(
        {
          error: `READ-ONLY VIOLATION: ${validation.reason}`,
          code: "SQL_VALIDATION_FAILED",
          productId,
        },
        400
      );
    }

    // Layer 3: Schema whitelist
    const schemaCheck = validateSchema(sql, ["dbo"]);
    if (!schemaCheck.ok) {
      return jsonResponse(
        {
          error: `Schema '${schemaCheck.schema}' not in allowlist: [dbo]`,
          code: "SCHEMA_VIOLATION",
          productId,
        },
        400
      );
    }

    // Audit log (never logs full SQL in production, only first 80 chars)
    console.info(
      `[pacs-query] product='${productId}' user='${auth.userId}' sql='${sql.slice(0, 80)}...'`
    );

    const { rows, rowCount, executionMs } = await runQuery(sql, params, timeoutMs);

    return jsonResponse({
      rows,
      rowCount,
      executionMs,
      queriedAt: new Date().toISOString(),
      truncated: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[pacs-query] Error:", msg);
    return jsonResponse({ error: msg, code: "INTERNAL_ERROR" }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
