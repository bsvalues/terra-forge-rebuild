// TerraFusion OS — Benton County PACS Workflow Mappings
// Source: True Automation CIAPS dbo schema (confirmed from Benton dbo dump + FK metadata)
// Covers: Appeals (_arb_protest), Permits (building_permit), Exemptions (property_exemption)
//
// Identity Doctrine (current year): prop_id only, sup_num ignored.
// Neighborhood: always via property_val(prop_val_yr = appr_yr).hood_cd → neighborhood(hood_yr).


// ============================================================
// Workflow Table Descriptors
// ============================================================

export interface PACSWorkflowDescriptor {
  sourceTable: string;
  targetTable: "appeals" | "permits" | "exemptions";
  primaryKey: string[];
  parcelJoin: string;
  parcelJoinNotes: string;
  yearField: string | null;
  statusFields: string[];
  statusLookups: string[];
  piiWarning?: string;
  description: string;
}

export const PACS_WORKFLOW_MAP: Record<string, PACSWorkflowDescriptor> = {
  appeals: {
    sourceTable: "dbo._arb_protest",
    targetTable: "appeals",
    primaryKey: ["prop_id", "prop_val_yr", "case_id"],
    parcelJoin: "prop_id → property.prop_id",
    parcelJoinNotes: "Direct FK, no cast needed",
    yearField: "prop_val_yr",
    statusFields: ["prot_status", "prot_complete_dt"],
    statusLookups: ["_arb_protest_status", "_arb_protest_type"],
    description: "ARB protests / appeals — year-scoped via prop_val_yr",
  },
  permits: {
    sourceTable: "dbo.building_permit",
    targetTable: "permits",
    primaryKey: ["bldg_permit_id"],
    parcelJoin: "TRY_CONVERT(int, bldg_permit_import_prop_id) → property.prop_id",
    parcelJoinNotes: "bldg_permit_import_prop_id is VARCHAR(15), cast to INT for join",
    yearField: null, // no year column; use dates + join to appr_yr
    statusFields: ["bldg_permit_status", "bldg_permit_cad_status", "bldg_permit_dt_complete"],
    statusLookups: ["bp_issuer_status_cd", "bp_cad_status_cd", "bld_permit_type", "bld_permit_sub_type"],
    description: "Building permits — status via issuer + CAD status codes",
  },
  exemptions: {
    sourceTable: "dbo.property_exemption",
    targetTable: "exemptions",
    primaryKey: ["exmpt_tax_yr", "owner_tax_yr", "sup_num", "prop_id", "owner_id", "exmpt_type_cd"],
    parcelJoin: "prop_id → property.prop_id",
    parcelJoinNotes: "Direct FK. For current year, treat as prop_id-scoped; sup_num ignored.",
    yearField: "exmpt_tax_yr",
    statusFields: ["review_status_cd", "review_request_date", "termination_dt"],
    statusLookups: ["exmpt_type", "exmpt_sub_type"],
    piiWarning: "Applicant / DL / SSN columns exist — do NOT sync unless explicitly needed",
    description: "Property exemptions — composite PK includes sup_num but ignored for current year",
  },
};

// ============================================================
// Field Mappings: PACS workflow columns → TerraFusion canonical
// ============================================================

export interface PACSWorkflowFieldMap {
  sourceColumn: string;
  targetColumn: string;
  transform?: "string" | "number" | "date" | "boolean" | "currency";
  notes?: string;
}

export const PACS_APPEALS_FIELDS: PACSWorkflowFieldMap[] = [
  { sourceColumn: "prop_id", targetColumn: "parcel_number", transform: "string", notes: "Join key to parcels" },
  { sourceColumn: "prop_val_yr", targetColumn: "tax_year", transform: "number" },
  { sourceColumn: "case_id", targetColumn: "appeal_id", transform: "string", notes: "ARB case identifier" },
  { sourceColumn: "prot_type", targetColumn: "appeal_type", transform: "string", notes: "Lookup: _arb_protest_type" },
  { sourceColumn: "prot_status", targetColumn: "status", transform: "string", notes: "Lookup: _arb_protest_status" },
  { sourceColumn: "prot_create_dt", targetColumn: "appeal_date", transform: "date" },
  { sourceColumn: "prot_complete_dt", targetColumn: "resolution_date", transform: "date" },
];

