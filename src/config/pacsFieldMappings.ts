// TerraFusion OS — PACS (True Automation) Field Mapping Profile
// Maps True Automation CIAPS database columns → TerraFusion canonical schema
// Source: Benton County WA PACS SQL Server (DatabaseProjectCIAPS)

export interface PACSTableMapping {
  sourceTable: string;
  targetTable: "parcels" | "sales" | "assessments" | "permits" | "exemptions" | "appeals";
  description: string;
  fields: PACSFieldMap[];
}

export interface PACSFieldMap {
  sourceColumn: string;
  targetColumn: string;
  transform?: "string" | "number" | "date" | "boolean" | "currency" | "sqft" | "acres_to_sqft";
  notes?: string;
}

// ============================================================
// True Automation PACS → TerraFusion Field Aliases
// These extend the base FIELD_ALIASES in useIngestPipeline
// ============================================================
export const PACS_FIELD_ALIASES: Record<string, string[]> = {
  // Identity
  parcel_number: ["prop_id", "property_id", "geo_id", "quick_ref_id", "pidn", "strap", "acct", "account_id"],
  
  // Location
  address: ["situs_addr", "situs_street", "situs_display", "situs_num", "prop_street", "legal_addr"],
  city: ["situs_city", "mail_city"],
  state: ["situs_state", "mail_state"],
  zip_code: ["situs_zip", "mail_zip"],
  
  // Classification
  property_class: ["state_cd", "prop_type_cd", "class_cd", "property_use_cd", "imprv_type_cd"],
  neighborhood_code: ["hood_cd", "nbhd_cd", "abs_subdv_cd", "market_area"],
  
  // Valuation
  assessed_value: ["appraised_val", "tot_val", "total_val", "tot_mkt_val", "total_market_value", "appraised_total"],
  land_value: ["land_val", "land_mkt_val", "land_hstd_val", "land_non_hstd_val", "ag_val", "land_appraised_val"],
  improvement_value: ["imprv_val", "imprv_mkt_val", "imprv_hstd_val", "imprv_non_hstd_val", "imprv_appraised_val"],
  
  // Physical
  land_area: ["land_acres", "legal_acreage", "gis_acres", "deed_acres"],
  building_area: ["living_area", "imprv_area", "total_area", "heated_area", "gross_bldg_area", "main_area"],
  year_built: ["yr_built", "actual_year_built", "eff_yr_built", "effective_year_built"],
  bedrooms: ["bedrooms", "num_bedrooms"],
  bathrooms: ["total_bath", "full_bath", "half_bath", "num_bathrooms", "bath_fixts"],
  
  // Spatial
  latitude: ["lat", "centroid_y", "y_coord"],
  longitude: ["lon", "lng", "centroid_x", "x_coord"],
  
  // Sales
  sale_date: ["sl_dt", "sale_dt", "deed_dt", "instrument_dt", "recording_dt", "transfer_dt"],
  sale_price: ["sl_price", "consideration", "adjusted_price", "deed_amt"],
  sale_type: ["sl_type_cd", "sl_ratio_type_cd", "conv_type"],
  grantor: ["grantor_name", "seller_name", "grantor1", "grantor_1"],
  grantee: ["grantee_name", "buyer_name", "grantee1", "grantee_1"],
  deed_type: ["deed_type_cd", "instrument_type", "deed_cd"],
  instrument_number: ["instrument_num", "deed_book_id", "deed_book_page", "doc_num", "excise_num"],
  is_qualified: ["sl_qualified", "qualified_cd", "arms_length_cd"],
  
  // Assessment
  tax_year: ["tax_yr", "assessment_yr", "certified_yr", "roll_yr", "owner_tax_yr"],
  
  // Permits
  permit_number: ["permit_id", "permit_num", "permit_no"],
  permit_type: ["permit_type_cd", "permit_sub_type"],
  
  // Exemptions
  exemption_type: ["exmpt_type_cd", "exemption_cd"],
};

