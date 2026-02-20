// TerraFusion OS — Metric Catalog (Single Source of Truth)
// Every key number in the OS has one canonical entry here.
// Used by: ExplainThisPanel, Explainable wrapper, SuiteHub, Factory, Workbench.
//
// Copy rule: zero jargon, plain English.
// Every entry MUST have: whatItMeans + soWhat + whereItCameFrom + ifItLooksWrong + proofLinks.
// "soWhat" connects the number to lived assessor reality (one sentence, no acronyms).

export interface MetricExplanation {
  /** Short human label */
  label: string;
  /** Plain English: what is this number counting */
  whatItMeans: string;
  /** "So what?" — one sentence anchoring to lived reality (readiness / appeals / levy accuracy) */
  soWhat: string;
  /** Where the data physically lives */
  whereItCameFrom: string;
  /** Plain English: what normally changes this */
  whatChangesIt: string;
  /** If it looks wrong, safe next steps (max 3). safe=true means no changes without confirmation. */
  ifItLooksWrong: { label: string; target: string; safe?: boolean }[];
  /** Optional health guidance */
  healthNote?: string;
  /** Proof Vault links */
  proofLinks?: { label: string; target: string }[];
  /** Optional: calculation formula for Trust Mode power users */
  calculation?: string;
  /** Optional: technical term for Trust Mode */
  technicalTerm?: string;
}

// ─── Canonical Targets ───────────────────────────────────────────
// All `target` values must resolve through the IA_MAP / handleNavigate.
// Use these constants to avoid string drift.

export const TARGET = {
  IDS:         "home:ids",
  QUALITY:     "home:quality",
  READINESS:   "home:readiness",
  PROOF_VAULT: "registry:trust",
  GEOEQUITY:   "factory:geoequity",
  CALIBRATION: "factory:calibration",
  VEI:         "factory:vei",
  WORKBENCH:   "workbench",
  DAIS:        "workbench:dais",
  DOSSIER:     "workbench:dossier",
  FORGE:       "workbench:forge",
  ATLAS:       "workbench:atlas",
} as const;

// ─── Catalog ────────────────────────────────────────────────────

