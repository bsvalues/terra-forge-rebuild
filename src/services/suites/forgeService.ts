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
 * Batch apply value adjustments from a calibration run.
 * Writes predicted values to parcels and records in value_adjustments ledger.
 */
export async function batchApplyAdjustments(
  calibrationRunId: string,
  adjustments: Array<{
    parcelId: string;
    previousValue: number;
    newValue: number;
  }>,
  adjustmentType: string = "regression",
  reason?: string
): Promise<{ applied: number; errors: string[] }> {
  assertWriteLane("value_adjustments", SOURCE);

  const { data: profile } = await supabase
    .from("profiles")
    .select("county_id")
    .single();

  const countyId = profile?.county_id;
  if (!countyId) throw new Error("No county assigned to your profile");
  const errors: string[] = [];
  let applied = 0;

  // Create a correlation ID for this batch
  const correlationId = crypto.randomUUID();

  for (const adj of adjustments) {
    try {
      // Update the parcel's assessed value
      const { error: updateError } = await supabase
        .from("parcels")
        .update({ assessed_value: adj.newValue })
        .eq("id", adj.parcelId);

      if (updateError) {
        errors.push(`Parcel ${adj.parcelId}: ${updateError.message}`);
        continue;
      }

      // Record in value_adjustments ledger
      const { error: insertError } = await supabase
        .from("value_adjustments")
        .insert({
          county_id: countyId,
          parcel_id: adj.parcelId,
          adjustment_type: adjustmentType,
          previous_value: adj.previousValue,
          new_value: adj.newValue,
          adjustment_reason: reason || `Batch ${adjustmentType} calibration`,
          calibration_run_id: calibrationRunId,
        });

      if (insertError) {
        errors.push(`Ledger ${adj.parcelId}: ${insertError.message}`);
        continue;
      }

      applied++;
    } catch (err: any) {
      errors.push(`${adj.parcelId}: ${err.message}`);
    }
  }

  // Emit a single trace event for the entire batch
  await emitTraceEvent({
    sourceModule: SOURCE,
    eventType: "model_run_completed",
    eventData: {
      batchSize: adjustments.length,
      applied,
      errors: errors.length,
      adjustmentType,
      calibrationRunId,
      reason,
    },
    correlationId,
    artifactType: "model_receipt",
    artifactId: calibrationRunId,
  });

  return { applied, errors };
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

/**
 * Apply scenario adjustments — batch write value_adjustments + update parcel values.
 * Routes scenario mutations through the Forge write lane.
 */
export async function applyScenarioAdjustments(
  neighborhoodCode: string,
  adjustments: Array<{
    parcelId: string;
    previousValue: number;
    newValue: number;
  }>,
  reason: string
): Promise<{ applied: number }> {
  assertWriteLane("value_adjustments", SOURCE);

  const { data: profile } = await supabase
    .from("profiles")
    .select("county_id")
    .single();

  const countyId = profile?.county_id;
  if (!countyId) throw new Error("No county assigned to your profile");

  if (adjustments.length === 0) throw new Error("No parcels changed — nothing to apply");

  const records = adjustments.map(adj => ({
    county_id: countyId,
    parcel_id: adj.parcelId,
    previous_value: adj.previousValue,
    new_value: adj.newValue,
    adjustment_type: "scenario" as const,
    adjustment_reason: reason,
  }));

  // Batch insert value_adjustments in chunks of 100
  for (let i = 0; i < records.length; i += 100) {
    const chunk = records.slice(i, i + 100);
    const { error } = await supabase.from("value_adjustments").insert(chunk);
    if (error) throw error;
  }

  // Update parcel assessed_values
  for (const adj of adjustments) {
    await supabase
      .from("parcels")
      .update({ assessed_value: adj.newValue })
      .eq("id", adj.parcelId);
  }

  const correlationId = crypto.randomUUID();
  await emitTraceEvent({
    sourceModule: SOURCE,
    eventType: "batch_adjustment_applied",
    eventData: {
      neighborhoodCode,
      adjustmentType: "scenario",
      batchSize: adjustments.length,
      reason,
    },
    correlationId,
  });

  return { applied: adjustments.length };
}