// ============================================================
// Core PACS Table Mappings — True Automation CIAPS Schema
// ============================================================
export const PACS_TABLE_MAPPINGS: PACSTableMapping[] = [
  {
    sourceTable: "property",
    targetTable: "parcels",
    description: "Master property table — identity, location, and classification",
    fields: [
      { sourceColumn: "prop_id", targetColumn: "parcel_number", transform: "string" },
      { sourceColumn: "geo_id", targetColumn: "source_parcel_id", transform: "string", notes: "Geographic ID / APN" },
      { sourceColumn: "situs_display", targetColumn: "address", transform: "string" },
      { sourceColumn: "situs_city", targetColumn: "city", transform: "string" },
      { sourceColumn: "situs_state", targetColumn: "state", transform: "string" },
      { sourceColumn: "situs_zip", targetColumn: "zip_code", transform: "string" },
      { sourceColumn: "prop_type_cd", targetColumn: "property_class", transform: "string" },
      { sourceColumn: "hood_cd", targetColumn: "neighborhood_code", transform: "string" },
    ],
  },
  {
    sourceTable: "property_val",
    targetTable: "parcels",
    description: "Current-year property valuation summary",
    fields: [
      { sourceColumn: "prop_id", targetColumn: "parcel_number", transform: "string" },
      { sourceColumn: "appraised_val", targetColumn: "assessed_value", transform: "currency" },
      { sourceColumn: "land_val", targetColumn: "land_value", transform: "currency" },
      { sourceColumn: "imprv_val", targetColumn: "improvement_value", transform: "currency" },
      { sourceColumn: "land_acres", targetColumn: "land_area", transform: "acres_to_sqft" },
    ],
  },
  {
    sourceTable: "improvement",
    targetTable: "parcels",
    description: "Building characteristics and areas",
    fields: [
      { sourceColumn: "prop_id", targetColumn: "parcel_number", transform: "string" },
      { sourceColumn: "living_area", targetColumn: "building_area", transform: "sqft" },
      { sourceColumn: "yr_built", targetColumn: "year_built", transform: "number" },
    ],
  },
  {
    sourceTable: "improvement_detail",
    targetTable: "parcels",
    description: "Detailed improvement attributes — beds, baths, etc.",
    fields: [
      { sourceColumn: "prop_id", targetColumn: "parcel_number", transform: "string" },
      { sourceColumn: "bedrooms", targetColumn: "bedrooms", transform: "number" },
      { sourceColumn: "total_bath", targetColumn: "bathrooms", transform: "number" },
    ],
  },
  {
    sourceTable: "sale",
    targetTable: "sales",
    description: "Sales/transfer history",
    fields: [
      { sourceColumn: "prop_id", targetColumn: "parcel_number", transform: "string", notes: "Join key to parcels" },
      { sourceColumn: "sl_dt", targetColumn: "sale_date", transform: "date" },
      { sourceColumn: "sl_price", targetColumn: "sale_price", transform: "currency" },
      { sourceColumn: "sl_type_cd", targetColumn: "sale_type", transform: "string" },
      { sourceColumn: "grantor_name", targetColumn: "grantor", transform: "string" },
      { sourceColumn: "grantee_name", targetColumn: "grantee", transform: "string" },
      { sourceColumn: "deed_type_cd", targetColumn: "deed_type", transform: "string" },
      { sourceColumn: "instrument_num", targetColumn: "instrument_number", transform: "string" },
      { sourceColumn: "sl_qualified", targetColumn: "is_qualified", transform: "boolean", notes: "Y/N or 1/0" },
    ],
  },
  {
    sourceTable: "property_val_hist",
    targetTable: "assessments",
    description: "Historical assessment values by tax year",
    fields: [
      { sourceColumn: "prop_id", targetColumn: "parcel_number", transform: "string" },
      { sourceColumn: "tax_yr", targetColumn: "tax_year", transform: "number" },
      { sourceColumn: "land_val", targetColumn: "land_value", transform: "currency" },
      { sourceColumn: "imprv_val", targetColumn: "improvement_value", transform: "currency" },
      { sourceColumn: "appraised_val", targetColumn: "total_value", transform: "currency" },
    ],
  },
  {
    sourceTable: "permit",
    targetTable: "permits",
    description: "Building permits and inspections",
    fields: [
      { sourceColumn: "prop_id", targetColumn: "parcel_number", transform: "string" },
      { sourceColumn: "permit_num", targetColumn: "permit_number", transform: "string" },
      { sourceColumn: "permit_type_cd", targetColumn: "permit_type", transform: "string" },
      { sourceColumn: "permit_status", targetColumn: "status", transform: "string" },
      { sourceColumn: "application_dt", targetColumn: "application_date", transform: "date" },
      { sourceColumn: "issue_dt", targetColumn: "issue_date", transform: "date" },
      { sourceColumn: "estimated_val", targetColumn: "estimated_value", transform: "currency" },
      { sourceColumn: "description", targetColumn: "description", transform: "string" },
    ],
  },
  {
    sourceTable: "exemption",
    targetTable: "exemptions",
    description: "Property exemptions (senior, veteran, etc.)",
    fields: [
      { sourceColumn: "prop_id", targetColumn: "parcel_number", transform: "string" },
      { sourceColumn: "exmpt_type_cd", targetColumn: "exemption_type", transform: "string" },
      { sourceColumn: "tax_yr", targetColumn: "tax_year", transform: "number" },
      { sourceColumn: "exmpt_pct", targetColumn: "exemption_percentage", transform: "number" },
      { sourceColumn: "exmpt_val", targetColumn: "exemption_amount", transform: "currency" },
      { sourceColumn: "applicant_name", targetColumn: "applicant_name", transform: "string" },
      { sourceColumn: "status_cd", targetColumn: "status", transform: "string" },
    ],
  },
];

