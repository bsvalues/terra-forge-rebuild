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
  qc.invalidateQueries({ queryKey: ["p360-permits", parcelId] });
  qc.invalidateQueries({ queryKey: ["p360-appeals", parcelId] });
  qc.invalidateQueries({ queryKey: ["p360-exemptions", parcelId] });
  qc.invalidateQueries({ queryKey: ["parcel-details", parcelId] });
  qc.invalidateQueries({ queryKey: ["parcel-search"] });
  invalidateCountyVitals(qc);
}

/** Invalidate workflow-related caches (vitals + workflow list screens) */
export function invalidateWorkflows(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["appeals-workflow"] });
  qc.invalidateQueries({ queryKey: ["permits-workflow"] });
  qc.invalidateQueries({ queryKey: ["permits-stats"] });
  qc.invalidateQueries({ queryKey: ["exemptions-workflow"] });
  qc.invalidateQueries({ queryKey: ["exemptions-stats"] });
  invalidateCountyVitals(qc);
}

/** Invalidate factory/calibration caches + vitals */
export function invalidateFactory(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["factory"] });
  qc.invalidateQueries({ queryKey: ["calibration-history"] });
  invalidateCountyVitals(qc);
}

/** Invalidate certification-related caches */
export function invalidateCertification(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["certification-pipeline"] });
  qc.invalidateQueries({ queryKey: ["certification-stats"] });
  qc.invalidateQueries({ queryKey: ["roll-readiness"] });
  qc.invalidateQueries({ queryKey: ["assessments"] });
  invalidateCountyVitals(qc);
}

/** Invalidate dossier (evidence) caches for a parcel */
export function invalidateDossier(qc: QueryClient, parcelId: string) {
  qc.invalidateQueries({ queryKey: ["dossier-documents", parcelId] });
  qc.invalidateQueries({ queryKey: ["dossier-narratives", parcelId] });
  qc.invalidateQueries({ queryKey: ["dossier-packets", parcelId] });
}
