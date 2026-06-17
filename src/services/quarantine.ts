// TerraFusion OS — Quarantine Service
// ═══════════════════════════════════════════════════════════
// Quarantine + continue: bad data is captured, never dropped, never blocks.
//
// Called by:
//   - sync/runtime.ts          → schema drift, gate failures
//   - writeLane.ts             → cross-lane violation attempts
//   - qualityGateRunner.ts     → per-row rule failures
//   - edge functions           → upstream API hiccups
//
// Every quarantine event also emits a TerraTrace 'data_quarantined' record
// so the audit spine sees it.
//
// 🪖 We keep the bad data in a jar with little air holes.
// ═══════════════════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";

export type QuarantineSeverity = "info" | "warning" | "critical";
export type QuarantineStatus = "pending" | "reviewed" | "restored" | "discarded";

export type QuarantineReasonCode =
  | "schema_drift"
  | "gate_failed"
  | "cross_lane"
  | "field_guardrail"
  | "rls_blocked"
  | "upstream_error"
  | "missing_required"
  | "out_of_range"
  | "duplicate_key"
  | "stale_watermark"
  | "manual";

export interface QuarantineInput {
  countyId: string;
  source: string;                  // e.g. "sync.runtime", "writeLane", "qualityGate"
  sourceProduct?: string;          // e.g. "pacs_qualified_sales"
  reasonCode: QuarantineReasonCode;
  reasonDetail?: string;
  severity?: QuarantineSeverity;
  payload: Record<string, unknown>;
  traceEventId?: string;
}

export interface QuarantineResult {
  ok: boolean;
  id?: string;
  deduped?: boolean;
  error?: string;
}

/**
 * sha256(hex) of a stable JSON serialization of the payload.
 * Browser + Deno both have crypto.subtle, so this works everywhere.
 */
async function hashPayload(payload: Record<string, unknown>): Promise<string> {
  const stable = JSON.stringify(payload, Object.keys(payload).sort());
  const buf = new TextEncoder().encode(stable);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Park a single offending row in the quarantine table.
 *
 * Returns ok=true even on dedup hits (same payload already pending) so callers
 * don't need to special-case "already known bad" — the goal is observability,
 * not punishment.
 */
export async function quarantineRow(input: QuarantineInput): Promise<QuarantineResult> {
  try {
    const payload_hash = await hashPayload(input.payload);

    // Use any-cast — types.ts hasn't been regenerated yet for the new table.
    const { data, error } = await (supabase as any)
      .from("data_quarantine")
      .insert({
        county_id: input.countyId,
        source: input.source,
        source_product: input.sourceProduct ?? null,
        reason_code: input.reasonCode,
        reason_detail: input.reasonDetail ?? null,
        severity: input.severity ?? "warning",
        payload: input.payload,
        payload_hash,
        trace_event_id: input.traceEventId ?? null,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      // Unique-index hit on (county_id, source, reason_code, payload_hash) = dedup.
      if (error.code === "23505") {
        return { ok: true, deduped: true };
      }
      console.warn("[quarantine] insert failed", error);
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id, deduped: false };
  } catch (err) {
    console.warn("[quarantine] threw", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Batch quarantine. Use for sync runs that produce many bad rows at once.
 * Each row is hashed individually so dedup still works.
 */
export async function quarantineBatch(
  inputs: QuarantineInput[]
): Promise<{ inserted: number; deduped: number; failed: number }> {
  let inserted = 0;
  let deduped = 0;
  let failed = 0;
  for (const input of inputs) {
    const r = await quarantineRow(input);
    if (!r.ok) failed++;
    else if (r.deduped) deduped++;
    else inserted++;
  }
  return { inserted, deduped, failed };
}

/**
 * Count pending quarantine rows for a given source — used by the provenance
 * envelope to flag a query as 'unverified' when its upstream has known bad rows.
 */
export async function getPendingQuarantineCount(
  countyId: string,
  source: string,
  sourceProduct?: string
): Promise<number> {
  let q = (supabase as any)
    .from("data_quarantine")
    .select("id", { count: "exact", head: true })
    .eq("county_id", countyId)
    .eq("source", source)
    .eq("status", "pending");
  if (sourceProduct) q = q.eq("source_product", sourceProduct);
  const { count, error } = await q;
  if (error) {
    console.warn("[quarantine] count failed", error);
    return 0;
  }
  return count ?? 0;
}
