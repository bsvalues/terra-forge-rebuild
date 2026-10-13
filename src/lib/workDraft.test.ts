import { describe, it, expect, beforeEach } from "vitest";
import { saveDraft, loadDraft, clearDraft } from "./workDraft";

describe("work draft recovery", () => {
  beforeEach(() => localStorage.clear());
  it("reopens an unsaved draft for the same parcel only", () => {
    saveDraft("parcel-details", "p1", { year_built: 1999 }, 1000);
    expect(loadDraft("parcel-details", "p1", 2000)?.data).toEqual({ year_built: 1999 });
    expect(loadDraft("parcel-details", "p2", 2000)).toBeNull();
  });
  it("drops drafts after a save clears them", () => {
    saveDraft("parcel-details", "p1", { a: 1 });
    clearDraft("parcel-details", "p1");
    expect(loadDraft("parcel-details", "p1")).toBeNull();
  });
  it("expires drafts older than 14 days", () => {
    saveDraft("parcel-details", "p1", { a: 1 }, 0);
    expect(loadDraft("parcel-details", "p1", 15 * 24 * 3600 * 1000)).toBeNull();
  });
});