// ============================================================
// PACS Data Transform Helpers
// ============================================================
export function transformPACSValue(value: string | null | undefined, transform?: PACSFieldMap["transform"]): string | number | boolean | null {
  if (value === null || value === undefined || value === "") return null;
  
  switch (transform) {
    case "number":
      const num = parseFloat(String(value).replace(/[,$]/g, ""));
      return isNaN(num) ? null : num;
    
    case "currency":
      const amt = parseFloat(String(value).replace(/[$,\s]/g, ""));
      return isNaN(amt) ? null : Math.round(amt * 100) / 100;
    
    case "date":
      // Handle PACS date formats: MM/DD/YYYY, YYYY-MM-DD, YYYYMMDD
      const cleaned = String(value).trim();
      if (/^\d{8}$/.test(cleaned)) {
        return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
      }
      const d = new Date(cleaned);
      return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
    
    case "boolean":
      const lower = String(value).toLowerCase().trim();
      return lower === "y" || lower === "yes" || lower === "1" || lower === "true";
    
    case "sqft":
      const sf = parseFloat(String(value).replace(/[,]/g, ""));
      return isNaN(sf) ? null : Math.round(sf);
    
    case "acres_to_sqft":
      const acres = parseFloat(String(value).replace(/[,]/g, ""));
      return isNaN(acres) ? null : Math.round(acres * 43560);
    
    case "string":
    default:
      return String(value).trim();
  }
}

// ============================================================
// PACS Export Instructions — user-facing guide
// ============================================================
export const PACS_EXPORT_GUIDE = {
  title: "Exporting from True Automation PACS (Benton County CIAPS)",
  steps: [
    "Open SQL Server Management Studio (SSMS) and connect to the CIAPS database",
    "Right-click the table you want to export → Tasks → Export Data",
    "Or use the query templates below to export via CSV",
    "Save each table as a separate CSV file with headers",
    "Upload each file through the PACS Import wizard in TerraFusion",
  ],
  queryTemplates: {
    parcels: `SELECT p.prop_id, p.geo_id, p.situs_display, p.situs_city, p.situs_state, p.situs_zip,
  p.prop_type_cd, p.hood_cd,
  pv.appraised_val, pv.land_val, pv.imprv_val, pv.land_acres,
  i.living_area, i.yr_built
FROM property p
LEFT JOIN property_val pv ON p.prop_id = pv.prop_id AND pv.prop_val_yr = (SELECT MAX(prop_val_yr) FROM property_val)
LEFT JOIN improvement i ON p.prop_id = i.prop_id AND i.imprv_type_cd = 'MA'
WHERE pv.prop_inactive_dt IS NULL`,
    
    sales: `SELECT s.prop_id, s.sl_dt, s.sl_price, s.sl_type_cd,
  s.grantor_name, s.grantee_name, s.deed_type_cd, s.instrument_num,
  CASE WHEN s.sl_ratio_type_cd IN ('Q','QU') THEN 'Y' ELSE 'N' END as sl_qualified
FROM sale s
WHERE s.sl_dt >= DATEADD(year, -5, GETDATE())
ORDER BY s.sl_dt DESC`,
    
    assessments: `SELECT prop_id, tax_yr, land_val, imprv_val, appraised_val
FROM property_val_hist
WHERE tax_yr >= YEAR(GETDATE()) - 5
ORDER BY prop_id, tax_yr DESC`,
    
    permits: `SELECT prop_id, permit_num, permit_type_cd, permit_status,
  application_dt, issue_dt, estimated_val, description
FROM permit
ORDER BY application_dt DESC`,
  },
};

