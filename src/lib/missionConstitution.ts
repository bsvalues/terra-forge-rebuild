// TerraFusion OS — Mission Constitution
// Single source of truth for every correction mission.
// All missions are defined here; useSmartActions consumes this registry.
// "One registry, one definition, one audit trail."

export type MissionScope = "county" | "neighborhood" | "parcel";
export type MissionPriority = "critical" | "high" | "medium" | "info";

export interface MissionDefinition {
  id: string;
  title: string;
  scope: MissionScope;
  /** Human-readable description template. Use {{count}} / {{pct}} placeholders. */
  descriptionTemplate: string;
  /** Icon name from lucide-react */
  iconName: string;
  /** Navigation target (IA_MAP canonical) */
  target: string;
  /** Minimum count/threshold to surface the mission */
  threshold: number;
  /** Priority escalation threshold (above this → bump priority) */
  escalationThreshold?: number;
  /** Default priority */
  priority: MissionPriority;
  /** Escalated priority when above escalationThreshold */
  escalatedPriority?: MissionPriority;
  /** SLA: minimum days between surfacing (prevents spam) */
  slaCooldownDays: number;
  /** Which roles can execute */
  roleGate: ("admin" | "moderator" | "user")[];
  /** County impact category shown on completion */
  impactCategory: MissionImpactCategory;
  /** Receipt template key */
  receiptAction: string;
  /** Trust boundary: data sources used */
  dataSources: string[];
  /** Whether this mission can generate a learning rule on completion */
  canCreateRule: boolean;
}

export type MissionImpactCategory =
  | "appeal_risk_reduced"
  | "model_reliability_improved"
  | "readiness_improved"
  | "data_consistency_improved"
  | "equity_improved";

export const IMPACT_LABELS: Record<MissionImpactCategory, { label: string; color: string }> = {
  appeal_risk_reduced: { label: "Appeal Risk Reduced", color: "hsl(var(--tf-optimized-green))" },
  model_reliability_improved: { label: "Model Reliability Improved", color: "hsl(var(--tf-transcend-cyan))" },
  readiness_improved: { label: "Readiness Improved", color: "hsl(var(--tf-bright-cyan))" },
  data_consistency_improved: { label: "Data Consistency Improved", color: "hsl(var(--suite-forge))" },
  equity_improved: { label: "Equity Improved", color: "hsl(var(--tf-sacred-gold))" },
};

