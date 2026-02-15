// TerraFusion OS — TerraFusionSync Contracts
// Sync Envelope, SAGA Step, and Health types

import type { SourceModule, TraceEventType } from "./parcel360";

// ============================================================
// Sync Envelope — canonical message format for all sync ops
// ============================================================
export interface SyncEnvelope {
  envelopeId: string;           // Idempotency key (UUID)
  tenantId: string;             // county_id for tenant isolation
  sourceSuite: SourceModule;    // Which suite initiated
  sourceLane: string;           // Write-lane domain
  actorId: string;              // user or service principal
  entityRef: {
    table: string;
    id: string;
  };
  schemaVersion: string;        // e.g. "2026.1"
  payloadHash: string;          // SHA256 of payload for integrity
  timestamp: string;            // ISO 8601
  payload: Record<string, unknown>;
}

// ============================================================
// SAGA Orchestration — step tracking via trace_events
// ============================================================
export type SagaStatus = "pending" | "running" | "completed" | "failed" | "compensating" | "compensated";

export interface SagaStep {
  stepId: string;
  name: string;
  action: string;               // e.g. "validate_schema", "transform_data"
  status: SagaStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  compensationAction?: string;  // What to run on rollback
}

export interface SagaDefinition {
  sagaId: string;
  name: string;                 // e.g. "bulk_data_import", "pacs_migration"
  tenantId: string;
  steps: SagaStep[];
  status: SagaStatus;
  correlationId: string;        // Groups all trace events for this saga
  createdAt: string;
  updatedAt: string;
  context: Record<string, unknown>; // Shared data between steps
}

// Pre-defined saga templates
export type SagaTemplate =
  | "bulk_import"
  | "assessment_update"
  | "pacs_migration"
  | "sync_refresh";

export const SAGA_TEMPLATES: Record<SagaTemplate, Omit<SagaStep, "stepId" | "status">[]> = {
  bulk_import: [
    { name: "Validate File", action: "validate_file" },
    { name: "Parse Records", action: "parse_records" },
    { name: "Schema Match", action: "schema_match" },
    { name: "Transform Data", action: "transform_data" },
    { name: "Stage Records", action: "stage_records" },
    { name: "Import Records", action: "import_records", compensationAction: "rollback_import" },
    { name: "Verify Integrity", action: "verify_integrity" },
  ],
  assessment_update: [
    { name: "Lock Parcels", action: "lock_parcels", compensationAction: "unlock_parcels" },
    { name: "Backup Values", action: "backup_values" },
    { name: "Apply Updates", action: "apply_updates", compensationAction: "restore_values" },
    { name: "Recalculate Ratios", action: "recalculate_ratios" },
    { name: "Validate Results", action: "validate_results" },
    { name: "Generate Report", action: "generate_report" },
  ],
  pacs_migration: [
    { name: "Validate PACS Config", action: "validate_pacs_config" },
    { name: "Extract Property Master", action: "extract_property", compensationAction: "rollback_property" },
    { name: "Extract Valuations", action: "extract_valuations" },
    { name: "Extract Sales History", action: "extract_sales" },
    { name: "Transform CIAPS Schema", action: "transform_ciaps_schema" },
    { name: "Map Field Aliases", action: "map_pacs_aliases" },
    { name: "Upsert Parcel Spine", action: "upsert_parcels", compensationAction: "rollback_parcels" },
    { name: "Publish Sales Stream", action: "publish_sales", compensationAction: "rollback_sales" },
    { name: "Publish Assessments", action: "publish_assessments", compensationAction: "rollback_assessments" },
    { name: "Publish Permits", action: "publish_permits" },
    { name: "Publish Exemptions", action: "publish_exemptions" },
    { name: "Backfill Assessment Records", action: "backfill_assessments" },
    { name: "Verify Data Integrity", action: "verify_pacs_integrity" },
    { name: "Generate Migration Report", action: "generate_migration_report" },
  ],
  sync_refresh: [
    { name: "Detect Changes", action: "detect_changes" },
    { name: "Diff Records", action: "diff_records" },
    { name: "Apply Deltas", action: "apply_deltas", compensationAction: "rollback_deltas" },
    { name: "Update Checksums", action: "update_checksums" },
    { name: "Emit Notifications", action: "emit_notifications" },
  ],
};

// ============================================================
// Health Monitor Types
// ============================================================
export type ServiceHealth = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface HealthCheck {
  service: string;
  status: ServiceHealth;
  latencyMs: number;
  message?: string;
  checkedAt: string;
}

export interface SystemHealth {
  overall: ServiceHealth;
  checks: HealthCheck[];
  uptime: string;
  version: string;
  timestamp: string;
}

// ============================================================
// Data Source Registry — for multi-source ingest
// ============================================================
export type DataSourceType = "csv_upload" | "arcgis_rest" | "api_endpoint" | "legacy_cama" | "manual_entry";

export interface DataSourceConfig {
  id: string;
  name: string;
  type: DataSourceType;
  connectionUrl?: string;
  schedule?: string;            // cron expression
  lastSyncAt?: string;
  lastSyncStatus?: "success" | "partial" | "failed";
  recordCount?: number;
  mappingConfig?: Record<string, string>; // source field → TF field
}

// ============================================================
// Sync Dashboard aggregate types
// ============================================================
export interface SyncActivitySummary {
  totalSyncs24h: number;
  successRate: number;
  activeSagas: number;
  pendingConflicts: number;
  circuitBreakers: Record<string, {
    state: string;
    failures: number;
  }>;
  health: SystemHealth;
}
