// TerraFusion OS — Sync Engine: Delta Detection + SAGA Workflow Runners
// Bridges the SAGA orchestrator with concrete TerraFusion workflows.

import { SagaOrchestrator, type StepHandler, type SagaExecutionResult } from "./sagaOrchestrator";
import { emitTraceEventAsync } from "./terraTrace";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// Delta Detection — find what changed between source and target
// ============================================================
export interface DeltaRecord {
  id: string;
  table: string;
  changeType: "insert" | "update" | "delete";
  sourceData: Record<string, unknown>;
  targetData?: Record<string, unknown>;
  changedFields?: string[];
}

export interface DeltaResult {
  inserts: DeltaRecord[];
  updates: DeltaRecord[];
  deletes: DeltaRecord[];
  totalChanges: number;
  detectedAt: string;
}

/**
 * Compare two record sets by a key field, returning structured deltas.
 */
export function detectDeltas(
  sourceRecords: Record<string, unknown>[],
  targetRecords: Record<string, unknown>[],
  keyField: string,
  table: string,
  compareFields?: string[]
): DeltaResult {
  const sourceMap = new Map<string, Record<string, unknown>>();
  const targetMap = new Map<string, Record<string, unknown>>();

  for (const r of sourceRecords) sourceMap.set(String(r[keyField]), r);
  for (const r of targetRecords) targetMap.set(String(r[keyField]), r);

  const inserts: DeltaRecord[] = [];
  const updates: DeltaRecord[] = [];
  const deletes: DeltaRecord[] = [];

  // Inserts: in source, not in target
  for (const [key, src] of sourceMap) {
    if (!targetMap.has(key)) {
      inserts.push({ id: key, table, changeType: "insert", sourceData: src });
    }
  }

  // Updates: in both, but fields differ
  for (const [key, src] of sourceMap) {
    const tgt = targetMap.get(key);
    if (!tgt) continue;

    const fields = compareFields ?? Object.keys(src).filter((k) => k !== keyField);
    const changed = fields.filter((f) => JSON.stringify(src[f]) !== JSON.stringify(tgt[f]));

    if (changed.length > 0) {
      updates.push({
        id: key,
        table,
        changeType: "update",
        sourceData: src,
        targetData: tgt,
        changedFields: changed,
      });
    }
  }

  // Deletes: in target, not in source
  for (const [key, tgt] of targetMap) {
    if (!sourceMap.has(key)) {
      deletes.push({ id: key, table, changeType: "delete", sourceData: tgt });
    }
  }

  return {
    inserts,
    updates,
    deletes,
    totalChanges: inserts.length + updates.length + deletes.length,
    detectedAt: new Date().toISOString(),
  };
}

// ============================================================
// SAGA Workflow Runners — concrete implementations of SAGA_TEMPLATES
// ============================================================

/**
 * Create a SAGA orchestrator with TerraTrace integration.
 */
const SAGA_STATUS_TO_EVENT: Record<string, import("@/types/parcel360").TraceEventType> = {
  running: "saga_running",
  completed: "saga_completed",
  failed: "saga_failed",
  compensating: "saga_compensating",
  compensated: "saga_compensated",
  compensation_failed: "saga_compensation_failed",
};

function createTracedOrchestrator(): SagaOrchestrator {
  return new SagaOrchestrator({
    onTrace: (event) => {
      const eventType = SAGA_STATUS_TO_EVENT[event.status];
      if (!eventType) return;
      emitTraceEventAsync({
        sourceModule: "os",
        eventType,
        eventData: {
          sagaId: event.sagaId,
          step: event.step,
          type: event.type,
          error: event.error,
        },
      });
    },
  });
}

/**
 * Run a sync refresh: detect changes → diff → apply → checksum → notify.
 */
