// TerraFusion OS — Dais Suite Service (Assessor Admin)
// Owns: permits, exemptions, appeals, notices, workflows

import { supabase } from "@/integrations/supabase/client";
import { assertWriteLane } from "@/services/writeLane";
import { emitTraceEvent } from "@/services/terraTrace";

const SOURCE = "dais" as const;

/**
 * Update appeal status with trace emission.
 */
export async function updateAppealStatus(
  appealId: string,
  parcelId: string,
  newStatus: string,
  previousStatus: string | null,
  reason?: string
) {
  assertWriteLane("appeals", SOURCE);

  const { data, error } = await supabase
    .from("appeals")
    .update({ status: newStatus })
    .eq("id", appealId)
    .select()
    .single();

  if (error) throw error;

  // Record status change
  await supabase.from("appeal_status_changes").insert({
    appeal_id: appealId,
    previous_status: previousStatus,
    new_status: newStatus,
    change_reason: reason || null,
  });

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "workflow_state_changed",
    eventData: { entity: "appeal", previousStatus, newStatus, reason },
    artifactType: "appeal",
    artifactId: appealId,
  });

  return data;
}

/**
 * Update permit status with trace emission.
 */
export async function updatePermitStatus(
  permitId: string,
  parcelId: string,
  newStatus: string,
  previousStatus: string,
  reason?: string
) {
  assertWriteLane("permits", SOURCE);

  const updatePayload: Record<string, unknown> = { status: newStatus };
  if (reason) updatePayload.notes = reason;

  const { data, error } = await supabase
    .from("permits")
    .update(updatePayload)
    .eq("id", permitId)
    .select()
    .single();

  if (error) throw error;

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "permit_status_changed",
    eventData: { previousStatus, newStatus, reason },
    artifactType: "permit",
    artifactId: permitId,
  });

  return data;
}

/**
 * Decide an exemption (approve/deny) with trace emission.
 */
export async function decideExemption(
  exemptionId: string,
  parcelId: string,
  decision: "approved" | "denied",
  notes?: string
) {
  assertWriteLane("exemptions", SOURCE);

  const { data, error } = await supabase
    .from("exemptions")
    .update({
      status: decision,
      approval_date: decision === "approved" ? new Date().toISOString().split("T")[0] : null,
      notes: notes || null,
    })
    .eq("id", exemptionId)
    .select()
    .single();

  if (error) throw error;

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "exemption_decided",
    eventData: { decision, notes },
    artifactType: "exemption",
    artifactId: exemptionId,
  });

  return data;
}

/**
 * Update exemption status generically (for non-approve/deny transitions).
 */
export async function updateExemptionStatus(
  exemptionId: string,
  parcelId: string,
  newStatus: string,
  previousStatus: string,
  reason?: string
) {
  assertWriteLane("exemptions", SOURCE);

  const updatePayload: Record<string, unknown> = { status: newStatus };
  if (reason) updatePayload.notes = reason;

  const { data, error } = await supabase
    .from("exemptions")
    .update(updatePayload)
    .eq("id", exemptionId)
    .select()
    .single();

  if (error) throw error;

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "exemption_status_changed",
    eventData: { previousStatus, newStatus, reason },
    artifactType: "exemption",
    artifactId: exemptionId,
  });

  return data;
}

/**
 * Create a new permit with trace emission.
 */
export async function createPermitRecord(params: {
  parcel_id: string;
  permit_number: string;
  permit_type: string;
  description?: string | null;
  estimated_value?: number | null;
}) {
  assertWriteLane("permits", SOURCE);

  const { data, error } = await supabase
    .from("permits")
    .insert({
      parcel_id: params.parcel_id,
      permit_number: params.permit_number,
      permit_type: params.permit_type,
      description: params.description || null,
      estimated_value: params.estimated_value || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;

  await emitTraceEvent({
    parcelId: params.parcel_id,
    sourceModule: SOURCE,
    eventType: "permit_created",
    eventData: {
      permit_number: params.permit_number,
      permit_type: params.permit_type,
      estimated_value: params.estimated_value,
    },
    artifactType: "permit",
    artifactId: data.id,
  });

  return data;
}

/**
 * Create a new exemption with trace emission.
 */
export async function createExemptionRecord(params: {
  parcel_id: string;
  exemption_type: string;
  applicant_name?: string | null;
  exemption_amount?: number | null;
  exemption_percentage?: number | null;
  notes?: string | null;
  tax_year?: number;
}) {
  assertWriteLane("exemptions", SOURCE);

  const { data, error } = await supabase
    .from("exemptions")
    .insert({
      parcel_id: params.parcel_id,
      exemption_type: params.exemption_type,
      applicant_name: params.applicant_name || null,
      exemption_amount: params.exemption_amount || null,
      exemption_percentage: params.exemption_percentage || null,
      notes: params.notes || null,
      status: "pending",
      tax_year: params.tax_year || new Date().getFullYear(),
    })
    .select()
    .single();

  if (error) throw error;

  await emitTraceEvent({
    parcelId: params.parcel_id,
    sourceModule: SOURCE,
    eventType: "exemption_created",
    eventData: {
      exemption_type: params.exemption_type,
      applicant_name: params.applicant_name,
      exemption_amount: params.exemption_amount,
    },
    artifactType: "exemption",
    artifactId: data.id,
  });

  return data;
}

/**
 * Generate a notice with trace emission.
 */
export async function generateNotice(
  parcelId: string,
  noticeType: string,
  metadata: Record<string, unknown>
) {
  assertWriteLane("notices", SOURCE);

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "notice_generated",
    eventData: { noticeType, ...metadata },
  });

  return { success: true, noticeType };
}