export const METRIC_CATALOG: Record<string, MetricExplanation> = {

  // ── Parcel & Data Counts ─────────────────────────────────────

  "parcels.total": {
    label: "Total Parcels",
    whatItMeans: "The total number of land parcels in your county's database. Each parcel is a unique piece of land that gets assessed separately.",
    soWhat: "This affects readiness because every parcel needs a certified value before the roll closes — if this number is off, your coverage count may be wrong.",
    whereItCameFrom: "Counted directly from your parcels table. Updated every time you import or sync parcel records.",
    whatChangesIt: "Parcel imports, CAMA syncs, new subdivisions, or merges. A sudden drop usually means an import overwrite issue.",
    ifItLooksWrong: [
      { label: "Review last import", target: TARGET.IDS, safe: true },
      { label: "View data quality report", target: TARGET.QUALITY, safe: true },
    ],
    proofLinks: [
      { label: "View import receipts", target: TARGET.PROOF_VAULT },
      { label: "Open audit trail", target: TARGET.PROOF_VAULT },
    ],
    healthNote: "This number should only grow over time. A sudden drop usually means an import overwrite issue.",
    technicalTerm: "COUNT(*) FROM parcels WHERE county_id = current",
  },

  "sales.total": {
    label: "Total Sales",
    whatItMeans: "The number of recorded property sales in your county. This is the raw data that ratio studies and calibration runs are built on.",
    soWhat: "This affects model reliability because calibration needs at least 30–50 qualified sales per neighborhood to produce defensible values.",
    whereItCameFrom: "Counted from your sales table. Updated when you import a sales file or sync from your CAMA system.",
    whatChangesIt: "Sales CSV imports, CAMA syncs, or manual entries. Adding a new sales file will increase this count.",
    ifItLooksWrong: [
      { label: "Import a sales file", target: TARGET.IDS, safe: true },
      { label: "Review data quality", target: TARGET.QUALITY, safe: true },
    ],
    proofLinks: [
      { label: "View last import receipt", target: TARGET.PROOF_VAULT },
    ],
    healthNote: "Ratio studies need at least 30–50 qualified sales per neighborhood for reliable results.",
    technicalTerm: "COUNT(*) FROM sales WHERE county_id = current",
  },

  "assessments.total": {
    label: "Total Assessments",
    whatItMeans: "The number of assessment records in the system, across all tax years. Each parcel can have one assessment per year.",
    soWhat: "This affects your certification rate — every parcel needs an assessment for the current tax year before the roll can close.",
    whereItCameFrom: "Counted from your assessments table. Added when assessments are imported or created during calibration.",
    whatChangesIt: "Assessment imports, valuation model runs that write new values, or direct edits in the workbench.",
    ifItLooksWrong: [
      { label: "Import assessment data", target: TARGET.IDS, safe: true },
      { label: "Review model runs", target: TARGET.PROOF_VAULT, safe: true },
    ],
    proofLinks: [
      { label: "View model run receipts", target: TARGET.PROOF_VAULT },
    ],
    technicalTerm: "COUNT(*) FROM assessments WHERE county_id = current",
  },

  "assessments.certRate": {
    label: "Certification Rate",
    whatItMeans: "The percentage of this year's assessments that have been marked as certified. 100% means your roll is ready to close.",
    soWhat: "This is your go/no-go number — counties cannot close the roll until this reaches 100%, and every day it stays low is a compliance risk.",
    whereItCameFrom: "Calculated from assessments where certified = true, divided by total assessments for the current tax year.",
    whatChangesIt: "Certifying neighborhoods through the Dais workflow. Each certification action updates this number.",
    ifItLooksWrong: [
      { label: "Check certification status", target: TARGET.READINESS, safe: true },
      { label: "Review pending certifications", target: TARGET.DAIS, safe: true },
    ],
    proofLinks: [
      { label: "Open certification audit trail", target: TARGET.PROOF_VAULT },
    ],
    healthNote: "Most counties target 100% certification before the roll deadline. Use Roll Readiness to track your progress.",
    calculation: "SUM(certified = true) / COUNT(*) × 100 — current tax year only",
  },

  // ── Quality Scores ───────────────────────────────────────────

  "quality.overall": {
    label: "Data Quality Score",
    whatItMeans: "A single score (0–100%) measuring how complete your parcel data is. It averages three checks: coordinates, property class, and neighborhood code.",
    soWhat: "This affects model reliability and map accuracy — below 80%, valuation results may be unreliable and maps will have visible gaps.",
    whereItCameFrom: "Average of three coverage checks: parcels with coordinates, parcels with a property class, and parcels with a neighborhood code.",
    whatChangesIt: "Importing GIS data, classifying unclassified parcels, or assigning neighborhood codes. Each fix moves this number up.",
    ifItLooksWrong: [
      { label: "Fix missing coordinates", target: TARGET.GEOEQUITY, safe: true },
      { label: "Classify unclassified parcels", target: TARGET.QUALITY, safe: true },
      { label: "Assign neighborhood codes", target: TARGET.QUALITY, safe: true },
    ],
    proofLinks: [
      { label: "View quality audit log", target: TARGET.PROOF_VAULT },
    ],
    healthNote: "Aim for 90%+ before running valuation models. Below 80%, model results may be unreliable.",
    calculation: "(coords_pct + class_pct + neighborhood_pct) / 3",
  },

  "quality.coords": {
    label: "Parcel Coordinates",
    whatItMeans: "The percentage of your parcels that have GPS coordinates (latitude/longitude). Without coordinates, parcels can't appear on maps or pass spatial equity checks.",
    soWhat: "This affects appeals posture — a parcel without coordinates can't be shown on a map, which weakens your defense in any hearing.",
    whereItCameFrom: "Parcels where latitude AND longitude are both filled in, as a percentage of total parcels.",
    whatChangesIt: "Importing a GIS shapefile, running address geocoding, or manually entering coordinates.",
    ifItLooksWrong: [
      { label: "Import GIS data", target: TARGET.IDS, safe: true },
      { label: "Run spatial analysis", target: TARGET.GEOEQUITY, safe: true },
    ],
    proofLinks: [
      { label: "View GIS import receipts", target: TARGET.PROOF_VAULT },
    ],
    healthNote: "Missing coordinates block map views and neighborhood validation checks.",
    calculation: "COUNT(latitude IS NOT NULL AND longitude IS NOT NULL) / COUNT(*) × 100",
  },

  "quality.propertyClass": {
    label: "Property Class Coverage",
    whatItMeans: "The percentage of parcels with a property class assigned (Residential, Commercial, Agricultural, etc.). Valuation models use this to select the correct cost schedule.",
    soWhat: "This affects valuation accuracy — unclassified parcels use the wrong cost schedule, which directly causes valuation errors and appeal exposure.",
    whereItCameFrom: "Parcels where property_class is filled in, as a percentage of total parcels.",
    whatChangesIt: "Bulk classification from a CAMA export, or manual assignment in the workbench.",
    ifItLooksWrong: [
      { label: "Bulk assign from CAMA", target: TARGET.IDS, safe: true },
      { label: "Review unclassified parcels", target: TARGET.QUALITY, safe: true },
    ],
    proofLinks: [
      { label: "View classification receipts", target: TARGET.PROOF_VAULT },
    ],
    healthNote: "Unclassified parcels get the wrong cost schedule, causing valuation errors.",
    calculation: "COUNT(property_class IS NOT NULL) / COUNT(*) × 100",
  },

  "quality.neighborhood": {
    label: "Neighborhood Coverage",
    whatItMeans: "The percentage of parcels assigned to a neighborhood code. Neighborhood codes group parcels for calibration runs and ratio studies.",
    soWhat: "This affects calibration coverage — any unassigned parcels will be skipped during model runs, leaving their values undefended.",
    whereItCameFrom: "Parcels where neighborhood_code is filled in, as a percentage of total parcels.",
    whatChangesIt: "Importing a neighborhood assignment file, or GIS-based neighborhood delineation.",
    ifItLooksWrong: [
      { label: "Import neighborhood codes", target: TARGET.IDS, safe: true },
      { label: "Run spatial analysis", target: TARGET.GEOEQUITY, safe: true },
    ],
    proofLinks: [
      { label: "View neighborhood audit log", target: TARGET.PROOF_VAULT },
    ],
    healthNote: "100% neighborhood coverage is required for calibration runs to cover the whole county.",
    calculation: "COUNT(neighborhood_code IS NOT NULL) / COUNT(*) × 100",
  },

  // ── Workflow Counts ──────────────────────────────────────────

  "workflows.pendingAppeals": {
    label: "Pending Appeals",
    whatItMeans: "The number of property owner appeals that have been filed and are waiting for a decision. Each represents a parcel where the owner is contesting their assessed value.",
    soWhat: "This affects your appeals workload because each pending appeal has a legal deadline — missing one can result in an automatic value reduction.",
    whereItCameFrom: "Appeals table where status is 'filed', 'pending', or 'scheduled'.",
    whatChangesIt: "New appeals filed by property owners, or existing appeals being resolved or scheduled for a hearing.",
    ifItLooksWrong: [
      { label: "Review pending appeals", target: TARGET.DAIS, safe: true },
      { label: "Generate a proof packet", target: TARGET.DOSSIER, safe: true },
    ],
    proofLinks: [
      { label: "View appeal audit trail", target: TARGET.PROOF_VAULT },
      { label: "Open proof vault", target: TARGET.PROOF_VAULT },
    ],
    healthNote: "Unresolved appeals create compliance deadlines. Each one should have a resolution date assigned.",
    technicalTerm: "COUNT(*) FROM appeals WHERE status IN ('filed','pending','scheduled')",
  },

  "workflows.openPermits": {
    label: "Open Permits",
    whatItMeans: "Building and renovation permits filed but not yet closed. Open permits may mean a property has been improved and needs reassessment.",
    soWhat: "This affects assessment accuracy — unreviewed improvements mean some assessed values are lower than they should be, shrinking your levy base.",
    whereItCameFrom: "Permits table where status is 'applied', 'pending', or 'issued'.",
    whatChangesIt: "New permit applications, completed inspections, or finalized permits.",
    ifItLooksWrong: [
      { label: "Review open permits", target: TARGET.DAIS, safe: true },
    ],
    proofLinks: [
      { label: "View permit audit trail", target: TARGET.PROOF_VAULT },
    ],
    healthNote: "Permits open past their expected completion date often indicate an improvement that hasn't been assessed yet.",
    technicalTerm: "COUNT(*) FROM permits WHERE status IN ('applied','pending','issued')",
  },

  "workflows.pendingExemptions": {
    label: "Pending Exemptions",
    whatItMeans: "Exemption applications (homestead, veteran, senior, etc.) waiting for a decision. Approved exemptions reduce the taxable value of a parcel.",
    soWhat: "This affects your levy accuracy — unprocessed exemptions mean some taxpayers may be over-billed, creating liability and complaint exposure.",
    whereItCameFrom: "Exemptions table where status is 'pending'.",
    whatChangesIt: "New exemption applications, or pending ones being approved or denied.",
    ifItLooksWrong: [
      { label: "Review exemption queue", target: TARGET.DAIS, safe: true },
    ],
    proofLinks: [
      { label: "View exemption audit trail", target: TARGET.PROOF_VAULT },
    ],
    technicalTerm: "COUNT(*) FROM exemptions WHERE status = 'pending'",
  },

  // ── Calibration ──────────────────────────────────────────────

  "calibration.runCount": {
    label: "Model Runs",
    whatItMeans: "The number of calibration runs saved in the system. Each run is a snapshot of a valuation model — coefficients, sales used, and quality statistics.",
    soWhat: "This affects your defensibility — every appeal requires proof that your value came from a documented model run, not a guess.",
    whereItCameFrom: "Counted from the calibration_runs table. Increases every time you run and save a regression model.",
    whatChangesIt: "Running a model in TerraForge or the Factory. Each saved run adds one to this count.",
    ifItLooksWrong: [
      { label: "View model runs in Proof Vault", target: TARGET.PROOF_VAULT, safe: true },
      { label: "Run a new model", target: TARGET.CALIBRATION, safe: true },
    ],
    proofLinks: [
      { label: "Open Proof Vault", target: TARGET.PROOF_VAULT },
      { label: "View last model receipt", target: TARGET.PROOF_VAULT },
    ],
    technicalTerm: "COUNT(*) FROM calibration_runs WHERE county_id = current",
  },

  // ── Ratio Study (VEI) ────────────────────────────────────────

  "vei.medianRatio": {
    label: "Median Assessment Ratio",
    whatItMeans: "The middle value when you sort all ratios of assessed value ÷ sale price. A ratio of 1.00 means your assessments exactly match market prices.",
    soWhat: "This affects equity compliance — most states require median ratios between 0.90 and 1.10; outside this range, you may fail state review.",
    whereItCameFrom: "Calculated from your assessment_ratios table for the selected study period.",
    whatChangesIt: "Recalibrating your valuation model, importing new sales, or adjusting assessments.",
    ifItLooksWrong: [
      { label: "Review ratio study details", target: TARGET.VEI, safe: true },
      { label: "Run new calibration", target: TARGET.CALIBRATION, safe: true },
    ],
    proofLinks: [
      { label: "View ratio study receipt", target: TARGET.PROOF_VAULT },
    ],
    healthNote: "IAAO standard: median ratio should be between 0.90 and 1.10.",
    calculation: "PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY assessed_value / sale_price)",
    technicalTerm: "Median Assessment-to-Sales Ratio (ASR)",
  },

  "vei.cod": {
    label: "COD (Uniformity)",
    whatItMeans: "The Coefficient of Dispersion — it measures how consistently similar properties are assessed. Lower is better. A COD of 15 means assessments vary by about 15% from the median.",
    soWhat: "This affects fairness — a high COD means neighbors with similar houses pay different tax amounts, which is both inequitable and legally vulnerable.",
    whereItCameFrom: "Calculated from assessment ratios in your study period. Standard IAAO formula.",
    whatChangesIt: "Improving your valuation model fit, adding more comparable sales, or reviewing outlier properties.",
    ifItLooksWrong: [
      { label: "Review outliers in ratio study", target: TARGET.VEI, safe: true },
      { label: "Re-run calibration model", target: TARGET.CALIBRATION, safe: true },
    ],
    proofLinks: [
      { label: "View ratio study receipt", target: TARGET.PROOF_VAULT },
    ],
    healthNote: "IAAO standard for residential: COD < 15. Single-family target is often < 10.",
    calculation: "AVG(|ratio - median_ratio| / median_ratio) × 100",
    technicalTerm: "Coefficient of Dispersion (COD)",
  },

  "vei.prd": {
    label: "PRD (Regressivity)",
    whatItMeans: "The Price-Related Differential — it measures whether high-value properties are assessed at the same rate as low-value properties. A PRD near 1.00 is fair.",
    soWhat: "This affects equity — a PRD above 1.03 means lower-value homes are over-assessed relative to higher-value homes, which is a classic fairness failure.",
    whereItCameFrom: "Calculated from assessment ratios in your study period. Standard IAAO formula.",
    whatChangesIt: "Recalibrating your model to perform better across value tiers, or reviewing high-value sales.",
    ifItLooksWrong: [
      { label: "Review tier ratio analysis", target: TARGET.VEI, safe: true },
      { label: "Re-run calibration model", target: TARGET.CALIBRATION, safe: true },
    ],
    proofLinks: [
      { label: "View equity analysis receipt", target: TARGET.PROOF_VAULT },
    ],
    healthNote: "IAAO standard: PRD between 0.98 and 1.03.",
    calculation: "mean_ratio / (SUM(assessed_value) / SUM(sale_price))",
    technicalTerm: "Price-Related Differential (PRD)",
  },

  // ── Workbench Parcel Fields ──────────────────────────────────

  "parcel.assessedValue": {
    label: "Assessed Value",
    whatItMeans: "The official value this office has set for this property for tax purposes. This is the number the tax bill is calculated from.",
    soWhat: "This affects the owner's tax bill directly — if it's wrong, the owner may be over- or under-paying, and any appeal starts here.",
    whereItCameFrom: "Set by the last valuation model run or manual entry in the workbench, then certified by the assessor.",
    whatChangesIt: "A new calibration run, a direct edit in the workbench, or an appeal settlement.",
    ifItLooksWrong: [
      { label: "Review model run that produced this", target: TARGET.PROOF_VAULT, safe: true },
      { label: "Edit value in workbench", target: TARGET.FORGE, safe: true },
    ],
    proofLinks: [
      { label: "View model receipt", target: TARGET.PROOF_VAULT },
      { label: "View change history", target: TARGET.PROOF_VAULT },
    ],
    technicalTerm: "assessed_value — from parcels or assessments table",
  },

  "parcel.landValue": {
    label: "Land Value",
    whatItMeans: "The value assigned to the land itself, separate from any buildings or improvements on it. Land value reflects location, size, and zoning.",
    soWhat: "This affects the land/improvement split, which determines how the value is distributed for tax exemptions and some appeal strategies.",
    whereItCameFrom: "Stored in the assessments table. Set by the cost approach or direct land schedule lookup.",
    whatChangesIt: "A cost approach model run, a land schedule update, or a manual adjustment.",
    ifItLooksWrong: [
      { label: "Review cost schedule", target: TARGET.CALIBRATION, safe: true },
      { label: "Check land records", target: TARGET.ATLAS, safe: true },
    ],
    proofLinks: [
      { label: "View cost approach receipt", target: TARGET.PROOF_VAULT },
    ],
    technicalTerm: "land_value — from assessments table",
  },

  "parcel.improvementValue": {
    label: "Improvement Value",
    whatItMeans: "The value of the buildings and structures on a parcel, separate from the land. This covers the house, garage, outbuildings, etc.",
    soWhat: "This is often the largest part of the assessed value — if it's inconsistent with building characteristics, it's usually the first thing an owner will appeal.",
    whereItCameFrom: "Calculated by the cost approach model using square footage, year built, quality grade, and depreciation.",
    whatChangesIt: "A cost model run, an inspection update, a permit that triggered reassessment, or a manual edit.",
    ifItLooksWrong: [
      { label: "Review building characteristics", target: TARGET.FORGE, safe: true },
      { label: "Check open permits", target: TARGET.DAIS, safe: true },
    ],
    proofLinks: [
      { label: "View cost approach receipt", target: TARGET.PROOF_VAULT },
    ],
    technicalTerm: "improvement_value — from assessments table",
  },

  "parcel.openPermits": {
    label: "Open Permits on This Parcel",
    whatItMeans: "Building permits for this specific property that haven't been closed yet. Each open permit may represent an improvement that needs to be added to the assessed value.",
    soWhat: "This is a direct assessment gap — if a permit shows a $80,000 addition but the assessed value hasn't been updated, the owner is under-assessed.",
    whereItCameFrom: "Permits table filtered to this parcel_id where status is open.",
    whatChangesIt: "Permit finalization, inspection completion, or manual permit close-out.",
    ifItLooksWrong: [
      { label: "Review permits for this parcel", target: TARGET.DAIS, safe: true },
      { label: "Trigger reassessment", target: TARGET.FORGE, safe: true },
    ],
    proofLinks: [
      { label: "View permit history", target: TARGET.PROOF_VAULT },
    ],
    technicalTerm: "COUNT(*) FROM permits WHERE parcel_id = current AND status IN ('applied','pending','issued')",
  },

  "parcel.appealStatus": {
    label: "Appeal Status",
    whatItMeans: "Whether this parcel currently has an active appeal filed. If yes, the owner is formally contesting the assessed value with your office or the Board of Equalization.",
    soWhat: "This affects your workload and legal posture — an active appeal has deadlines, and losing means automatic value reduction without a strong proof packet.",
    whereItCameFrom: "Appeals table filtered to this parcel_id where status is active.",
    whatChangesIt: "A new appeal being filed, an existing appeal being resolved, or a hearing being scheduled.",
    ifItLooksWrong: [
      { label: "Review appeal details", target: TARGET.DAIS, safe: true },
      { label: "Assemble proof packet", target: TARGET.DOSSIER, safe: true },
    ],
    proofLinks: [
      { label: "Open Proof Vault for this parcel", target: TARGET.PROOF_VAULT },
    ],
    technicalTerm: "appeals WHERE parcel_id = current AND status IN ('filed','pending','scheduled')",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────

/** Returns the MetricExplanation for a key, or undefined. */
export function getMetric(key: string): MetricExplanation | undefined {
  return METRIC_CATALOG[key];
}

/** Returns all registered metric keys. */
export function getAllMetricKeys(): string[] {
  return Object.keys(METRIC_CATALOG);
}
