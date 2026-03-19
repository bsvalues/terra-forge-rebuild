// TerraFusion OS — TerraTrace Event Emission Service
// Append-only event spine for all auditable actions

import { supabase } from "@/integrations/supabase/client";
import type { TraceEventParams } from "@/types/parcel360";

/**
 * Emit a trace event to the immutable audit spine.
 * Actor and county are auto-resolved from the current session.
 */
export async function emitTraceEvent(params: TraceEventParams): Promise<string | null> {
  try {
    // Resolve county_id from user profile (required by RLS)
    const { data: countyRow } = await supabase.rpc("get_user_county_id");
    const countyId = countyRow as unknown as string | null;
    if (!countyId) {
      console.warn("[TerraTrace] No county_id for user — skipping trace event");
      return null;
    }

    const row = {
      county_id: countyId,
      parcel_id: params.parcelId || null,
      source_module: params.sourceModule,
      event_type: params.eventType,
      event_data: params.eventData || {},
      correlation_id: params.correlationId || null,
      causation_id: params.causationId || null,
      artifact_type: params.artifactType || null,
      artifact_id: params.artifactId || null,
      agent_id: params.agentId || null,
    };

    const { data, error } = await supabase
      .from("trace_events" as any)
      .insert(row as any)
      .select("id")
      .single();

    if (error) {
      console.error("[TerraTrace] Failed to emit event:", error.message);
      return null;
    }

    return (data as any)?.id ?? null;
  } catch (err) {
    console.error("[TerraTrace] Unexpected error:", err);
    return null;
  }
}

/**
 * Emit a trace event without awaiting — fire-and-forget for non-critical logging.
 */
export function emitTraceEventAsync(params: TraceEventParams): void {
  emitTraceEvent(params).catch(() => {
    // Silently swallow — trace emission should never block user operations
  });
}

/**
 * Compute a before/after diff for characteristic edits.
 */
export function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const changedBefore: Record<string, unknown> = {};
  const changedAfter: Record<string, unknown> = {};

  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) {
      changedBefore[key] = before[key];
      changedAfter[key] = after[key];
    }
  }

  return { before: changedBefore, after: changedAfter };
}
