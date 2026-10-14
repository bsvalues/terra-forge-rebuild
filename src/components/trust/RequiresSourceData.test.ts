import { describe, it, expect } from "vitest";
import { isMissingRelationError } from "./RequiresSourceData";

describe("isMissingRelationError", () => {
  it("treats a missing table or view as not loaded", () => {
    expect(isMissingRelationError({ code: "PGRST205", message: "Could not find the table" })).toBe(true);
    expect(isMissingRelationError({ code: "42P01", message: 'relation "x" does not exist' })).toBe(true);
  });
  it("does not hide permission or other errors", () => {
    expect(isMissingRelationError({ code: "42501", message: "permission denied" })).toBe(false);
    expect(isMissingRelationError(null)).toBe(false);
  });
});
