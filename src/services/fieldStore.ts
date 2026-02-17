// TerraFusion OS — Field Studio Local Store
// IndexedDB-backed event-sourced offline queue for field observations

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "terrafield";
const DB_VERSION = 2; // v2: adds syncAttempts + lastSyncAttempt to observations

// ── Types ──────────────────────────────────────────────────────────
export type InspectionStatus = "assigned" | "in_progress" | "completed" | "synced";
export type ObservationType = "condition" | "quality" | "photo" | "measurement" | "note" | "anomaly";
export type SyncStatus = "pending" | "syncing" | "synced" | "error";

export interface FieldAssignment {
  id: string;
  parcelId: string;
  parcelNumber: string;
  address: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  currentValue: number;
  propertyClass: string | null;
  priority: "routine" | "urgent" | "follow-up";
  status: InspectionStatus;
  assignedAt: string;
  inspectedAt: string | null;
  notes: string | null;
}

export interface FieldObservation {
  id: string;
  assignmentId: string;
  parcelId: string;
  type: ObservationType;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  data: Record<string, unknown>;
  syncStatus: SyncStatus;
  syncError: string | null;
  syncedAt: string | null;
  syncAttempts: number;
  lastSyncAttempt: string | null;
}

export interface ConditionRubric {
  overall: number; // 1-7 (C1=excellent ... C7=poor)
  roof: number;
  exterior: number;
  interior: number;
  mechanical: number;
  notes: string;
}

export interface QualityRubric {
  overall: number; // 1-6 (Q1=luxury ... Q6=minimal)
  materials: number;
  workmanship: number;
  design: number;
  notes: string;
}

// ── Database Init ──────────────────────────────────────────────────
let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1: initial stores
        if (oldVersion < 1) {
          const aStore = db.createObjectStore("assignments", { keyPath: "id" });
          aStore.createIndex("by-status", "status");
          aStore.createIndex("by-parcel", "parcelId");
          const oStore = db.createObjectStore("observations", { keyPath: "id" });
          oStore.createIndex("by-assignment", "assignmentId");
          oStore.createIndex("by-sync", "syncStatus");
          oStore.createIndex("by-parcel", "parcelId");
        }
        // v2: syncAttempts + lastSyncAttempt are added as properties on existing records
        // No schema changes needed — IDB is schemaless for record properties
      },
    });
  }
  return dbPromise;
}

// ── Assignment Operations ──────────────────────────────────────────
export async function saveAssignment(assignment: FieldAssignment): Promise<void> {
  const db = await getDB();
  await db.put("assignments", assignment);
}

export async function saveAssignments(assignments: FieldAssignment[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("assignments", "readwrite");
  for (const a of assignments) {
    await tx.store.put(a);
  }
  await tx.done;
}

export async function getAssignments(status?: InspectionStatus): Promise<FieldAssignment[]> {
  const db = await getDB();
  if (status) {
    return db.getAllFromIndex("assignments", "by-status", status);
  }
  return db.getAll("assignments");
}

export async function getAssignment(id: string): Promise<FieldAssignment | undefined> {
  const db = await getDB();
  return db.get("assignments", id);
}

export async function updateAssignmentStatus(id: string, status: InspectionStatus): Promise<void> {
  const db = await getDB();
  const assignment = await db.get("assignments", id);
  if (assignment) {
    assignment.status = status;
    if (status === "completed") assignment.inspectedAt = new Date().toISOString();
    await db.put("assignments", assignment);
  }
}

// ── Observation Operations ─────────────────────────────────────────
export async function addObservation(obs: Omit<FieldObservation, "id" | "syncStatus" | "syncError" | "syncedAt" | "syncAttempts" | "lastSyncAttempt">): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const fullObs: FieldObservation = {
    ...obs,
    id,
    syncStatus: "pending",
    syncError: null,
    syncedAt: null,
    syncAttempts: 0,
    lastSyncAttempt: null,
  };
  await db.put("observations", fullObs);
  return id;
}

export async function getObservations(assignmentId: string): Promise<FieldObservation[]> {
  const db = await getDB();
  return db.getAllFromIndex("observations", "by-assignment", assignmentId);
}

export async function getPendingObservations(): Promise<FieldObservation[]> {
  const db = await getDB();
  return db.getAllFromIndex("observations", "by-sync", "pending");
}

export async function markObservationSynced(id: string): Promise<void> {
  const db = await getDB();
  const obs = await db.get("observations", id);
  if (obs) {
    obs.syncStatus = "synced";
    obs.syncedAt = new Date().toISOString();
    await db.put("observations", obs);
  }
}

export async function markObservationError(id: string, error: string): Promise<void> {
  const db = await getDB();
  const obs = await db.get("observations", id);
  if (obs) {
    obs.syncStatus = "error";
    obs.syncError = error;
    obs.syncAttempts = (obs.syncAttempts || 0) + 1;
    obs.lastSyncAttempt = new Date().toISOString();
    await db.put("observations", obs);
  }
}

/** Mark an observation as "pending" to retry it. */
export async function resetObservationForRetry(id: string): Promise<void> {
  const db = await getDB();
  const obs = await db.get("observations", id);
  if (obs) {
    obs.syncStatus = "pending";
    obs.syncError = null;
    await db.put("observations", obs);
  }
}

/** Get observations eligible for retry (error status, under max attempts). */
export async function getRetryableObservations(maxAttempts = 3): Promise<FieldObservation[]> {
  const db = await getDB();
  const errors = await db.getAllFromIndex("observations", "by-sync", "error");
  return errors.filter((o) => (o.syncAttempts || 0) < maxAttempts);
}

// ── Sync Engine ────────────────────────────────────────────────────
export async function getQueueStats(): Promise<{ pending: number; synced: number; error: number; total: number }> {
  const db = await getDB();
  const all = await db.getAll("observations");
  return {
    pending: all.filter((o) => o.syncStatus === "pending").length,
    synced: all.filter((o) => o.syncStatus === "synced").length,
    error: all.filter((o) => o.syncStatus === "error").length,
    total: all.length,
  };
}
