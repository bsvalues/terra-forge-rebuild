// TerraFusion OS — Year Doctrine Discovery & Enforcement
// ═══════════════════════════════════════════════════════════
// Legacy CAMA systems hide "year" in unpredictable places.
// This module:
//   1. Defines the possible Year Doctrines
//   2. Discovers which doctrine a source uses (via introspection)
//   3. Resolves the current appraisal year for any lane
//
// "Year" is the single most important join key in mass appraisal.
// If we get it wrong, every value is wrong. So we don't guess.
//
// 🧸 This module is a detective. It finds years hiding under tables.
// ═══════════════════════════════════════════════════════════

import type { ReadOnlyConnector } from "./connectors/types";

// ============================================================
// Year Doctrine Types
// ============================================================

/**
 * How a legacy source system represents "appraisal year."
 *
 * implicit_current — DB has no year column; all records represent the
 *   current roll. Year must be supplied externally (config or control table).
 *
 * control_table — Year lives in a small config/control/system table
 *   (e.g., PACS `pacs_system.appr_yr`). One row, one column.
 *
 * valuation_join — Year exists only on valuation/assessment rows
 *   (e.g., `property_val.prop_val_yr`). Core tables inherit year via join.
 *
 * dated_rows — Rows have effective dates (eff_date, start_date)
 *   rather than explicit year columns. Year is derived: YEAR(eff_date).
 *
 * column_per_table — Year column exists on every/most fact tables
 *   directly (most modern systems). Easiest to work with.
 */
export type YearDoctrineMode =
  | "implicit_current"
  | "control_table"
  | "valuation_join"
  | "dated_rows"
  | "column_per_table";

/**
 * Full Year Doctrine for a source lane.
 * Once discovered, this is stored and enforced by the sync runtime.
 */
export interface YearDoctrine {
  /** How year is represented in this source */
  mode: YearDoctrineMode;
  /** Confidence in the discovery result */
  confidence: "high" | "medium" | "low";
  /** If mode is "control_table": which table holds the year */
  controlTable?: string;
  /** If mode is "control_table": which column holds the year */
  controlColumn?: string;
  /** If mode is "valuation_join": which table(s) have year */
  valuationTables?: string[];
  /** If mode is "valuation_join": which column */
  valuationYearColumn?: string;
  /** If mode is "dated_rows": which date column to derive year from */
  dateColumn?: string;
  /** If mode is "column_per_table": common year column name */
  yearColumnName?: string;
  /** Tables that were found to have year-like columns */
  yearColumnHits: Array<{ table: string; column: string; type: string }>;
  /** Tables that look like config/control tables */
  controlTableCandidates: string[];
  /** Human-readable summary */
  summary: string;
  /** Discovery timestamp */
  discoveredAt: string;
}

// ============================================================
// Year Column Heuristics
// ============================================================

const YEAR_HINTS = [
  "year", "yr", "tax", "roll", "asmt", "appr", "cert", "val_yr",
  "prop_val_yr", "appr_yr", "tax_yr", "roll_yr", "asmt_yr", "cert_yr",
  "taxyr", "taxyear",
] as const;

const VALUE_HINTS = [
  "total", "land", "imprv", "assess", "value", "market", "appraised",
] as const;

const CONTROL_TABLE_HINTS = [
  "control", "system", "setting", "global", "config", "pacs_system",
  "roll", "tax_year", "appraisal", "defaults",
] as const;

function looksLikeYearColumn(col: string): boolean {
  const s = col.toLowerCase();
  return YEAR_HINTS.some((h) => s.includes(h));
}

function looksLikeValueColumn(col: string): boolean {
  const s = col.toLowerCase();
  return VALUE_HINTS.some((h) => s.includes(h));
}

function looksLikeControlTable(table: string): boolean {
  const s = table.toLowerCase();
  return CONTROL_TABLE_HINTS.some((h) => s.includes(h));
}

