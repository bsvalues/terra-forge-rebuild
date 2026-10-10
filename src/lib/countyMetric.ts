/** A missing or failed measurement is unknown, never an operational zero. */
export function countyMetric(value: number | null | undefined, failed: boolean): number | null {
  return !failed && typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}