// TerraFusion OS — Write-Lane Enforcement
// Constitutional write-lane matrix: each domain has exactly ONE owner

import type { WriteDomain, SourceModule } from "@/types/parcel360";

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
  if (owner !== sourceModule) {
    const msg = `[WriteLane] VIOLATION: "${sourceModule}" attempted to write to "${domain}" (owned by "${owner}")`;
    console.error(msg);
    if (import.meta.env.DEV) {
      throw new Error(msg);
    }
  }
}
