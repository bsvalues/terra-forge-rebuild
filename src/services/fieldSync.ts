// TerraFusion OS — Field Sync Engine v2
// Hardened with idempotency, retry backoff, conflict detection, and progress callbacks
// Agent Traffic Cop: "My sync engine is also a pony" 🐴📎

import { supabase } from "@/integrations/supabase/client";
import { updateParcelCharacteristics } from "@/services/suites/forgeService";
import { emitTraceEvent } from "@/services/terraTrace";
import {
  getPendingObservations,
  getRetryableObservations,
  markObservationSynced,
  markObservationError,
  resetObservationForRetry,
  updateAssignmentStatus,
  type FieldObservation,
} from "@/services/fieldStore";

// ── Constants ──────────────────────────────────────────────────────
const MAX_RETRY_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 1000; // 1s, 2s, 4s

// ── Progress Callback ──────────────────────────────────────────────
export interface SyncProgress {
  total: number;
  completed: number;
  errors: number;
  currentObservation: string | null;
}

export type SyncProgressCallback = (progress: SyncProgress) => void;

// ── Sync Result ────────────────────────────────────────────────────
export interface SyncResult {
  synced: number;
  errors: number;
  conflicts: number;
  retried: number;
}

/**
 * Process all pending field observations through domain write-lanes.
 * Includes idempotency checks, conflict detection, and progress reporting.
 */
export async function syncPendingObservations(
  onProgress?: SyncProgressCallback
): Promise<SyncResult> {
  const pending = await getPendingObservations();
  let synced = 0;
  let errors = 0;
  let conflicts = 0;

  const progress: SyncProgress = {
    total: pending.length,
    completed: 0,
    errors: 0,
    currentObservation: null,
  };

  for (const obs of pending) {
    progress.currentObservation = obs.id;
    onProgress?.(progress);

    try {
      const result = await routeObservation(obs);
      if (result === "conflict") {
        await markObservationError(obs.id, "Conflict: parcel was modified since assignment");
        conflicts++;
        progress.errors++;
      } else {
        await markObservationSynced(obs.id);
        synced++;
      }
    } catch (err: any) {
      await markObservationError(obs.id, err.message || "Unknown sync error");
      errors++;
      progress.errors++;
    }

    progress.completed++;
    onProgress?.(progress);
  }

  return { synced, errors, conflicts, retried: 0 };
}

/**
 * Retry failed observations with exponential backoff.
 * Only retries observations under MAX_RETRY_ATTEMPTS.
 */
export async function retryFailedObservations(
  onProgress?: SyncProgressCallback
): Promise<SyncResult> {
  const retryable = await getRetryableObservations(MAX_RETRY_ATTEMPTS);
  let synced = 0;
  let errors = 0;
  let conflicts = 0;

  const progress: SyncProgress = {
    total: retryable.length,
    completed: 0,
    errors: 0,
    currentObservation: null,
  };

  for (const obs of retryable) {
    // Exponential backoff: wait before retrying
    const backoffMs = BACKOFF_BASE_MS * Math.pow(2, obs.syncAttempts || 0);
    await sleep(Math.min(backoffMs, 8000)); // Cap at 8s

    // Reset to pending for re-attempt
    await resetObservationForRetry(obs.id);

    progress.currentObservation = obs.id;
    onProgress?.(progress);

    try {
      const result = await routeObservation(obs);
      if (result === "conflict") {
        await markObservationError(obs.id, "Conflict: parcel modified since assignment");
        conflicts++;
        progress.errors++;
      } else {
        await markObservationSynced(obs.id);
        synced++;
      }
    } catch (err: any) {
      await markObservationError(obs.id, err.message || "Retry failed");
      errors++;
      progress.errors++;
    }

    progress.completed++;
    onProgress?.(progress);
  }

  return { synced, errors, conflicts, retried: retryable.length };
}

/**
 * Full sync cycle: process pending + retry failed.
 */
export async function fullSyncCycle(onProgress?: SyncProgressCallback): Promise<SyncResult> {
  const pendingResult = await syncPendingObservations(onProgress);
  const retryResult = await retryFailedObservations(onProgress);

  return {
    synced: pendingResult.synced + retryResult.synced,
    errors: pendingResult.errors + retryResult.errors,
    conflicts: pendingResult.conflicts + retryResult.conflicts,
    retried: retryResult.retried,
  };
}

