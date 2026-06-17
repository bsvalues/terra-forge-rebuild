// TerraFusion OS — Write-Lane Enforcement
// ═══════════════════════════════════════════════════════════
// Constitutional write-lane matrix: each domain has exactly ONE owner.
//
// Phase 62: violations persisted to `write_lane_violations`.
// Phase 65 (this turn): violations ALSO bridged to `data_quarantine` with
// severity=critical so the runtime provenance system can flag downstream
// reads as `unverified` and the OS can adjudicate them.
//
// Failure mode: Quarantine + continue.
//   - DEV: throws (loud feedback while coding)
//   - PROD: logs + quarantines + emits trace, never blocks the caller
//
// 🪖 The data tried to walk into the wrong room. We wrote down what it was
//    wearing and let it keep going.
// ═══════════════════════════════════════════════════════════

import type { WriteDomain, SourceModule } from "@/types/parcel360";
import { supabase } from "@/integrations/supabase/client";
import { quarantineRow } from "@/services/quarantine";

/**
 * The canonical Write-Lane Matrix.
 * Maps each data domain to the single module that owns writes.
 */
export const WRITE_LANE_MATRIX: Record<WriteDomain, SourceModule> = {
  // Forge (Valuation Suite)
  parcel_characteristics: "forge",
  valuations: "forge",
  comps: "forge",
  models: "forge",
  calibration_runs: "forge",
  cost_schedules: "forge",
  value_adjustments: "forge",
  comp_grids: "forge",

  // Atlas (GIS Suite)
  gis_layers: "atlas",
  boundaries: "atlas",
  spatial_annotations: "atlas",

  // Dais (Assessor Admin Suite)
  permits: "dais",
  exemptions: "dais",
  appeals: "dais",
  notices: "dais",
  workflows: "dais",

  // Dossier (Records Suite)
  documents: "dossier",
  narratives: "dossier",
  packets: "dossier",

  // OS Core
  trace_events: "os",
  user_prefs: "os",

  // Pilot
  pilot_profile: "pilot",
};

/**
 * Resolve which module owns writes for a given domain.
 */
export function resolveWriteLane(domain: WriteDomain): SourceModule {
  return WRITE_LANE_MATRIX[domain];
}

/**
 * Assert that a source module is allowed to write to a domain.
 * Throws in development if there's a mismatch — prevents cross-lane violations.
 * In prod: logs + quarantines the attempt and returns silently.
 */
export function assertWriteLane(domain: WriteDomain, sourceModule: SourceModule): void {
  const owner = WRITE_LANE_MATRIX[domain];

  // Field Studio is a routing module — it NEVER owns any write lane.
  // It may only enqueue FieldObservation events; canonical writes go through domain services.
  if (sourceModule === "field" && domain !== "trace_events") {
    const msg = `[WriteLane] FIELD GUARDRAIL: "field" module attempted direct write to "${domain}". Field Studio must route through domain services.`;
    console.error(msg);
    logViolationAsync(sourceModule, domain, owner, "field_guardrail");
    if (import.meta.env.DEV) {
      throw new Error(msg);
    }
    return;
  }

  if (owner !== sourceModule) {
    const msg = `[WriteLane] VIOLATION: "${sourceModule}" attempted to write to "${domain}" (owned by "${owner}")`;
    console.error(msg);
    logViolationAsync(sourceModule, domain, owner, "cross_lane");
    if (import.meta.env.DEV) {
      throw new Error(msg);
    }
  }
}

/**
 * Persist write-lane violations to (a) the append-only audit table and
 * (b) the runtime quarantine table. Fire-and-forget — never blocks the caller.
 */
function logViolationAsync(
  attemptedModule: string,
  targetDomain: string,
  expectedOwner: string,
  violationType: "cross_lane" | "field_guardrail",
): void {
  // (a) Audit row in write_lane_violations
  supabase
    .from("write_lane_violations" as any)
    .insert({
      attempted_module: attemptedModule,
      target_domain: targetDomain,
      expected_owner: expectedOwner,
      violation_type: violationType,
    } as any)
    .then(({ error }) => {
      if (error) console.warn("[WriteLane] Failed to log violation:", error.message);
    });

  // (b) Runtime quarantine — needs a countyId. Resolve from current profile
  // best-effort; if there's no session (test, anon), skip the quarantine row
  // but keep the audit row above.
  resolveActiveCountyId()
    .then((countyId) => {
      if (!countyId) return;
      return quarantineRow({
        countyId,
        source: "writeLane",
        reasonCode: violationType,
        reasonDetail: `${attemptedModule} → ${targetDomain} (owner: ${expectedOwner})`,
        severity: "critical",
        payload: {
          attempted_module: attemptedModule,
          target_domain: targetDomain,
          expected_owner: expectedOwner,
          violation_type: violationType,
          captured_at: new Date().toISOString(),
        },
      });
    })
    .catch((err) => {
      console.warn("[WriteLane] quarantine bridge failed:", err);
    });
}

/**
 * Best-effort active-county lookup for the quarantine bridge.
 * Cached for the lifetime of the page to keep violation logging cheap.
 */
let _cachedCountyId: string | null | undefined;
async function resolveActiveCountyId(): Promise<string | null> {
  if (_cachedCountyId !== undefined) return _cachedCountyId;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      _cachedCountyId = null;
      return null;
    }
    const { data } = await supabase
      .from("profiles")
      .select("county_id")
      .eq("user_id", user.id)
      .maybeSingle();
    _cachedCountyId = (data?.county_id as string | undefined) ?? null;
    return _cachedCountyId;
  } catch {
    _cachedCountyId = null;
    return null;
  }
}

/** Test-only: clear the cached county lookup. */
export function __resetWriteLaneCacheForTests() {
  _cachedCountyId = undefined;
}
