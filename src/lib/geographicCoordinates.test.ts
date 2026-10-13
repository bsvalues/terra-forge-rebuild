import { describe, expect, it } from "vitest";
import { hasGeographicCoordinates } from "./geographicCoordinates";
describe("geographic map coordinates", () => {
  it("rejects observed Benton projected values as geographic degrees", () => {
    expect(hasGeographicCoordinates(320600.2768, 1827644.577)).toBe(false);
  });
  it("accepts degrees and rejects missing or nonfinite coordinates", () => {
    expect(hasGeographicCoordinates(46.2, -119.7)).toBe(true);
    expect(hasGeographicCoordinates(null, -119.7)).toBe(false);
    expect(hasGeographicCoordinates(NaN, Infinity)).toBe(false);
  });
});