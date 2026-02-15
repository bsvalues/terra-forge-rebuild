// TerraFusion OS — Dossier Suite Service (Records & Evidence)
// Owns: documents, narratives, packets

import { supabase } from "@/integrations/supabase/client";
import { assertWriteLane } from "@/services/writeLane";
import { emitTraceEvent } from "@/services/terraTrace";

const SOURCE = "dossier" as const;

/**
 * Record a document addition with trace emission.
 */
export async function addDocument(
  parcelId: string,
  documentMetadata: {
    fileName: string;
    documentType: string;
    description?: string;
  },
  documentId?: string
) {
  assertWriteLane("documents", SOURCE);

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "document_added",
    eventData: {
      fileName: documentMetadata.fileName,
      documentType: documentMetadata.documentType,
      description: documentMetadata.description,
    },
    artifactType: "document",
    artifactId: documentId,
  });

  return { success: true };
}

/**
 * Create a narrative with trace emission.
 */
export async function createNarrative(
  parcelId: string,
  narrativeType: string,
  content: string
) {
  assertWriteLane("narratives", SOURCE);

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "evidence_attached",
    eventData: { narrativeType, contentLength: content.length },
  });

  return { success: true, narrativeType };
}

/**
 * Assemble a packet (BOE, defense, etc.) with trace emission.
 */
export async function assemblePacket(
  parcelId: string,
  packetType: string,
  componentIds: string[]
) {
  assertWriteLane("packets", SOURCE);

  await emitTraceEvent({
    parcelId,
    sourceModule: SOURCE,
    eventType: "evidence_attached",
    eventData: { packetType, componentCount: componentIds.length },
  });

  return { success: true, packetType };
}

/**
 * Auto-generate a calibration narrative when batch adjustments are applied.
 * Creates a dossier_narratives record documenting the calibration event.
 */
export async function generateCalibrationNarrative(params: {
  neighborhoodCode: string;
  adjustmentType: string;
  parcelsAffected: number;
  rSquared: number;
  avgDelta: number;
  reason: string;
  calibrationRunId: string;
}): Promise<{ narrativeId: string | null }> {
  assertWriteLane("narratives", SOURCE);

  const { data: profile } = await supabase
    .from("profiles")
    .select("county_id")
    .single();

  const countyId = profile?.county_id ?? "00000000-0000-0000-0000-000000000001";

  const content = [
    `## Calibration Narrative — ${params.neighborhoodCode}`,
    "",
    `**Method**: ${params.adjustmentType === "regression" ? "OLS Regression" : params.adjustmentType}`,
    `**Model Fit**: R² = ${(params.rSquared * 100).toFixed(1)}%`,
    `**Parcels Affected**: ${params.parcelsAffected}`,
    `**Average Value Change**: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(params.avgDelta)}`,
    "",
    `**Reason**: ${params.reason}`,
    "",
    `This adjustment was applied as a batch operation from the Mass Appraisal Factory ` +
    `calibration run \`${params.calibrationRunId.slice(0, 8)}\`. Values were computed using ` +
    `ordinary least squares regression against qualified sales within the neighborhood. ` +
    `All affected parcels have corresponding entries in the Value Adjustment Ledger with ` +
    `full before/after audit trail.`,
    "",
    `*Generated automatically by TerraFusion OS — ${new Date().toISOString().split("T")[0]}*`,
  ].join("\n");

  const title = `Calibration: ${params.neighborhoodCode} — ${params.adjustmentType} (${params.parcelsAffected} parcels)`;

  // Insert into dossier_narratives (parcel_id is neighborhood-level, use first affected or null)
  const { data, error } = await supabase
    .from("dossier_narratives")
    .insert({
      county_id: countyId,
      parcel_id: "00000000-0000-0000-0000-000000000000", // system-level narrative
      title,
      content,
      narrative_type: "calibration",
      ai_generated: true,
      model_used: "terrafusion-auto",
    } as any)
    .select("id")
    .single();

  if (error) {
    console.warn("[Dossier] Failed to generate calibration narrative:", error.message);
    return { narrativeId: null };
  }

  await emitTraceEvent({
    sourceModule: SOURCE,
    eventType: "evidence_attached",
    eventData: {
      narrativeType: "calibration",
      neighborhoodCode: params.neighborhoodCode,
      parcelsAffected: params.parcelsAffected,
    },
    artifactType: "narrative",
    artifactId: (data as any)?.id,
  });

  return { narrativeId: (data as any)?.id ?? null };
}