function looksLikeDateColumn(col: string): boolean {
  const s = col.toLowerCase();
  return (
    s.includes("eff_date") ||
    s.includes("effective") ||
    s.includes("start_date") ||
    s.includes("end_date") ||
    s.includes("begin_date")
  );
}

// ============================================================
// Year Doctrine Discovery
// ============================================================

/**
 * Column info gathered during discovery.
 */
interface DiscoveredColumn {
  table: string;
  column: string;
  type: string;
}

/**
 * Discover the Year Doctrine for a legacy source.
 *
 * Requires a connector with `supportsIntrospection: true`.
 * Runs schema catalog queries (read-only) to find year patterns.
 *
 * @returns YearDoctrine describing how this source handles year
 */
export async function discoverYearDoctrine(
  connector: ReadOnlyConnector
): Promise<YearDoctrine> {
  if (!connector.capabilities.supportsIntrospection) {
    return {
      mode: "implicit_current",
      confidence: "low",
      yearColumnHits: [],
      controlTableCandidates: [],
      summary:
        "Connector does not support introspection. Assuming implicit current year. " +
        "Supply year externally via config.",
      discoveredAt: new Date().toISOString(),
    };
  }

  // Step 1: List all tables
  const tables = (await connector.listTables?.()) ?? [];

  // Step 2: Find year-like columns and control tables
  const yearHits: DiscoveredColumn[] = [];
  const valueHits: DiscoveredColumn[] = [];
  const dateHits: DiscoveredColumn[] = [];
  const controlCandidates: string[] = [];

  for (const table of tables) {
    const tableName = table.includes(".") ? table.split(".").pop()! : table;

    if (looksLikeControlTable(tableName)) {
      controlCandidates.push(table);
    }

    const columns = (await connector.listColumns?.(table)) ?? [];
    for (const col of columns) {
      if (looksLikeYearColumn(col.name)) {
        yearHits.push({ table, column: col.name, type: col.type });
      }
      if (looksLikeValueColumn(col.name)) {
        valueHits.push({ table, column: col.name, type: col.type });
      }
      if (looksLikeDateColumn(col.name)) {
        dateHits.push({ table, column: col.name, type: col.type });
      }
    }
  }

  // Step 3: Score and determine doctrine
  return inferDoctrine(yearHits, valueHits, dateHits, controlCandidates, tables.length);
}

/**
 * Infer the Year Doctrine from discovered schema metadata.
 * Pure function — no I/O, fully testable.
 */