// ============================================================
// Benton PACS Identity Modes
// ============================================================
// sup_num is ignored in the current year because sup_num is taking a nap in certified-land.

export type PACSIdentityMode = "CURRENT_YEAR" | "CERTIFIED_YEARS";

export interface PACSIdentityConfig {
  mode: PACSIdentityMode;
  /** For CURRENT_YEAR: key = prop_id only. For CERTIFIED_YEARS: key = (prop_id, sup_num, year) */
  keyFields: string[];
  /** APN / parcel number source column */
  apnColumn: string;
  /** How to resolve neighborhood */
  neighborhoodJoin: string;
  description: string;
}

export const PACS_IDENTITY_MODES: Record<PACSIdentityMode, PACSIdentityConfig> = {
  CURRENT_YEAR: {
    mode: "CURRENT_YEAR",
    keyFields: ["prop_id"],
    apnColumn: "geo_id",
    neighborhoodJoin: "property_val.hood_cd WHERE prop_val_yr = appr_yr",
    description:
      "Operational mode — one property = one story. sup_num ignored. " +
      "Joins property_val at current appraisal year for hood_cd, values.",
  },
  CERTIFIED_YEARS: {
    mode: "CERTIFIED_YEARS",
    keyFields: ["prop_id", "sup_num", "year"],
    apnColumn: "geo_id",
    neighborhoodJoin: "property_val.hood_cd year-scoped per certified year",
    description:
      "Audit/legal mode — every supplement matters. " +
      "Facts keyed by (prop_id, sup_num, year) for certified roll integrity.",
  },
};

/**
 * Resolve the composite key string for a PACS record based on identity mode.
 * Current year: prop_id alone.
 * Certified years: prop_id|sup_num|year.
 */
export function resolvePACSKey(
  record: Record<string, unknown>,
  mode: PACSIdentityMode
): string {
  if (mode === "CURRENT_YEAR") {
    return String(record.prop_id ?? record.parcel_number ?? "");
  }
  const propId = String(record.prop_id ?? record.parcel_number ?? "");
  const supNum = String(record.sup_num ?? 0);
  const year = String(record.year ?? record.prop_val_yr ?? record.tax_year ?? "");
  return `${propId}|${supNum}|${year}`;
}

