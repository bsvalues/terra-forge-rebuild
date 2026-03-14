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

/**
 * Create a new appeal with trace emission.
 */
export async function createAppealRecord(params: {
  parcel_id: string;
  original_value: number;
  requested_value?: number;
  notes?: string;
  tax_year?: number;
}) {
  assertWriteLane("appeals", SOURCE);

  const { data, error } = await supabase
    .from("appeals")
    .insert({
      parcel_id: params.parcel_id,
      original_value: params.original_value,
      requested_value: params.requested_value || null,
      notes: params.notes || null,
      status: "pending",
      appeal_date: new Date().toISOString().split("T")[0],
      tax_year: params.tax_year || new Date().getFullYear(),
    })
    .select()
    .single();

  if (error) throw error;

  await emitTraceEvent({
    parcelId: params.parcel_id,
    sourceModule: SOURCE,
    eventType: "appeal_created",
    eventData: {
      original_value: params.original_value,
      requested_value: params.requested_value,
    },
    artifactType: "appeal",
    artifactId: data.id,
  });

  return data;
}

/**
 * Certify all parcels in a neighborhood for the current tax year.
 * Creates assessments where missing, certifies existing ones.
 */
export async function certifyNeighborhood(neighborhoodCode: string): Promise<{ certified: number; created: number; total: number }> {
  assertWriteLane("workflows", SOURCE);

  const currentYear = new Date().getFullYear();
  const now = new Date().toISOString();

  const { data: parcels } = await supabase
    .from("parcels")
    .select("id")
    .eq("neighborhood_code", neighborhoodCode);

  if (!parcels || parcels.length === 0) throw new Error("No parcels found");

  let certified = 0;
  let created = 0;

  for (let i = 0; i < parcels.length; i += 50) {
    const batch = parcels.slice(i, i + 50);
    const parcelIds = batch.map(p => p.id);

    const { data: existing } = await supabase
      .from("assessments")
      .select("id, parcel_id")
      .eq("tax_year", currentYear)
      .in("parcel_id", parcelIds);

    const existingIds = new Set((existing || []).map(a => a.parcel_id));
    const existingAssessmentIds = (existing || []).map(a => a.id);

    if (existingAssessmentIds.length > 0) {
      await supabase
        .from("assessments")
        .update({ certified: true, certified_at: now })
        .in("id", existingAssessmentIds);
      certified += existingAssessmentIds.length;
    }

    const missingParcelIds = parcelIds.filter(id => !existingIds.has(id));
    if (missingParcelIds.length > 0) {
      const { data: parcelDetails } = await supabase
        .from("parcels")
        .select("id, assessed_value, land_value, improvement_value, county_id")
        .in("id", missingParcelIds);

      if (parcelDetails && parcelDetails.length > 0) {
        const inserts = parcelDetails.map(p => ({
          parcel_id: p.id,
          tax_year: currentYear,
          land_value: p.land_value || 0,
          improvement_value: p.improvement_value || 0,
          total_value: p.assessed_value,
          county_id: p.county_id,
          certified: true,
          certified_at: now,
          assessment_reason: `Neighborhood ${neighborhoodCode} batch certification`,
        }));

        await supabase.from("assessments").insert(inserts as any);
        created += inserts.length;
      }
    }
  }

  await emitTraceEvent({
    sourceModule: SOURCE,
    eventType: "neighborhood_certified",
    eventData: {
      neighborhoodCode,
      taxYear: currentYear,
      parcelsUpdated: certified,
      parcelsCreated: created,
      totalParcels: parcels.length,
    },
  });

  return { certified, created, total: parcels.length };
}

/**
 * Certify the entire county roll for the current tax year.
 */
export async function certifyCountyRoll(): Promise<{ certified: number }> {
  assertWriteLane("workflows", SOURCE);

  const currentYear = new Date().getFullYear();
  const now = new Date().toISOString();

  const { data: uncertified } = await supabase
    .from("assessments")
    .select("id")
    .eq("tax_year", currentYear)
    .eq("certified", false);

  if (uncertified && uncertified.length > 0) {
    for (let i = 0; i < uncertified.length; i += 100) {
      const batch = uncertified.slice(i, i + 100).map((a) => a.id);
      await supabase
        .from("assessments")
        .update({ certified: true, certified_at: now })
        .in("id", batch);
    }
  }

  await emitTraceEvent({
    sourceModule: SOURCE,
    eventType: "county_roll_certified",
    eventData: {
      taxYear: currentYear,
      assessmentsCertified: uncertified?.length || 0,
    },
  });

  return { certified: uncertified?.length || 0 };
}