export function inferDoctrine(
  yearHits: DiscoveredColumn[],
  valueHits: DiscoveredColumn[],
  dateHits: DiscoveredColumn[],
  controlCandidates: string[],
  tableCount: number
): YearDoctrine {
  const now = new Date().toISOString();

  // Case 1: Year column on a control table
  const controlYearHits = yearHits.filter((h) =>
    looksLikeControlTable(h.table.includes(".") ? h.table.split(".").pop()! : h.table)
  );
  if (controlYearHits.length > 0) {
    const best = controlYearHits[0];
    return {
      mode: "control_table",
      confidence: "high",
      controlTable: best.table,
      controlColumn: best.column,
      yearColumnHits: yearHits,
      controlTableCandidates: controlCandidates,
      summary:
        `Year found in control table '${best.table}' column '${best.column}'. ` +
        `Use this to resolve current appraisal year.`,
      discoveredAt: now,
    };
  }

  // Case 2: Year column exists but only on valuation/value tables
  const valuationYearHits = yearHits.filter((h) => {
    const hasValueCol = valueHits.some((v) => v.table === h.table);
    return hasValueCol;
  });
  if (valuationYearHits.length > 0 && yearHits.length <= valuationYearHits.length * 2) {
    const valuationTables = [...new Set(valuationYearHits.map((h) => h.table))];
    return {
      mode: "valuation_join",
      confidence: "high",
      valuationTables,
      valuationYearColumn: valuationYearHits[0].column,
      yearColumnHits: yearHits,
      controlTableCandidates: controlCandidates,
      summary:
        `Year exists on valuation table(s): ${valuationTables.join(", ")}. ` +
        `Core tables inherit year via join on prop_id.`,
      discoveredAt: now,
    };
  }

  // Case 3: Year column on many tables → column_per_table
  if (yearHits.length > 0) {
    const yearTablesRatio = new Set(yearHits.map((h) => h.table)).size / Math.max(tableCount, 1);
    if (yearTablesRatio > 0.3) {
      const commonCol = mostCommonValue(yearHits.map((h) => h.column));
      return {
        mode: "column_per_table",
        confidence: "high",
        yearColumnName: commonCol,
        yearColumnHits: yearHits,
        controlTableCandidates: controlCandidates,
        summary:
          `Year column '${commonCol}' found on ${new Set(yearHits.map((h) => h.table)).size}/${tableCount} tables. ` +
          `Modern schema with per-table year columns.`,
        discoveredAt: now,
      };
    }
  }

  // Case 4: No year columns but date columns exist → dated_rows
  if (yearHits.length === 0 && dateHits.length > 0) {
    const commonDateCol = mostCommonValue(dateHits.map((h) => h.column));
    return {
      mode: "dated_rows",
      confidence: "medium",
      dateColumn: commonDateCol,
      yearColumnHits: yearHits,
      controlTableCandidates: controlCandidates,
      summary:
        `No year columns found, but date columns present (e.g., '${commonDateCol}'). ` +
        `Year must be derived via YEAR(date_column).`,
      discoveredAt: now,
    };
  }

  // Case 5: Nothing found → implicit_current
  return {
    mode: "implicit_current",
    confidence: yearHits.length === 0 && dateHits.length === 0 ? "medium" : "low",
    yearColumnHits: yearHits,
    controlTableCandidates: controlCandidates,
    summary:
      `No year-like or date columns found across ${tableCount} tables. ` +
      `Treating as current-year snapshot DB. Year must be supplied externally.`,
    discoveredAt: now,
  };
}

// ============================================================
// Year Resolution (runtime)
// ============================================================

/**
 * Resolve the current appraisal year from a connector using its doctrine.
 *
 * @returns The resolved year, or null if resolution fails
 */
export async function resolveYear(
  connector: ReadOnlyConnector,
  doctrine: YearDoctrine,
  fallbackYear?: number
): Promise<number | null> {
  switch (doctrine.mode) {
    case "control_table": {
      if (!doctrine.controlTable || !doctrine.controlColumn) return fallbackYear ?? null;
      try {
        // Build a safe SELECT for the control table
        const table = doctrine.controlTable;
        const col = doctrine.controlColumn;
        const sql = `SELECT TOP 1 [${col}] AS resolved_year FROM [${table}]`;
        const result = await connector.query<{ resolved_year: number }>(sql);
        if (result.rows.length > 0 && result.rows[0].resolved_year != null) {
          return result.rows[0].resolved_year;
        }
      } catch {
        // Fall through to fallback
      }
      return fallbackYear ?? null;
    }

    case "valuation_join": {
      if (!doctrine.valuationTables?.length || !doctrine.valuationYearColumn) {
        return fallbackYear ?? null;
      }
      try {
        const table = doctrine.valuationTables[0];
        const col = doctrine.valuationYearColumn;
        const sql = `SELECT MAX([${col}]) AS resolved_year FROM [${table}]`;
        const result = await connector.query<{ resolved_year: number }>(sql);
        if (result.rows.length > 0 && result.rows[0].resolved_year != null) {
          return result.rows[0].resolved_year;
        }
      } catch {
        // Fall through
      }
      return fallbackYear ?? null;
    }

    case "implicit_current":
    case "dated_rows":
    case "column_per_table":
    default:
      return fallbackYear ?? new Date().getFullYear();
  }
}

// ============================================================
// Helpers
// ============================================================

function mostCommonValue(arr: string[]): string {
  const counts = new Map<string, number>();
  for (const v of arr) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best = arr[0] ?? "";
  let bestCount = 0;
  for (const [val, count] of counts) {
    if (count > bestCount) {
      best = val;
      bestCount = count;
    }
  }
  return best;
}
