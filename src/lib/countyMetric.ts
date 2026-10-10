/** A missing or failed measurement is unknown, never an operational zero. */
export function countyMetric(value: number | null | undefined, failed: boolean): number | null {
  return !failed && typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export type CountyMetricKey =
  | "parcels"
  | "assessments"
  | "certified"
  | "appeals"
  | "issues"
  | "sales"
  | "quality"
  | "workflows"
  | "defensibility";

/**
 * Derive which county metrics the vitals RPC actually reported.
 * Unknown metrics must render as unknown ("—"), never as fabricated zeroes.
 * Quality is derived from parcel coverage, so it is known exactly when parcels are.
 * Workflows are known when the appeals count is present.
 */
export function availabilityFromRaw(raw: Record<string, any> | null | undefined): Record<CountyMetricKey, boolean> {
  const parcelsKnown = countyMetric(raw?.parcels?.total, false) !== null;
  const appealsKnown = countyMetric(raw?.appeals?.pending ?? raw?.workflows?.pendingAppeals, false) !== null;
  return {
    parcels: parcelsKnown,
    assessments: countyMetric(raw?.assessments?.total, false) !== null,
    certified: countyMetric(raw?.assessments?.certified, false) !== null,
    appeals: appealsKnown,
    issues: countyMetric(raw?.dataQuality?.openIssues, false) !== null,
    sales: countyMetric(raw?.sales?.total, false) !== null,
    quality: parcelsKnown,
    workflows: appealsKnown,
    defensibility: countyMetric(raw?.defensibility?.score ?? raw?.defensibility?.overall, false) !== null,
  };
}

/**
 * Read a vitals value only when its source metric was reported.
 * Returns null (render as "—") while loading or when the RPC omitted it.
 */
export function knownVital(
  availability: Partial<Record<CountyMetricKey, boolean>> | undefined,
  key: CountyMetricKey,
  value: number | null | undefined,
): number | null {
  if (availability?.[key] === false) return null;
  return countyMetric(value, false);
}

/** Format an optional count for display; unknown renders as an em dash. */
export function formatVital(value: number | null, suffix = ""): string {
  return value === null ? "—" : `${value.toLocaleString()}${suffix}`;
}