// ============================================================
// PACS Neighborhood Extraction Queries (year-scoped)
// ============================================================
export const PACS_NEIGHBORHOOD_QUERIES = {
  /** Neighborhoods dimension for a given appraisal year */
  neighborhoods: (year: number) => `
SELECT
  n.hood_yr AS year,
  n.hood_cd,
  n.hood_name
FROM dbo.neighborhood n
WHERE n.hood_yr = ${year};`,

  /**
   * Parcel → Neighborhood assignment via property_val (year-scoped truth join).
   * CURRENT_YEAR mode: ignores sup_num (picks primary row per prop_id).
   * CERTIFIED_YEARS mode: preserves sup_num for full keying.
   */
  parcelAssignment: (year: number, mode: PACSIdentityMode = "CURRENT_YEAR") =>
    mode === "CURRENT_YEAR"
      ? `
-- Current-year mode: one row per prop_id (sup_num ignored)
-- Uses ROW_NUMBER() for SQL Server compatibility (DISTINCT ON is PostgreSQL-only)
WITH ranked AS (
  SELECT
    pv.prop_val_yr AS [year],
    pv.hood_cd,
    pv.prop_id,
    ROW_NUMBER() OVER (PARTITION BY pv.prop_id ORDER BY pv.sup_num ASC) AS rn
  FROM dbo.property_val pv
  WHERE pv.prop_val_yr = ${year}
)
SELECT [year], hood_cd, prop_id
FROM ranked
WHERE rn = 1;`
      : `
-- Certified-year mode: full (prop_id, sup_num, year) key
SELECT
  pv.prop_val_yr AS year,
  pv.hood_cd,
  pv.prop_id,
  pv.sup_num
FROM dbo.property_val pv
WHERE pv.prop_val_yr = ${year};`,

  /** Neighborhood rollup stats */
  rollupStats: (year: number) => `
SELECT
  pv.prop_val_yr AS [year],
  pv.hood_cd,
  COUNT(*) AS parcels,
  AVG(pv.appraised_val) AS avg_total_value,
  MIN(pv.appraised_val) AS min_total_value,
  MAX(pv.appraised_val) AS max_total_value,
  SUM(pv.appraised_val) AS sum_total_value
FROM dbo.property_val pv
WHERE pv.prop_val_yr = ${year}
GROUP BY pv.prop_val_yr, pv.hood_cd;`,

  /**
   * Current-year valuation extraction (Mode A: prop_id only).
   * Picks one row per prop_id at current appraisal year.
   */
  currentYearValues: (year: number) => `
-- Current-year values: one row per prop_id via ROW_NUMBER() (SQL Server compat)
WITH ranked AS (
  SELECT
    pv.prop_id,
    p.geo_id,
    pv.hood_cd,
    pv.appraised_val AS total_val,
    pv.land_hstd_val AS land_val,
    pv.imprv_val,
    pv.prop_val_yr AS [year],
    ROW_NUMBER() OVER (PARTITION BY pv.prop_id ORDER BY pv.sup_num ASC) AS rn
  FROM dbo.property_val pv
  JOIN dbo.property p ON p.prop_id = pv.prop_id
  WHERE pv.prop_val_yr = ${year}
    AND pv.prop_inactive_dt IS NULL
)
SELECT prop_id, geo_id, hood_cd, total_val AS total_val, land_val, imprv_val, [year]
FROM ranked
WHERE rn = 1;`,

  /**
   * Certified-year valuation extraction (Mode B: full key).
   * Preserves sup_num for audit integrity.
   */
  certifiedYearValues: (year: number) => `
SELECT
  pv.prop_id,
  pv.sup_num,
  p.geo_id,
  pv.hood_cd,
  pv.appraised_val AS total_val,
  pv.land_hstd_val AS land_val,
  pv.imprv_val,
  pv.prop_val_yr AS year
FROM dbo.property_val pv
JOIN dbo.property p ON p.prop_id = pv.prop_id
WHERE pv.prop_val_yr = ${year};`,

  /** Hood analysis — full hood profile with valuations + sales ratio (from legacy appraise_hoods.sql) */
  hoodAnalysis: (year: number) => `
SELECT
  pv.hood_cd,
  n.hood_name,
  COUNT(DISTINCT pv.prop_id) AS parcel_count,
  AVG(pv.appraised_val) AS avg_total_val,
  AVG(pv.land_hstd_val) AS avg_land_val,
  AVG(pv.imprv_val) AS avg_imprv_val,
  SUM(CASE WHEN i.imprv_val_source = 'F' THEN 1 ELSE 0 END) AS flat_value_count,
  COUNT(DISTINCT copa.chg_of_owner_id) AS sale_count,
  AVG(CASE WHEN s.sl_price > 100 AND s.sl_county_ratio_cd IN ('01','02')
    THEN CAST(pv.total_val AS FLOAT) / NULLIF(s.sl_price, 0) END) AS avg_ratio
FROM dbo.property_val pv
JOIN dbo.property p ON p.prop_id = pv.prop_id
JOIN dbo.neighborhood n ON n.hood_cd = pv.hood_cd AND n.hood_yr = pv.prop_val_yr
LEFT JOIN dbo.imprv i ON i.prop_id = pv.prop_id AND i.prop_val_yr = pv.prop_val_yr
  AND i.sup_num = pv.sup_num AND (i.sale_id = 0 OR i.sale_id IS NULL)
LEFT JOIN dbo.chg_of_owner_prop_assoc copa ON copa.prop_id = pv.prop_id
LEFT JOIN dbo.sale s ON s.chg_of_owner_id = copa.chg_of_owner_id
  AND s.prop_id = copa.prop_id
WHERE pv.prop_val_yr = ${year}
  AND pv.prop_inactive_dt IS NULL
GROUP BY pv.hood_cd, n.hood_name;`,
};