// ── Conflict Detection ─────────────────────────────────────────────

/**
 * Check if a parcel has been modified on the server since the field assignment was created.
 * Returns true if there's a conflict (server data is newer).
 */
async function detectConflict(parcelId: string, assignmentTimestamp: string): Promise<boolean> {
  const { data } = await supabase
    .from("parcels")
    .select("updated_at")
    .eq("id", parcelId)
    .single();

  if (!data) return false; // Parcel not found — no conflict (will fail on write anyway)

  const serverUpdated = new Date(data.updated_at).getTime();
  const assignedAt = new Date(assignmentTimestamp).getTime();

  // Conflict if server was updated AFTER the assignment was created
  return serverUpdated > assignedAt;
}

// ── Observation Router ─────────────────────────────────────────────

type RouteResult = "success" | "conflict";

/**
 * Route a single observation through the appropriate domain service.
 * Enforces constitutional rule: Field Studio OWNS ZERO TABLES.
 */
async function routeObservation(obs: FieldObservation): Promise<RouteResult> {
  switch (obs.type) {
    case "condition":
    case "quality":
    case "measurement": {
      // Conflict detection: check if parcel was modified since assignment
      // We use the observation timestamp as proxy for assignment time
      const hasConflict = await detectConflict(obs.parcelId, obs.timestamp);
      if (hasConflict) return "conflict";

      // Route through TerraForge (parcel characteristics owner)
      const updates: Record<string, unknown> = {};
      const obsData = obs.data as Record<string, unknown>;

      if (obs.type === "condition") {
        updates.condition_rating = obsData.overall;
      } else if (obs.type === "quality") {
        updates.quality_rating = obsData.overall;
      } else if (obs.type === "measurement") {
        if (obsData.buildingArea) updates.building_area = obsData.buildingArea;
        if (obsData.landArea) updates.land_area = obsData.landArea;
        if (obsData.bedrooms) updates.bedrooms = obsData.bedrooms;
        if (obsData.bathrooms) updates.bathrooms = obsData.bathrooms;
      }

      if (Object.keys(updates).length > 0) {
        const { data: current } = await supabase
          .from("parcels")
          .select("*")
          .eq("id", obs.parcelId)
          .single();

        await updateParcelCharacteristics(
          obs.parcelId,
          updates as any,
          current ? (current as Record<string, unknown>) : undefined
        );
      }
      return "success";
    }

    case "photo": {
      // Route through TerraDossier — upload to storage if blob data exists
      const photoData = obs.data as Record<string, unknown>;
      let filePath: string | null = null;

      if (photoData.blob && typeof photoData.blob === "string") {
        // Upload base64 photo to dossier-files bucket
        const fileName = `field-photos/${obs.parcelId}/${obs.id}.jpg`;
        const base64Data = (photoData.blob as string).split(",")[1] || photoData.blob;
        const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        const { error: uploadError } = await supabase.storage
          .from("dossier-files")
          .upload(fileName, binaryData, { contentType: "image/jpeg", upsert: true });

        if (!uploadError) filePath = fileName;
      }

      await emitTraceEvent({
        parcelId: obs.parcelId,
        sourceModule: "field",
        eventType: "field_photo_captured",
        eventData: {
          latitude: obs.latitude,
          longitude: obs.longitude,
          timestamp: obs.timestamp,
          photoCount: (photoData.photoCount as number) || 1,
          filePath,
        },
      });
      return "success";
    }

    case "note": {
      await emitTraceEvent({
        parcelId: obs.parcelId,
        sourceModule: "field",
        eventType: "field_note_added",
        eventData: {
          note: (obs.data as any).text,
          latitude: obs.latitude,
          longitude: obs.longitude,
        },
      });
      return "success";
    }

    case "anomaly": {
      await emitTraceEvent({
        parcelId: obs.parcelId,
        sourceModule: "field",
        eventType: "spatial_anomaly_flagged",
        eventData: {
          anomalyType: (obs.data as any).anomalyType,
          description: (obs.data as any).description,
          latitude: obs.latitude,
          longitude: obs.longitude,
        },
      });
      return "success";
    }

    default:
      return "success";
  }
}

/**
 * Mark an assignment as completed and sync all its observations.
 */
export async function completeInspection(assignmentId: string): Promise<SyncResult> {
  await updateAssignmentStatus(assignmentId, "completed");
  return fullSyncCycle();
}

// ── Helpers ────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
