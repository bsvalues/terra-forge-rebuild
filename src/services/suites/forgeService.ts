// TerraFusion OS — Forge Suite Service (Valuation)
// Owns: parcel characteristics, valuations, comps, models

import { supabase } from "@/integrations/supabase/client";
import { assertWriteLane } from "@/services/writeLane";
import { emitTraceEvent, computeDiff } from "@/services/terraTrace";
import type { ParcelUpdatePayload } from "@/hooks/useParcelMutations";

const SOURCE = "forge" as const;

/**
 * Update parcel characteristics with write-lane enforcement and trace emission.
 */
export async function updateParcelCharacteristics(
  parcelId: string,
  updates: ParcelUpdatePayload,
  previousData?: Record<string, unknown>
) {
  assertWriteLane("parcel_characteristics", SOURCE);

  const { data, error } = await supabase
    .from("parcels")
    .update(updates)
    .eq("id", parcelId)
    .select()
    .single();

  if (error) throw error;

  // Emit trace event with before/after diff
  const diff = previousData
    ? computeDiff(previousData, updates as Record<string, unknown>)
    : { before: {}, after: updates };

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "parcel_updated",
    eventData: {
      changes: diff,
      fieldCount: Object.keys(diff.after).length,
    },
    artifactType: "assessment",
  });

  return data;
}

/**
 * Create a value override with reason code and trace.
 */
export async function createValueOverride(
  parcelId: string,
  payload: {
    assessedValue: number;
    landValue?: number | null;
    improvementValue?: number | null;
    reason: string;
  }
) {
  assertWriteLane("valuations", SOURCE);

  const { data, error } = await supabase
    .from("parcels")
    .update({
      assessed_value: payload.assessedValue,
      land_value: payload.landValue,
      improvement_value: payload.improvementValue,
    })
    .eq("id", parcelId)
    .select()
    .single();

  if (error) throw error;

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "value_override_created",
    eventData: {
      newAssessedValue: payload.assessedValue,
      reason: payload.reason,
    },
  });

  return data;
}

/**
 * Record a model run completion.
 */
export async function recordModelRun(
  parcelId: string | null,
  modelType: string,
  modelVersion: string,
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
  correlationId?: string
) {
  assertWriteLane("models", SOURCE);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const insertPayload = {
    parcel_id: parcelId,
    model_type: modelType,
    model_version: modelVersion,
    operator_id: user.id,
    inputs: inputs as any,
    outputs: outputs as any,
  };

  const { data, error } = await supabase
    .from("model_receipts")
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "model_run_completed",
    eventData: { modelType, modelVersion, outputKeys: Object.keys(outputs) },
    artifactType: "model_receipt",
    artifactId: data.id,
    correlationId,
  });

  return data;
}