// ============================================================
// PACS Owner Extraction Queries (from legacy ownership.sql)
// ============================================================
export const PACS_OWNER_QUERIES = {
  /** Current year owners — one row per prop_id + owner_id */
  currentYearOwners: (_year: number) => `
WITH substantive_year AS (
  SELECT TOP 1 owner_tax_yr
  FROM dbo.owner
  GROUP BY owner_tax_yr
  HAVING COUNT(*) >= 1000
  ORDER BY owner_tax_yr DESC
)
SELECT
  o.prop_id,
  o.owner_id,
  a.file_as_name AS owner_name,
  o.pct_ownership,
  o.owner_tax_yr,
  o.sup_num
FROM dbo.owner o
JOIN dbo.account a ON a.acct_id = o.owner_id
CROSS JOIN substantive_year sy
WHERE o.owner_tax_yr = sy.owner_tax_yr;`,

  /** Fractional owners (pct_ownership <> 100) for a specific year */
  fractionalOwners: (year: number) => `
SELECT o.prop_id, o.owner_id, a.file_as_name AS owner_name, o.pct_ownership
FROM dbo.owner o
JOIN dbo.account a ON a.acct_id = o.owner_id
JOIN dbo.property_val pv ON pv.prop_id = o.prop_id
  AND pv.prop_val_yr = o.owner_tax_yr AND pv.sup_num = o.sup_num
JOIN dbo.prop_supp_assoc psa ON psa.prop_id = pv.prop_id
  AND psa.owner_tax_yr = pv.prop_val_yr AND psa.sup_num = pv.sup_num
JOIN dbo.property p ON p.prop_id = pv.prop_id
WHERE pv.prop_val_yr = ${year}
  AND ISNULL(o.pct_ownership, 0) <> 100
  AND pv.prop_inactive_dt IS NULL;`,
};

// ============================================================
// PACS Sales Extraction Queries (from legacy Sales Ratio + Land Sales)
// ============================================================
export const PACS_SALES_QUERIES = {
  /** Qualified sales with IAAO ratio calculation */
  qualifiedSales: (year: number) => `
SELECT
  s.chg_of_owner_id,
  copa.prop_id,
  p.geo_id,
  s.sl_price,
  s.sl_dt,
  s.sl_type_cd,
  s.sl_county_ratio_cd,
  s.sl_ratio_type_cd,
  pv.appraised_val AS market_value,
  pv.hood_cd,
  CASE WHEN pv.appraised_val <> 0
    THEN CAST(pv.appraised_val AS FLOAT) / NULLIF(s.sl_price, 0)
    ELSE NULL
  END AS ratio
FROM dbo.sale s
JOIN dbo.chg_of_owner_prop_assoc copa ON copa.chg_of_owner_id = s.chg_of_owner_id
  AND copa.prop_id = s.prop_id
JOIN dbo.property p ON p.prop_id = copa.prop_id
JOIN dbo.property_val pv ON pv.prop_id = copa.prop_id AND pv.prop_val_yr = ${year}
WHERE s.sl_county_ratio_cd IN ('01','02')
  AND s.sl_price > 100
  AND YEAR(s.sl_dt) >= ${year} - 2
  AND pv.prop_inactive_dt IS NULL;`,

  /** Most recent qualified sale per property */
  recentSaleByProp: (year: number) => `
WITH ranked AS (
  SELECT
    copa.prop_id, s.sl_price, s.sl_dt, s.sl_type_cd,
    ROW_NUMBER() OVER (PARTITION BY copa.prop_id ORDER BY s.sl_dt DESC) AS rn
  FROM dbo.sale s
  JOIN dbo.chg_of_owner_prop_assoc copa ON copa.chg_of_owner_id = s.chg_of_owner_id
    AND copa.prop_id = s.prop_id
  WHERE s.sl_price > 0 AND YEAR(s.sl_dt) >= ${year} - 3
)
SELECT prop_id, sl_price, sl_dt, sl_type_cd
FROM ranked WHERE rn = 1;`,
};

