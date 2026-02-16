// TerraFusion OS — Field Sync Engine
// Routes field observations through domain services (never writes directly)

import { supabase } from "@/integrations/supabase/client";
import { updateParcelCharacteristics } from "@/services/suites/forgeService";
import { emitTraceEvent } from "@/services/terraTrace";
import {
  getPendingObservations,
  markObservationSynced,
  markObservationError,
  updateAssignmentStatus,
  type FieldObservation,
} from "@/services/fieldStore";

/**
 * Process all pending field observations through domain write-lanes.
 * Returns count of successfully synced observations.
 */
export async function syncPendingObservations(): Promise<{ synced: number; errors: number }> {
  const pending = await getPendingObservations();
  let synced = 0;
  let errors = 0;

  for (const obs of pending) {
    try {
      await routeObservation(obs);
      await markObservationSynced(obs.id);
      synced++;
    } catch (err: any) {
      await markObservationError(obs.id, err.message || "Unknown sync error");
      errors++;
    }
  }

  return { synced, errors };
}

/**
 * Route a single observation through the appropriate domain service.
 * This enforces the constitutional rule: Field Studio OWNS ZERO TABLES.
 */
async function routeObservation(obs: FieldObservation): Promise<void> {
  switch (obs.type) {
    case "condition":
    case "quality":
    case "measurement": {
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
        // Fetch current state for diff
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
      break;
    }

    case "photo": {
      // Route through TerraDossier (documents owner)
      // For now, emit a trace event; full upload integration comes in Phase B
      await emitTraceEvent({
        parcelId: obs.parcelId,
        sourceModule: "field",
        eventType: "field_photo_captured",
        eventData: {
          latitude: obs.latitude,
          longitude: obs.longitude,
          timestamp: obs.timestamp,
          photoCount: (obs.data as any).photoCount || 1,
        },
      });
      break;
    }

    case "note": {
      // Emit as trace event for audit trail
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
      break;
    }

    case "anomaly": {
      // Route through TerraAtlas (spatial annotations owner)
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
      break;
    }
  }
}

/**
 * Mark an assignment as completed and sync all its observations.
 */
export async function completeInspection(assignmentId: string): Promise<{ synced: number; errors: number }> {
  await updateAssignmentStatus(assignmentId, "completed");
  return syncPendingObservations();
}
