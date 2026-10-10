import { describe, expect, it } from "vitest";
import { countyMetric } from "./countyMetric";

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