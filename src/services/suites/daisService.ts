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
  previousStatus: string
) {
  assertWriteLane("permits", SOURCE);

  const { data, error } = await supabase
    .from("permits")
    .update({ status: newStatus })
    .eq("id", permitId)
    .select()
    .single();

  if (error) throw error;

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "permit_status_changed",
    eventData: { previousStatus, newStatus },
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
  previousStatus: string
) {
  assertWriteLane("exemptions", SOURCE);

  const { data, error } = await supabase
    .from("exemptions")
    .update({ status: newStatus })
    .eq("id", exemptionId)
    .select()
    .single();

  if (error) throw error;

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "exemption_status_changed",
    eventData: { previousStatus, newStatus },
    artifactType: "exemption",
    artifactId: exemptionId,
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
