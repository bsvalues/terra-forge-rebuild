import { describe, expect, it } from "vitest";
import { availabilityFromRaw, countyMetric, formatVital, knownVital } from "./countyMetric";

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

describe("knownVital", () => {
  it("hides a defaulted zero when the metric was not reported", () => {
    expect(knownVital({ sales: false }, "sales", 0)).toBeNull();
  });
  it("keeps a reported zero", () => {
    expect(knownVital({ sales: true }, "sales", 0)).toBe(0);
  });
  it("is unknown while vitals are still loading", () => {
    expect(knownVital(undefined, "parcels", undefined)).toBeNull();
  });
  it("formats unknown as an em dash and known with separators", () => {
    expect(formatVital(null)).toBe("—");
    expect(formatVital(110029)).toBe("110,029");
    expect(formatVital(42, "%")).toBe("42%");
  });
});

describe("defensibility availability", () => {
  it("is unknown when the RPC returns no defensibility score", () => {
    expect(availabilityFromRaw({ parcels: { total: 5 } }).defensibility).toBe(false);
  });
  it("is known for a reported score of zero", () => {
    expect(availabilityFromRaw({ defensibility: { score: 0 } }).defensibility).toBe(true);
  });
});