// ============================================================
// PACS Land Detail Queries (from legacy land and ag schedules)
// ============================================================
export const PACS_LAND_QUERIES = {
  /** Land detail segments with schedule lookups */
  landDetails: (_year: number) => `
WITH substantive_year AS (
  SELECT TOP 1 prop_val_yr
  FROM dbo.land_detail
  GROUP BY prop_val_yr
  HAVING COUNT(*) >= 1000
  ORDER BY prop_val_yr DESC
)
SELECT
  ld.prop_id, ld.prop_val_yr, ld.sup_num,
  ld.land_seg_id, ld.land_type_cd, ld.land_class_code,
  ld.land_soil_code, ld.size_acres AS land_acres, ld.size_square_feet AS land_sqft,
  ld.land_adj_factor, ld.num_lots,
  ld.mkt_unit_price AS land_unit_price, ld.land_seg_mkt_val AS land_val,
  ld.ag_val,
  ls_mkt.ls_code AS market_schedule,
  ls_ag.ls_code AS ag_schedule
FROM dbo.land_detail ld
CROSS JOIN substantive_year sy
LEFT JOIN dbo.land_sched ls_mkt ON ls_mkt.ls_id = ld.ls_mkt_id
  AND ls_mkt.ls_year = ld.prop_val_yr
LEFT JOIN dbo.land_sched ls_ag ON ls_ag.ls_id = ld.ls_ag_id
  AND ls_ag.ls_year = ld.prop_val_yr
WHERE ld.prop_val_yr = sy.prop_val_yr
  AND (ld.sale_id = 0 OR ld.sale_id IS NULL);`,
};

// ============================================================
// PACS Improvement Queries (from legacy res_condensed + Res_withPopulation)
// ============================================================
export const PACS_IMPROVEMENT_QUERIES = {
  /** Improvement headers (1 per improvement per property) */
  improvements: (_year: number) => `
WITH substantive_year AS (
  SELECT TOP 1 prop_val_yr
  FROM dbo.imprv
  GROUP BY prop_val_yr
  HAVING COUNT(*) >= 1000
  ORDER BY prop_val_yr DESC
)
SELECT
  i.prop_id, i.prop_val_yr, i.sup_num, i.imprv_id,
  i.imprv_type_cd, i.imprv_desc,
  i.imprv_val, i.flat_val, i.imprv_val_source,
  i.economic_pct, i.physical_pct, i.functional_pct
FROM dbo.imprv i
CROSS JOIN substantive_year sy
WHERE i.prop_val_yr = sy.prop_val_yr
  AND (i.sale_id = 0 OR i.sale_id IS NULL)
  AND i.imprv_desc NOT LIKE '%SOH%';`,

  /** Improvement details (beds, baths, living area, condition) */
  improvementDetails: (_year: number) => `
WITH substantive_year AS (
  SELECT TOP 1 prop_val_yr
  FROM dbo.imprv_detail
  GROUP BY prop_val_yr
  HAVING COUNT(*) >= 1000
  ORDER BY prop_val_yr DESC
)
SELECT
  id2.prop_id, id2.prop_val_yr, id2.sup_num,
  id2.imprv_id, id2.imprv_det_id,
  id2.imprv_det_type_cd, id2.imprv_det_class_cd,
  id2.imprv_det_area, id2.imprv_det_val,
  id2.yr_built AS actual_year_built,
  id2.yr_remodel, id2.condition_cd,
  id2.imprv_det_quality_cd,
  id2.living_area,
  id2.num_bedrooms, id2.total_bath
FROM dbo.imprv_detail id2
CROSS JOIN substantive_year sy
WHERE id2.prop_val_yr = sy.prop_val_yr
  AND (id2.sale_id = 0 OR id2.sale_id IS NULL);`,
};

