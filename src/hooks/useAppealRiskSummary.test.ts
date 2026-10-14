import { describe, it, expect } from "vitest";
import { toAppealRiskSummary } from "./useAppealRiskSummary";
describe("appeal risk summary mapping", () => {
  it("counts critical and high together as high risk", () => {
    const s = toAppealRiskSummary({ total_flagged: 10, critical: 2, high: 3, medium: 4, low: 1 });
    expect(s).toMatchObject({ totalParcels: 10, highRiskCount: 5, mediumRiskCount: 4, lowRiskCount: 1 });
  });
  it("returns nothing for an unexpected shape instead of crashing", () => {
    expect(toAppealRiskSummary({ foo: 1 })).toBeNull();
    expect(toAppealRiskSummary(null)).toBeNull();
  });
});