// ── The Mission Registry ──────────────────────────────────────────────
export const MISSION_REGISTRY: MissionDefinition[] = [
  {
    id: "zero-imp-permits",
    title: "Improvement = $0 with Active Permits",
    scope: "county",
    descriptionTemplate: "{{count}} parcels have $0 improvement value but active building permits — likely missing data",
    iconName: "AlertTriangle",
    target: "home:quality",
    threshold: 5,
    escalationThreshold: 20,
    priority: "high",
    escalatedPriority: "critical",
    slaCooldownDays: 1,
    roleGate: ["admin", "moderator", "user"],
    impactCategory: "appeal_risk_reduced",
    receiptAction: "correction.zero_improvement_fixed",
    dataSources: ["parcels", "permits"],
    canCreateRule: true,
  },
  {
    id: "sale-outliers",
    title: "Sale Price Outliers Detected",
    scope: "county",
    descriptionTemplate: "{{count}} qualified sales fall outside IQR fences — review for disqualification",
    iconName: "AlertTriangle",
    target: "factory:vei",
    threshold: 3,
    escalationThreshold: 15,
    priority: "medium",
    escalatedPriority: "high",
    slaCooldownDays: 7,
    roleGate: ["admin", "moderator"],
    impactCategory: "model_reliability_improved",
    receiptAction: "correction.sale_outliers_reviewed",
    dataSources: ["sales"],
    canCreateRule: true,
  },
  {
    id: "nbhd-drift",
    title: "Neighborhood Code Drift",
    scope: "county",
    descriptionTemplate: "{{count}} neighborhood codes have ≤2 parcels — likely typos or legacy codes",
    iconName: "Shield",
    target: "home:quality",
    threshold: 3,
    escalationThreshold: 10,
    priority: "medium",
    escalatedPriority: "high",
    slaCooldownDays: 7,
    roleGate: ["admin", "moderator"],
    impactCategory: "data_consistency_improved",
    receiptAction: "correction.nbhd_drift_fixed",
    dataSources: ["parcels"],
    canCreateRule: true,
  },
  {
    id: "uncalibrated",
    title: "Uncalibrated Neighborhoods",
    scope: "county",
    descriptionTemplate: "{{count}} neighborhood(s) need regression calibration",
    iconName: "BarChart3",
    target: "factory:calibration",
    threshold: 1,
    priority: "high",
    slaCooldownDays: 1,
    roleGate: ["admin", "moderator", "user"],
    impactCategory: "model_reliability_improved",
    receiptAction: "calibration.neighborhood_calibrated",
    dataSources: ["parcels", "calibration_runs"],
    canCreateRule: false,
  },
  {
    id: "appeals",
    title: "Pending Appeals",
    scope: "county",
    descriptionTemplate: "{{count}} appeal(s) awaiting review",
    iconName: "Gavel",
    target: "workbench:dais:appeals",
    threshold: 1,
    escalationThreshold: 10,
    priority: "medium",
    escalatedPriority: "critical",
    slaCooldownDays: 1,
    roleGate: ["admin", "moderator", "user"],
    impactCategory: "appeal_risk_reduced",
    receiptAction: "workflow.appeal_resolved",
    dataSources: ["appeals"],
    canCreateRule: false,
  },
  {
    id: "geocoding",
    title: "Missing Coordinates",
    scope: "county",
    descriptionTemplate: "{{pct}}% of parcels lack geocoding — affects spatial analysis",
    iconName: "Shield",
    target: "factory:geoequity",
    threshold: 20, // only surface if >20% missing
    escalationThreshold: 50,
    priority: "high",
    escalatedPriority: "critical",
    slaCooldownDays: 3,
    roleGate: ["admin", "moderator", "user"],
    impactCategory: "equity_improved",
    receiptAction: "correction.geocoding_enriched",
    dataSources: ["parcels"],
    canCreateRule: false,
  },
  {
    id: "sales-data",
    title: "Low Sales Volume",
    scope: "county",
    descriptionTemplate: "Import more sales data to improve ratio studies and calibration",
    iconName: "Upload",
    target: "home:ids",
    threshold: 0, // always surface if <50 sales
    priority: "medium",
    slaCooldownDays: 7,
    roleGate: ["admin", "moderator", "user"],
    impactCategory: "model_reliability_improved",
    receiptAction: "ingest.sales_imported",
    dataSources: ["sales"],
    canCreateRule: false,
  },
  {
    id: "uncertified",
    title: "Uncertified Assessments",
    scope: "county",
    descriptionTemplate: "{{count}} assessment(s) pending certification",
    iconName: "CheckCircle2",
    target: "home:readiness",
    threshold: 1,
    escalationThreshold: 100,
    priority: "medium",
    escalatedPriority: "high",
    slaCooldownDays: 1,
    roleGate: ["admin", "moderator"],
    impactCategory: "readiness_improved",
    receiptAction: "certification.assessment_certified",
    dataSources: ["assessments"],
    canCreateRule: false,
  },
  {
    id: "mapping-review",
    title: "Low-Confidence Mappings",
    scope: "county",
    descriptionTemplate: "{{count}} column mapping(s) need review — fix once to train the system",
    iconName: "Brain",
    target: "home:ids",
    threshold: 3,
    escalationThreshold: 10,
    priority: "medium",
    escalatedPriority: "high",
    slaCooldownDays: 7,
    roleGate: ["admin", "moderator", "user"],
    impactCategory: "data_consistency_improved",
    receiptAction: "learning.mapping_corrected",
    dataSources: ["ingest_mapping_rules"],
    canCreateRule: false,
  },
  {
    id: "set-default-profile",
    title: "Set Default Mapping Profile",
    scope: "county",
    descriptionTemplate: "{{count}} dataset type(s) missing default profiles",
    iconName: "Star",
    target: "home:ids",
    threshold: 1,
    priority: "info",
    slaCooldownDays: 30,
    roleGate: ["admin", "moderator"],
    impactCategory: "data_consistency_improved",
    receiptAction: "learning.default_profile_set",
    dataSources: ["ingest_mapping_profiles"],
    canCreateRule: false,
  },
  // ── Characteristics Consistency Missions ────────────────────────────
  {
    id: "building-area-outliers",
    title: "Building Area Outliers",
    scope: "county",
    descriptionTemplate: "{{count}} parcels have building area outside 1.5×IQR for their property class — likely data entry errors or missing updates",
    iconName: "Ruler",
    target: "home:quality",
    threshold: 5,
    escalationThreshold: 25,
    priority: "high",
    escalatedPriority: "critical",
    slaCooldownDays: 7,
    roleGate: ["admin", "moderator", "user"],
    impactCategory: "model_reliability_improved",
    receiptAction: "characteristics.area_outlier_corrected",
    dataSources: ["parcels"],
    canCreateRule: true,
  },
  {
    id: "impossible-year-built",
    title: "Impossible Year Built",
    scope: "county",
    descriptionTemplate: "{{count}} parcels have nonsensical year_built values — wrecks depreciation and condition modeling",
    iconName: "CalendarX2",
    target: "home:quality",
    threshold: 3,
    escalationThreshold: 15,
    priority: "high",
    escalatedPriority: "critical",
    slaCooldownDays: 7,
    roleGate: ["admin", "moderator", "user"],
    impactCategory: "model_reliability_improved",
    receiptAction: "characteristics.year_built_sanitized",
    dataSources: ["parcels"],
    canCreateRule: true,
  },
  {
    id: "missing-building-area",
    title: "Missing Building Areas",
    scope: "county",
    descriptionTemplate: "{{count}} parcels have improvement value but no building area — not defensible without measurement data",
    iconName: "SquareDashed",
    target: "home:quality",
    threshold: 10,
    escalationThreshold: 50,
    priority: "high",
    escalatedPriority: "critical",
    slaCooldownDays: 7,
    roleGate: ["admin", "moderator", "user"],
    impactCategory: "readiness_improved",
    receiptAction: "characteristics.area_missing_workflow_created",
    dataSources: ["parcels", "assessments"],
    canCreateRule: false,
  },
];

/** Look up a mission definition by id */
export function getMission(id: string): MissionDefinition | undefined {
  return MISSION_REGISTRY.find((m) => m.id === id);
}

/** Resolve description template with values */
export function renderMissionDescription(
  mission: MissionDefinition,
  values: Record<string, string | number>
): string {
  let desc = mission.descriptionTemplate;
  for (const [key, val] of Object.entries(values)) {
    desc = desc.replace(`{{${key}}}`, String(val));
  }
  return desc;
}
