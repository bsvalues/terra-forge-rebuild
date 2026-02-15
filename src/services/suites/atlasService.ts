// TerraFusion OS — Atlas Suite Service (GIS)
// Owns: GIS layers, boundaries, spatial annotations

import { assertWriteLane } from "@/services/writeLane";
import { emitTraceEvent } from "@/services/terraTrace";

const SOURCE = "atlas" as const;

/**
 * Update a parcel boundary with trace emission.
 */
export async function updateBoundary(
  parcelId: string,
  boundaryData: Record<string, unknown>
) {
  assertWriteLane("boundaries", SOURCE);

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "parcel_updated",
    eventData: { changeType: "boundary_update", ...boundaryData },
  });

  return { success: true };
}

/**
 * Add a spatial annotation with trace emission.
 */
export async function addSpatialAnnotation(
  parcelId: string,
  annotationType: string,
  geometry: Record<string, unknown>
) {
  assertWriteLane("spatial_annotations", SOURCE);

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "parcel_updated",
    eventData: { changeType: "spatial_annotation", annotationType },
  });

  return { success: true, annotationType };
}