export const PACS_PERMITS_FIELDS: PACSWorkflowFieldMap[] = [
  { sourceColumn: "bldg_permit_id", targetColumn: "permit_id", transform: "string" },
  { sourceColumn: "bldg_permit_import_prop_id", targetColumn: "parcel_number", transform: "string", notes: "VARCHAR(15) → cast to INT for property join" },
  { sourceColumn: "bldg_permit_num", targetColumn: "permit_number", transform: "string" },
  { sourceColumn: "bldg_permit_type_cd", targetColumn: "permit_type", transform: "string", notes: "Lookup: bld_permit_type" },
  { sourceColumn: "bldg_permit_sub_type_cd", targetColumn: "permit_sub_type", transform: "string", notes: "Lookup: bld_permit_sub_type" },
  { sourceColumn: "bldg_permit_status", targetColumn: "status", transform: "string", notes: "Issuer status → bp_issuer_status_cd" },
  { sourceColumn: "bldg_permit_cad_status", targetColumn: "cad_status", transform: "string", notes: "CAD status → bp_cad_status_cd" },
  { sourceColumn: "bldg_permit_issue_dt", targetColumn: "issue_date", transform: "date" },
  { sourceColumn: "bldg_permit_dt_complete", targetColumn: "completion_date", transform: "date" },
  { sourceColumn: "bldg_permit_val", targetColumn: "estimated_value", transform: "currency" },
  { sourceColumn: "bldg_permit_area", targetColumn: "permit_area", transform: "number" },
  { sourceColumn: "bldg_permit_import_dt", targetColumn: "application_date", transform: "date" },
];

export const PACS_EXEMPTIONS_FIELDS: PACSWorkflowFieldMap[] = [
  { sourceColumn: "prop_id", targetColumn: "parcel_number", transform: "string", notes: "Join key to parcels" },
  { sourceColumn: "exmpt_tax_yr", targetColumn: "tax_year", transform: "number" },
  { sourceColumn: "exmpt_type_cd", targetColumn: "exemption_type", transform: "string", notes: "Lookup: exmpt_type" },
  { sourceColumn: "exmpt_subtype_cd", targetColumn: "exemption_subtype", transform: "string", notes: "Lookup: exmpt_sub_type" },
  { sourceColumn: "review_request_date", targetColumn: "application_date", transform: "date" },
  { sourceColumn: "review_status_cd", targetColumn: "status", transform: "string" },
  { sourceColumn: "effective_dt", targetColumn: "effective_date", transform: "date" },
  { sourceColumn: "termination_dt", targetColumn: "expiration_date", transform: "date" },
  { sourceColumn: "exemption_pct", targetColumn: "exemption_percentage", transform: "number" },
  { sourceColumn: "dor_exmpt_amount", targetColumn: "exemption_amount", transform: "currency" },
  { sourceColumn: "dor_exmpt_percent", targetColumn: "dor_percentage", transform: "number" },
];

// ============================================================
// Extraction Queries — SQL Server (dbo schema)
// ============================================================