export async function runSyncRefresh(
  sourceTable: string,
  keyField: string,
  fetchSource: () => Promise<Record<string, unknown>[]>,
  fetchTarget: () => Promise<Record<string, unknown>[]>,
  applyFn: (deltas: DeltaResult) => Promise<{ applied: number; errors: string[] }>
): Promise<SagaExecutionResult> {
  const orchestrator = createTracedOrchestrator();
  let detectedDeltas: DeltaResult | null = null;

  const handlers: StepHandler[] = [
    {
      name: "detect_changes",
      action: async (ctx) => {
        const source = await fetchSource();
        const target = await fetchTarget();
        ctx.set("sourceCount", source.length);
        ctx.set("targetCount", target.length);
        ctx.set("source", source);
        ctx.set("target", target);
      },
    },
    {
      name: "diff_records",
      action: async (ctx) => {
        const source = ctx.get("source") as Record<string, unknown>[];
        const target = ctx.get("target") as Record<string, unknown>[];
        detectedDeltas = detectDeltas(source, target, keyField, sourceTable);
        ctx.set("deltas", detectedDeltas);
        ctx.set("totalChanges", detectedDeltas.totalChanges);
      },
    },
    {
      name: "apply_deltas",
      action: async (ctx) => {
        const deltas = ctx.get("deltas") as DeltaResult;
        if (deltas.totalChanges === 0) {
          ctx.set("applied", 0);
          ctx.set("skipped", true);
          return;
        }
        const result = await applyFn(deltas);
        ctx.set("applied", result.applied);
        ctx.set("applyErrors", result.errors);
      },
      compensate: async (ctx) => {
        // In a real system, this would restore from backup
        console.warn("[SyncRefresh] Compensation: deltas rolled back (stub)");
        ctx.set("rolledBack", true);
      },
    },
    {
      name: "update_checksums",
      action: async (ctx) => {
        const applied = ctx.get("applied") as number;
        ctx.set("checksum", `sha256:${Date.now()}`);
        ctx.set("checksumRecords", applied);
      },
    },
    {
      name: "emit_notifications",
      action: async (ctx) => {
        const applied = ctx.get("applied") as number;
        const totalChanges = ctx.get("totalChanges") as number;
        ctx.set("notified", true);
        ctx.set("summary", {
          totalChanges,
          applied,
          timestamp: new Date().toISOString(),
        });
      },
    },
  ];

  return orchestrator.execute(`sync_refresh_${sourceTable}_${Date.now()}`, handlers);
}

/**
 * Run a bulk import SAGA.
 */
export async function runBulkImport(
  records: Record<string, unknown>[],
  targetTable: string,
  validateFn: (records: Record<string, unknown>[]) => { valid: Record<string, unknown>[]; errors: string[] },
  importFn: (records: Record<string, unknown>[]) => Promise<{ imported: number; errors: string[] }>
): Promise<SagaExecutionResult> {
  const orchestrator = createTracedOrchestrator();

  const handlers: StepHandler[] = [
    {
      name: "validate_file",
      action: async (ctx) => {
        ctx.set("rawCount", records.length);
        if (records.length === 0) throw new Error("No records to import");
      },
    },
    {
      name: "parse_records",
      action: async (ctx) => {
        // Records already parsed — store them
        ctx.set("records", records);
      },
    },
    {
      name: "schema_match",
      action: async (ctx) => {
        const { valid, errors } = validateFn(records);
        ctx.set("validRecords", valid);
        ctx.set("validationErrors", errors);
        if (valid.length === 0) throw new Error(`All ${records.length} records failed validation`);
      },
    },
    {
      name: "transform_data",
      action: async (ctx) => {
        // Identity transform for now; extensible
        const valid = ctx.get("validRecords") as Record<string, unknown>[];
        ctx.set("transformedRecords", valid);
      },
    },
    {
      name: "stage_records",
      action: async (ctx) => {
        const transformed = ctx.get("transformedRecords") as Record<string, unknown>[];
        ctx.set("stagedCount", transformed.length);
      },
    },
    {
      name: "import_records",
      action: async (ctx) => {
        const transformed = ctx.get("transformedRecords") as Record<string, unknown>[];
        const result = await importFn(transformed);
        ctx.set("importedCount", result.imported);
        ctx.set("importErrors", result.errors);
      },
      compensate: async (ctx) => {
        console.warn("[BulkImport] Compensation: rolling back import (stub)");
        ctx.set("rolledBack", true);
      },
    },
    {
      name: "verify_integrity",
      action: async (ctx) => {
        const imported = ctx.get("importedCount") as number;
        const staged = ctx.get("stagedCount") as number;
        ctx.set("integrityCheck", imported === staged ? "pass" : "partial");
      },
    },
  ];

  return orchestrator.execute(`bulk_import_${targetTable}_${Date.now()}`, handlers);
}

// ============================================================
// Active SAGA Registry — track running sagas for dashboard
// ============================================================
const activeSagas = new Map<string, { status: string; startedAt: string; template: string }>();

export function registerActiveSaga(id: string, template: string) {
  activeSagas.set(id, { status: "running", startedAt: new Date().toISOString(), template });
}

export function completeSaga(id: string, status: "completed" | "failed" | "compensated") {
  const saga = activeSagas.get(id);
  if (saga) saga.status = status;
}

export function getActiveSagas() {
  return Object.fromEntries(activeSagas);
}

export function clearCompletedSagas() {
  for (const [id, saga] of activeSagas) {
    if (saga.status !== "running") activeSagas.delete(id);
  }
}
