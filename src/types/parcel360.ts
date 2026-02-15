// TerraFusion OS — Parcel 360 Contracts
// Snapshot (read), WriteIntent (write), TraceEvent (audit)

// ============================================================
// Source Module — who initiated the action
// ============================================================
export type SourceModule = "forge" | "atlas" | "dais" | "dossier" | "pilot" | "os";

// ============================================================
// TerraTrace Event Types (registry-controlled)
// ============================================================
export type TraceEventType =
  | "parcel_updated"
  | "value_override_created"
  | "workflow_state_changed"
  | "document_added"
  | "evidence_attached"
  | "notice_generated"
  | "model_run_completed"
  | "review_completed"
  | "review_skipped"
  | "parcel_viewed"
  | "pilot_tool_invoked"
  | "pilot_tool_completed"
  | "appeal_filed"
  | "appeal_resolved"
  | "exemption_decided"
  | "permit_status_changed";

export type ArtifactType =
  | "assessment"
  | "appeal"
  | "permit"
  | "exemption"
  | "document"
  | "model_receipt";

// ============================================================
// TraceEvent — what gets written to trace_events table
// ============================================================
export interface TraceEventParams {
  parcelId?: string | null;
  sourceModule: SourceModule;
  eventType: TraceEventType;
  eventData?: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
  artifactType?: ArtifactType;
  artifactId?: string;
}

export interface TraceEventRecord extends TraceEventParams {
  id: string;
  createdAt: string;
  countyId: string;
  actorId: string;
}

// ============================================================
// Write-Lane Domains
// ============================================================
export type WriteDomain =
  | "parcel_characteristics"
  | "valuations"
  | "comps"
  | "models"
  | "gis_layers"
  | "boundaries"
  | "spatial_annotations"
  | "permits"
  | "exemptions"
  | "appeals"
  | "notices"
  | "workflows"
  | "documents"
  | "narratives"
  | "packets"
  | "trace_events"
  | "user_prefs"
  | "pilot_profile";

// ============================================================
// WriteIntent — the contract for every mutation
// ============================================================
export interface WriteIntent {
  domain: WriteDomain;
  action: string;
  sourceModule: SourceModule;
  parcelId?: string | null;
  payload: Record<string, unknown>;
}

// ============================================================
// Parcel360 Snapshot — composed read model
// ============================================================
export interface Parcel360Identity {
  parcelNumber: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  countyId: string;
  propertyClass: string | null;
  neighborhoodCode: string | null;
}

export interface Parcel360Characteristics {
  yearBuilt: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  buildingArea: number | null;
  landArea: number | null;
  lat: number | null;
  lng: number | null;
}

export interface AssessmentRecord {
  id: string;
  taxYear: number;
  landValue: number;
  improvementValue: number;
  totalValue: number | null;
  certified: boolean;
  assessmentDate: string | null;
}

export interface Parcel360Valuation {
  assessedValue: number;
  landValue: number | null;
  improvementValue: number | null;
  latestAssessment: AssessmentRecord | null;
  history: AssessmentRecord[];
}

export interface SaleRecord {
  id: string;
  saleDate: string;
  salePrice: number;
  isQualified: boolean;
  grantor: string | null;
  grantee: string | null;
  deedType: string | null;
  saleType: string | null;
}

export interface Parcel360Sales {
  recentSales: SaleRecord[];
  qualifiedCount: number;
}

export interface AppealSummary {
  id: string;
  status: string;
  appealDate: string;
  originalValue: number;
  requestedValue: number | null;
  finalValue: number | null;
}

export interface ExemptionSummary {
  id: string;
  status: string;
  exemptionType: string;
  taxYear: number;
}

export interface PermitSummary {
  id: string;
  status: string;
  permitType: string;
  permitNumber: string;
}

export interface Parcel360Workflows {
  pendingAppeals: AppealSummary[];
  activeExemptions: ExemptionSummary[];
  openPermits: PermitSummary[];
  certificationStatus: "certified" | "uncertified" | "unknown";
}

export interface Parcel360Evidence {
  modelReceiptCount: number;
  lastModelRun: string | null;
  recentTraceEvents: TraceEventRecord[];
}

export interface Parcel360Freshness {
  identityAsOf: string;
  valuationAsOf: string | null;
  workflowsAsOf: string | null;
  evidenceAsOf: string | null;
}

export interface DomainLoadState {
  loading: boolean;
  error: string | null;
}

export interface Parcel360Snapshot {
  parcelId: string;
  identity: Parcel360Identity;
  characteristics: Parcel360Characteristics;
  valuation: Parcel360Valuation;
  sales: Parcel360Sales;
  workflows: Parcel360Workflows;
  evidence: Parcel360Evidence;
  freshness: Parcel360Freshness;
  missingDomains: string[];
  isComplete: boolean;
  domainStates: {
    identity: DomainLoadState;
    valuation: DomainLoadState;
    sales: DomainLoadState;
    workflows: DomainLoadState;
    evidence: DomainLoadState;
  };
}
