// TerraFusion OS — Write-Lane Enforcement
// Constitutional write-lane matrix: each domain has exactly ONE owner
// Phase 62: violations are now persisted to write_lane_violations table

import type { WriteDomain, SourceModule } from "@/types/parcel360";
import { supabase } from "@/integrations/supabase/client";
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
 * Persist write-lane violations to the append-only audit table.
 * Fire-and-forget — never blocks the caller.
 */
function logViolationAsync(
  attemptedModule: string,
  targetDomain: string,
  expectedOwner: string,
  violationType: string,
): void {
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
}
