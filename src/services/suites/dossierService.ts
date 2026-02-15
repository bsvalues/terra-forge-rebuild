// TerraFusion OS — Dossier Suite Service (Records & Evidence)
// Owns: documents, narratives, packets

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
