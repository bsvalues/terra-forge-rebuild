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
WHERE p.prop_inactive_dt IS NULL`,
    
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

  /** Parcel → Neighborhood assignment via property_val (year-scoped truth join) */
  parcelAssignment: (year: number) => `
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
  AVG(pv.total_val) AS avg_total_value,
  MIN(pv.total_val) AS min_total_value,
  MAX(pv.total_val) AS max_total_value,
  SUM(pv.total_val) AS sum_total_value
FROM dbo.property_val pv
WHERE pv.prop_val_yr = ${year}
GROUP BY pv.prop_val_yr, pv.hood_cd;`,
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
