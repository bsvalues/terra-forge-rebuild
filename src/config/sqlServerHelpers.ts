// TerraFusion OS — SQL Server Query Helpers
// Prevents accidental PostgreSQL-only syntax in PACS extraction queries.
// All PACS queries MUST use these helpers instead of raw SQL patterns.
//
// "The database doesn't know what DISTINCT ON is, like me at a salad bar."

// ============================================================
// ROW_NUMBER() CTE — SQL Server replacement for DISTINCT ON
// ============================================================

export interface PickOneRowOptions {
  /** Source table or alias */
  from: string;
  /** Column to partition by (e.g. "pv.prop_id") */
  partitionBy: string;
  /** Column to order by within partition (e.g. "pv.sup_num ASC") */
  orderBy: string;
  /** Columns to SELECT in the final output */
  selectColumns: string[];
  /** WHERE clause (without WHERE keyword) */
  where?: string;
  /** JOIN clauses */
  joins?: string[];
  /** CTE alias name */
  cteAlias?: string;
}

/**
 * Generate a ROW_NUMBER() CTE that picks one row per partition key.
 * SQL Server-safe replacement for PostgreSQL's `SELECT DISTINCT ON (...)`.
 *
 * @example
 * pickOneRowPerKey({
 *   from: "dbo.property_val pv",
 *   partitionBy: "pv.prop_id",
 *   orderBy: "pv.sup_num ASC",
 *   selectColumns: ["pv.prop_val_yr AS [year]", "pv.hood_cd", "pv.prop_id"],
 *   where: `pv.prop_val_yr = ${year}`,
 * })
 */
export function pickOneRowPerKey(opts: PickOneRowOptions): string {
  const alias = opts.cteAlias ?? "ranked";
  const joinBlock = opts.joins?.length ? "\n" + opts.joins.join("\n") : "";
  const whereBlock = opts.where ? `\nWHERE ${opts.where}` : "";

  // Build inner select: all requested columns + ROW_NUMBER
  const innerSelect = [
    ...opts.selectColumns,
    `ROW_NUMBER() OVER (PARTITION BY ${opts.partitionBy} ORDER BY ${opts.orderBy}) AS rn`,
  ].join(",\n    ");

  // Strip table aliases from output column references for the outer SELECT
  const outerColumns = opts.selectColumns.map((col) => {
    // "pv.prop_val_yr AS [year]" → "[year]"
    const asMatch = col.match(/\bAS\s+(\[?\w+\]?)/i);
    if (asMatch) return asMatch[1];
    // "pv.hood_cd" → "hood_cd"
    const dotMatch = col.match(/\.(\w+)$/);
    return dotMatch ? dotMatch[1] : col.trim();
  }).join(", ");

  return `WITH ${alias} AS (
  SELECT
    ${innerSelect}
  FROM ${opts.from}${joinBlock}${whereBlock}
)
SELECT ${outerColumns}
FROM ${alias}
WHERE rn = 1;`;
}

// ============================================================
// Safe Type Casting — SQL Server TRY_CONVERT
// ============================================================

/**
 * Generate a SQL Server TRY_CONVERT expression.
 * Returns NULL on conversion failure instead of throwing.
 *
 * @example
 * safeIntCast("bp.bldg_permit_import_prop_id") → "TRY_CONVERT(int, bp.bldg_permit_import_prop_id)"
 * safeIntCast("bp.bldg_permit_import_prop_id", "prop_id") → "TRY_CONVERT(int, bp.bldg_permit_import_prop_id) AS prop_id"
 */
export function safeIntCast(column: string, alias?: string): string {
  const cast = `TRY_CONVERT(int, ${column})`;
  return alias ? `${cast} AS ${alias}` : cast;
}

/**
 * Generate a TRY_CONVERT for date types.
 */
export function safeDateCast(column: string, alias?: string): string {
  const cast = `TRY_CONVERT(date, ${column})`;
  return alias ? `${cast} AS ${alias}` : cast;
}

/**
 * Generate a TRY_CONVERT for numeric/decimal types.
 */
export function safeNumericCast(column: string, precision: number = 18, scale: number = 2, alias?: string): string {
  const cast = `TRY_CONVERT(decimal(${precision},${scale}), ${column})`;
  return alias ? `${cast} AS ${alias}` : cast;
}

// ============================================================
// DECLARE @yr — Standard appraisal year preamble
// ============================================================

/**
 * Generate the standard PACS appraisal year declaration.
 * All year-scoped queries should use this as their preamble.
 */
export function declareAppraisalYear(year?: number): string {
  if (year !== undefined) {
    return `DECLARE @yr int = ${year};`;
  }
  return `DECLARE @yr int = (SELECT appr_yr FROM dbo.pacs_system);`;
}

// ============================================================
// SQL Server Index Recommendations (documentation + validation)
// ============================================================

export interface IndexRecommendation {
  table: string;
  columns: string[];
  include?: string[];
  name: string;
  rationale: string;
}

/** Recommended indexes on the PACS SQL Server side for Benton County */
export const PACS_SQLSERVER_INDEX_RECOMMENDATIONS: IndexRecommendation[] = [
  {
    table: "dbo.property_val",
    columns: ["prop_val_yr", "prop_id"],
    include: ["hood_cd", "total_val", "land_val", "total_imprv_val", "sup_num"],
    name: "IX_property_val_yr_prop_id",
    rationale: "Core join for year-scoped valuation + neighborhood extraction",
  },
  {
    table: "dbo.neighborhood",
    columns: ["hood_yr", "hood_cd"],
    name: "IX_neighborhood_yr_cd",
    rationale: "Neighborhood dimension lookups by year",
  },
  {
    table: "dbo._arb_protest",
    columns: ["prop_val_yr", "prop_id"],
    include: ["prot_status", "prot_complete_dt", "case_id"],
    name: "IX_arb_protest_yr_prop",
    rationale: "Appeals extraction by year with status filtering",
  },
  {
    table: "dbo.building_permit",
    columns: ["bldg_permit_import_prop_id"],
    include: ["bldg_permit_status", "bldg_permit_dt_complete"],
    name: "IX_building_permit_prop_id",
    rationale: "Permit-to-parcel join (VARCHAR column, needs TRY_CONVERT)",
  },
  {
    table: "dbo.property_exemption",
    columns: ["exmpt_tax_yr", "prop_id"],
    include: ["review_status_cd", "termination_dt", "exmpt_type_cd"],
    name: "IX_property_exemption_yr_prop",
    rationale: "Exemptions extraction by year with status filtering",
  },
];

/**
 * Generate CREATE INDEX statements for PACS SQL Server.
 * For DBA review — not executed by the sync engine.
 */
export function generateIndexDDL(): string {
  return PACS_SQLSERVER_INDEX_RECOMMENDATIONS.map((idx) => {
    const cols = idx.columns.join(", ");
    const include = idx.include ? `\n  INCLUDE (${idx.include.join(", ")})` : "";
    return `-- ${idx.rationale}\nCREATE NONCLUSTERED INDEX [${idx.name}]\n  ON ${idx.table} (${cols})${include};`;
  }).join("\n\n");
}