// ============================================================
// PACS Assessment Roll Queries (from legacy Real_Prop_Monitor)
// ============================================================
export const PACS_ROLL_QUERIES = {
  /** DOR-style assessment roll monitor — full property snapshot */
  assessmentRoll: (year: number) => `
SELECT
  pv.prop_id,
  p.geo_id,
  o.owner_id,
  a.file_as_name AS owner_name,
  wpov.imprv_hstd_val, wpov.imprv_non_hstd_val,
  wpov.land_hstd_val, wpov.land_non_hstd_val,
  wpov.timber_market, wpov.ag_market,
  wpov.appraised_classified, wpov.appraised_non_classified,
  wpov.taxable_classified, wpov.taxable_non_classified,
  ta.tax_area_id, ta.tax_area_desc,
  s.situs_display,
  pp.property_use_cd, pp.state_cd
FROM dbo.property_val pv
JOIN dbo.prop_supp_assoc psa ON psa.prop_id = pv.prop_id
  AND psa.owner_tax_yr = pv.prop_val_yr AND psa.sup_num = pv.sup_num
JOIN dbo.property p ON p.prop_id = pv.prop_id
JOIN dbo.owner o ON o.prop_id = pv.prop_id
  AND o.owner_tax_yr = pv.prop_val_yr AND o.sup_num = pv.sup_num
JOIN dbo.account a ON a.acct_id = o.owner_id
LEFT JOIN dbo.wash_prop_owner_val wpov ON wpov.prop_id = pv.prop_id
  AND wpov.prop_val_yr = pv.prop_val_yr AND wpov.sup_num = pv.sup_num
  AND wpov.owner_id = o.owner_id
LEFT JOIN dbo.wash_prop_owner_tax_area_assoc wptaa ON wptaa.prop_id = pv.prop_id
  AND wptaa.prop_val_yr = pv.prop_val_yr AND wptaa.sup_num = pv.sup_num
  AND wptaa.owner_id = o.owner_id
LEFT JOIN dbo.tax_area ta ON ta.tax_area_id = wptaa.tax_area_id
LEFT JOIN dbo.situs s ON s.prop_id = pv.prop_id AND s.primary_situs = 'Y'
LEFT JOIN dbo.property_profile pp ON pp.prop_id = pv.prop_id
  AND pp.prop_val_yr = pv.prop_val_yr AND pp.sup_num = pv.sup_num
WHERE pv.prop_val_yr = ${year}
  AND pv.prop_inactive_dt IS NULL
  AND p.prop_type_cd IN ('R', 'MH');`,
};

/** PACS table mapping for neighborhoods dimension */
export const PACS_NEIGHBORHOOD_TABLE_MAPPING: PACSTableMapping = {
  sourceTable: "neighborhood",
  targetTable: "parcels" as const, // routed to neighborhoods table in practice
  description: "Year-versioned neighborhood dimension (hood_cd + hood_yr)",
  fields: [
    { sourceColumn: "hood_cd", targetColumn: "neighborhood_code", transform: "string" },
    { sourceColumn: "hood_name", targetColumn: "address", transform: "string", notes: "Maps to hood_name in neighborhoods table" },
    { sourceColumn: "hood_yr", targetColumn: "year_built", transform: "number", notes: "Maps to year in neighborhoods table" },
  ],
};

// ============================================================
// Get merged field aliases (base + PACS-specific)
// ============================================================
export function getPACSEnhancedAliases(baseAliases: Record<string, string[]>): Record<string, string[]> {
  const merged: Record<string, string[]> = {};
  
  for (const [key, aliases] of Object.entries(baseAliases)) {
    const pacsAliases = PACS_FIELD_ALIASES[key] || [];
    merged[key] = [...new Set([...aliases, ...pacsAliases])];
  }
  
  // Add any PACS-only fields not in base
  for (const [key, aliases] of Object.entries(PACS_FIELD_ALIASES)) {
    if (!merged[key]) {
      merged[key] = aliases;
    }
  }
  
  return merged;
}
