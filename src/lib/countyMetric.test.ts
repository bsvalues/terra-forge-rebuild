import { describe, expect, it } from "vitest";
import { availabilityFromRaw, countyMetric } from "./countyMetric";

describe("countyMetric", () => {
  it("preserves a real zero instead of treating it as missing", () => {
    expect(countyMetric(0, false)).toBe(0);
  });
  it("does not present a failed request as an operational count", () => {
    expect(countyMetric(110029, true)).toBeNull();
  });
  it("does not invent counts for missing or invalid data", () => {
    expect(countyMetric(undefined, false)).toBeNull();
    expect(countyMetric(Number.NaN, false)).toBeNull();
    expect(countyMetric(-1, false)).toBeNull();
  });
});

describe("availabilityFromRaw", () => {
  it("marks a real zero as known — zero is a measurement, not a gap", () => {
    const a = availabilityFromRaw({ parcels: { total: 0 }, appeals: { pending: 0 } });
    expect(a.parcels).toBe(true);
    expect(a.quality).toBe(true);
    expect(a.workflows).toBe(true);
  });
  it("marks metrics missing from the RPC payload as unknown", () => {
    const a = availabilityFromRaw({ parcels: { total: 110029 } });
    expect(a.parcels).toBe(true);
    expect(a.assessments).toBe(false);
    expect(a.sales).toBe(false);
    expect(a.workflows).toBe(false);
  });
  it("marks everything unknown for an empty payload", () => {
    const a = availabilityFromRaw({});
    expect(Object.values(a).every((v) => v === false)).toBe(true);
  });
  it("falls back to workflows.pendingAppeals when appeals.pending is absent", () => {
    const a = availabilityFromRaw({ workflows: { pendingAppeals: 3 } });
    expect(a.appeals).toBe(true);
    expect(a.workflows).toBe(true);
  });
});
