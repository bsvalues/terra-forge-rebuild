// TerraFusion OS — Atlas Suite Service (GIS)
// Owns: GIS layers, boundaries, spatial annotations

import { supabase } from "@/integrations/supabase/client";
import { assertWriteLane } from "@/services/writeLane";
import { emitTraceEvent } from "@/services/terraTrace";

const SOURCE = "atlas" as const;

/**
 * Update a parcel boundary by upserting GIS feature geometry.
 */
export async function updateBoundary(
  parcelId: string,
  layerId: string,
  geometryType: string,
  coordinates: unknown,
  properties?: Record<string, unknown>
) {
  assertWriteLane("boundaries", SOURCE);

  // Check if feature already exists for this parcel+layer
  const { data: existing } = await supabase
    .from("gis_features")
    .select("id")
    .eq("parcel_id", parcelId)
    .eq("layer_id", layerId)
    .limit(1)
    .maybeSingle();

  let featureId: string;

  if (existing) {
    const { data, error } = await supabase
      .from("gis_features")
      .update({
        geometry_type: geometryType,
        coordinates: coordinates as any,
        properties: (properties || {}) as any,
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error) throw error;
    featureId = data.id;
  } else {
    const { data, error } = await supabase
      .from("gis_features")
      .insert({
        parcel_id: parcelId,
        layer_id: layerId,
        geometry_type: geometryType,
        coordinates: coordinates as any,
        properties: (properties || {}) as any,
      })
      .select("id")
      .single();

    if (error) throw error;
    featureId = data.id;
  }

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "parcel_updated",
    eventData: { changeType: "boundary_update", geometryType, featureId },
    artifactType: "gis_feature" as any,
    artifactId: featureId,
  });

  return { success: true, featureId };
}

/**
 * Add a spatial annotation (point, line, polygon) for a parcel.
 */
export async function addSpatialAnnotation(
  parcelId: string,
  layerId: string,
  annotationType: string,
  geometryType: string,
  coordinates: unknown,
  properties?: Record<string, unknown>
) {
  assertWriteLane("spatial_annotations", SOURCE);

  const { data, error } = await supabase
    .from("gis_features")
    .insert({
      parcel_id: parcelId,
      layer_id: layerId,
      geometry_type: geometryType,
      coordinates: coordinates as any,
      properties: { annotation_type: annotationType, ...(properties || {}) } as any,
    })
    .select("id")
    .single();

  if (error) throw error;

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "parcel_updated",
    eventData: { changeType: "spatial_annotation", annotationType, featureId: data.id },
    artifactType: "gis_feature" as any,
    artifactId: data.id,
  });

  return { success: true, featureId: data.id, annotationType };
}

/**
 * Update parcel centroid coordinates (lat/lng on parcels table).
 * Routes through Atlas since it's a spatial operation.
 */
export async function updateParcelCoordinates(
  parcelId: string,
  latitude: number,
  longitude: number
) {
  assertWriteLane("boundaries", SOURCE);

  const { data, error } = await supabase
    .from("parcels")
    .update({ latitude, longitude })
    .eq("id", parcelId)
    .select("id")
    .single();

  if (error) throw error;

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "parcel_updated",
    eventData: { changeType: "coordinates_update", latitude, longitude },
  });

  return data;
}