export const PACS_WORKFLOW_QUERIES = {
  /**
   * Appeals extraction — year-scoped via prop_val_yr.
   * Pending: prot_complete_dt IS NULL and prot_status not closed.
   */
  appeals: (year: number) => `
DECLARE @yr int = ${year};

SELECT
  ap.prop_id,
  ap.prop_val_yr,
  ap.case_id,
  ap.prot_type,
  ap.prot_status,
  ap.prot_create_dt,
  ap.prot_complete_dt
FROM dbo._arb_protest ap
WHERE ap.prop_val_yr = @yr;`,

  /** Appeals with neighborhood attachment */
  appealsWithNeighborhood: (year: number) => `
DECLARE @yr int = ${year};

SELECT
  p.geo_id AS apn,
  pv.hood_cd, n.hood_name,
  ap.*
FROM dbo._arb_protest ap
JOIN dbo.property p
  ON p.prop_id = ap.prop_id
JOIN dbo.property_val pv
  ON pv.prop_id = ap.prop_id AND pv.prop_val_yr = ap.prop_val_yr
JOIN dbo.neighborhood n
  ON n.hood_cd = pv.hood_cd AND n.hood_yr = pv.prop_val_yr
WHERE ap.prop_val_yr = @yr;`,

  /**
   * Permits extraction — bldg_permit_import_prop_id is VARCHAR, cast to INT.
   * Open: bldg_permit_dt_complete IS NULL AND bldg_permit_issue_dt IS NOT NULL.
   */
  permits: (_year: number) => `
SELECT
  bp.bldg_permit_id,
  TRY_CONVERT(int, bp.bldg_permit_import_prop_id) AS prop_id,
  bp.bldg_permit_num,
  bp.bldg_permit_type_cd,
  bp.bldg_permit_sub_type_cd,
  bp.bldg_permit_status,
  bp.bldg_permit_cad_status,
  bp.bldg_permit_issue_dt,
  bp.bldg_permit_dt_complete,
  bp.bldg_permit_val,
  bp.bldg_permit_area,
  bp.bldg_permit_import_dt
FROM dbo.building_permit bp
WHERE TRY_CONVERT(int, bp.bldg_permit_import_prop_id) IS NOT NULL;`,

  /** Permits with neighborhood attachment */
  permitsWithNeighborhood: (year: number) => `
DECLARE @yr int = ${year};

SELECT p.geo_id AS apn, pv.hood_cd, n.hood_name, bp.*
FROM dbo.building_permit bp
JOIN dbo.property p
  ON p.prop_id = TRY_CONVERT(int, bp.bldg_permit_import_prop_id)
JOIN dbo.property_val pv
  ON pv.prop_id = p.prop_id AND pv.prop_val_yr = @yr
JOIN dbo.neighborhood n
  ON n.hood_cd = pv.hood_cd AND n.hood_yr = pv.prop_val_yr;`,

  /**
   * Exemptions extraction — year-scoped via exmpt_tax_yr.
   * PII columns (SSN, DL) intentionally excluded.
   * Pending: review_request_date IS NOT NULL AND termination_dt IS NULL.
   */
  exemptions: (year: number) => `
DECLARE @yr int = ${year};

SELECT
  ex.prop_id,
  ex.exmpt_tax_yr,
  ex.exmpt_type_cd,
  ex.exmpt_subtype_cd,
  ex.review_request_date,
  ex.review_status_cd,
  ex.effective_dt,
  ex.termination_dt,
  ex.exemption_pct,
  ex.dor_exmpt_amount,
  ex.dor_exmpt_percent
FROM dbo.property_exemption ex
WHERE ex.exmpt_tax_yr = @yr;`,

  /** Exemptions with neighborhood attachment */
  exemptionsWithNeighborhood: (year: number) => `
DECLARE @yr int = ${year};

SELECT
  p.geo_id AS apn,
  pv.hood_cd, n.hood_name,
  ex.*
FROM dbo.property_exemption ex
JOIN dbo.property p
  ON p.prop_id = ex.prop_id
JOIN dbo.property_val pv
  ON pv.prop_id = ex.prop_id AND pv.prop_val_yr = @yr
JOIN dbo.neighborhood n
  ON n.hood_cd = pv.hood_cd AND n.hood_yr = pv.prop_val_yr
WHERE ex.exmpt_tax_yr = @yr;`,
};

// ============================================================
// "Open / Pending" Status Helpers
// ============================================================

/** Determine if a PACS appeal row is "pending" (not yet completed) */
export function isPACSAppealPending(row: Record<string, unknown>): boolean {
  return row.prot_complete_dt == null || row.prot_complete_dt === "";
}

/** Determine if a PACS permit row is "open" (issued but not completed) */
export function isPACSPermitOpen(row: Record<string, unknown>): boolean {
  const issued = row.bldg_permit_issue_dt != null && row.bldg_permit_issue_dt !== "";
  const notComplete = row.bldg_permit_dt_complete == null || row.bldg_permit_dt_complete === "";
  return issued && notComplete;
}

/** Determine if a PACS exemption row is "pending review" */
export function isPACSExemptionPending(row: Record<string, unknown>): boolean {
  const hasReviewRequest = row.review_request_date != null && row.review_request_date !== "";
  const notTerminated = row.termination_dt == null || row.termination_dt === "";
  return hasReviewRequest && notTerminated;
}

// ============================================================
// Supporting / Related Tables Reference (for future ingestion)
// ============================================================

export const PACS_WORKFLOW_RELATED_TABLES = {
  appeals: [
    { table: "_arb_protest_reason", notes: "Protest reasons per case" },
    { table: "_arb_protest_reason_cd", notes: "Reason code lookup" },
    { table: "_arb_event", notes: "Appeal events / timeline entries" },
    { table: "_arb_protest_protest_by_assoc", notes: "Who filed / representation" },
    { table: "arbitration", notes: "Hearing scheduling / panel / case association" },
  ],
  permits: [
    { table: "building_permit_transfer", notes: "Permit transfers across properties (source/destination)" },
    { table: "bld_permit_type", notes: "Permit type lookup" },
    { table: "bld_permit_sub_type", notes: "Permit subtype lookup" },
    { table: "bp_issuer_status_cd", notes: "Issuer status code lookup" },
    { table: "bp_cad_status_cd", notes: "CAD status code lookup" },
  ],
  exemptions: [
    { table: "property_prorated_exemptions", notes: "Prorated exemption details" },
    { table: "property_exemption_income", notes: "Income-based exemption data" },
    { table: "property_exemption_dor_detail", notes: "DOR detail records" },
    { table: "exmpt_type", notes: "Exemption type lookup" },
    { table: "exmpt_sub_type", notes: "Exemption subtype lookup" },
  ],
};
