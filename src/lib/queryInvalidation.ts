// TerraFusion OS — Cache Invalidation Registry
// These are the ONLY functions that should invalidate cached data.
// Domain services call these after writes; UI components never call them directly.
// See docs/DATA_CONSTITUTION.md for governance rules.

import type { QueryClient } from "@tanstack/react-query";

/** Invalidate the global county-vitals snapshot (parcels, workflows, quality, etc.) */
export function invalidateCountyVitals(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["county-vitals"] });
}

/** Invalidate all cached data for a specific parcel (p360 snapshot + county vitals) */
export function invalidateParcelData(qc: QueryClient, parcelId: string) {
  qc.invalidateQueries({ queryKey: ["p360-identity", parcelId] });
  qc.invalidateQueries({ queryKey: ["p360-valuation", parcelId] });
  qc.invalidateQueries({ queryKey: ["p360-workflows", parcelId] });
  qc.invalidateQueries({ queryKey: ["p360-trace", parcelId] });
  qc.invalidateQueries({ queryKey: ["parcel-details", parcelId] });
  invalidateCountyVitals(qc);
}

/** Invalidate workflow-related caches (vitals include workflow counts) */
export function invalidateWorkflows(qc: QueryClient) {
  invalidateCountyVitals(qc);
}

/** Invalidate factory/calibration caches + vitals */
export function invalidateFactory(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["factory"] });
  invalidateCountyVitals(qc);
}
