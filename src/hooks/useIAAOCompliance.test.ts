import { describe, it, expect } from "vitest";
import { complianceScore } from "./useIAAOCompliance";

describe("complianceScore", () => {
  it("is not measured when no neighborhood could be graded", () => {
    expect(complianceScore(0, 0, 0)).toBeNull();
  });
  it("counts marginal neighborhoods as half a pass", () => {
    expect(complianceScore(2, 2, 4)).toBe(75);
  });
  it("is 0 when every graded neighborhood fails", () => {
    expect(complianceScore(0, 0, 4)).toBe(0);
  });
});
