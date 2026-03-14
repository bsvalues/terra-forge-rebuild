// TerraFusion OS — Cache Invalidation Registry (Constitutional Primitive)
// These are the ONLY functions that should invalidate cached data.
// Domain services call these after writes; UI components never call them directly.
// See docs/DATA_CONSTITUTION.md for governance rules.
//
// Rule: NO queryClient.invalidateQueries([...]) outside this file.

import type { QueryClient } from "@tanstack/react-query";

// ── Canonical Domain Invalidators ─────────────────────────────────

/** Invalidate county-level vitals (the global pulse) */
export function invalidateCounty(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["county-vitals"] });
}

/** @deprecated Use invalidateCounty() — alias kept for migration */
export const invalidateCountyVitals = invalidateCounty;

/** Invalidate all cached data for a specific parcel + county vitals */
export function invalidateParcel(qc: QueryClient, parcelId: string) {
  qc.invalidateQueries({ queryKey: ["p360-identity", parcelId] });
  qc.invalidateQueries({ queryKey: ["p360-valuation", parcelId] });
  qc.invalidateQueries({ queryKey: ["p360-workflows", parcelId] });
  qc.invalidateQueries({ queryKey: ["p360-trace", parcelId] });
  qc.invalidateQueries({ queryKey: ["p360-permits", parcelId] });
  qc.invalidateQueries({ queryKey: ["p360-appeals", parcelId] });
  qc.invalidateQueries({ queryKey: ["p360-exemptions", parcelId] });
  qc.invalidateQueries({ queryKey: ["parcel-details", parcelId] });
  qc.invalidateQueries({ queryKey: ["parcel-search"] });
  invalidateCounty(qc);
}

/** @deprecated Use invalidateParcel() — alias kept for migration */
export const invalidateParcelData = invalidateParcel;

/** Invalidate workflow-related caches (vitals + workflow list screens) */
export function invalidateWorkflows(qc: QueryClient, parcelId?: string) {
  qc.invalidateQueries({ queryKey: ["appeals-workflow"] });
  qc.invalidateQueries({ queryKey: ["permits-workflow"] });
  qc.invalidateQueries({ queryKey: ["permits-stats"] });
  qc.invalidateQueries({ queryKey: ["exemptions-workflow"] });
  qc.invalidateQueries({ queryKey: ["exemptions-stats"] });
  if (parcelId) {
    qc.invalidateQueries({ queryKey: ["p360-workflows", parcelId] });
  }
  invalidateCounty(qc);
}

/** Invalidate factory/calibration caches + vitals (calibration affects county metrics) */
export function invalidateFactory(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["factory"] });
  qc.invalidateQueries({ queryKey: ["calibration-history"] });
  invalidateCounty(qc);
}

/** Invalidate certification-related caches */
export function invalidateCertification(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["certification-pipeline"] });
  qc.invalidateQueries({ queryKey: ["certification-stats"] });
  qc.invalidateQueries({ queryKey: ["certification-events"] });
  qc.invalidateQueries({ queryKey: ["roll-readiness"] });
  qc.invalidateQueries({ queryKey: ["roll-readiness-command"] });
  qc.invalidateQueries({ queryKey: ["assessments"] });
  invalidateCounty(qc);
}

/** Invalidate dossier (evidence) caches for a parcel */
export function invalidateDossier(qc: QueryClient, parcelId: string) {
  qc.invalidateQueries({ queryKey: ["dossier-documents", parcelId] });
  qc.invalidateQueries({ queryKey: ["dossier-narratives", parcelId] });
  qc.invalidateQueries({ queryKey: ["dossier-packets", parcelId] });
}

/** Invalidate notice and batch notice caches */
export function invalidateNotices(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["notices"] });
  qc.invalidateQueries({ queryKey: ["batch-notice-jobs"] });
  qc.invalidateQueries({ queryKey: ["notices-by-batch"] });
}
