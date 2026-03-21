// Phase 99 — Write-Lane Audit: exhaustive cross-lane violation detection
import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      then: vi.fn(),
    })),
  },
}));

describe("Write-Lane Audit — Cross-Lane Detection", () => {
  it("assertWriteLane throws for forge writing to dais domain", async () => {
    const { assertWriteLane } = await import("@/services/writeLane");
    expect(() => assertWriteLane("appeals", "forge")).toThrow(/VIOLATION/);
  });

  it("assertWriteLane throws for atlas writing to dossier domain", async () => {
    const { assertWriteLane } = await import("@/services/writeLane");
    expect(() => assertWriteLane("documents", "atlas")).toThrow(/VIOLATION/);
  });

  it("assertWriteLane throws for dais writing to forge domain", async () => {
    const { assertWriteLane } = await import("@/services/writeLane");
    expect(() => assertWriteLane("valuations", "dais")).toThrow(/VIOLATION/);
  });

  it("assertWriteLane allows forge to write valuations", async () => {
    const { assertWriteLane } = await import("@/services/writeLane");
    expect(() => assertWriteLane("valuations", "forge")).not.toThrow();
  });

  it("assertWriteLane allows dais to write appeals", async () => {
    const { assertWriteLane } = await import("@/services/writeLane");
    expect(() => assertWriteLane("appeals", "dais")).not.toThrow();
  });

  it("assertWriteLane allows os to write trace_events", async () => {
    const { assertWriteLane } = await import("@/services/writeLane");
    expect(() => assertWriteLane("trace_events", "os")).not.toThrow();
  });

  it("field module is blocked from writing to any domain except trace_events", async () => {
    const { assertWriteLane, WRITE_LANE_MATRIX } = await import("@/services/writeLane");
    const domains = Object.keys(WRITE_LANE_MATRIX) as Array<keyof typeof WRITE_LANE_MATRIX>;
    for (const domain of domains) {
      if (domain === "trace_events") continue;
      expect(() => assertWriteLane(domain, "field")).toThrow(/FIELD GUARDRAIL/);
    }
  });

  it("all 22 domains have exactly one owner — no gaps", async () => {
    const { WRITE_LANE_MATRIX } = await import("@/services/writeLane");
    const expectedDomains = [
      "parcel_characteristics", "valuations", "comps", "models",
      "calibration_runs", "cost_schedules", "value_adjustments", "comp_grids",
      "gis_layers", "boundaries", "spatial_annotations",
      "permits", "exemptions", "appeals", "notices", "workflows",
      "documents", "narratives", "packets",
      "trace_events", "user_prefs",
      "pilot_profile",
    ];
    for (const d of expectedDomains) {
      expect(WRITE_LANE_MATRIX).toHaveProperty(d);
    }
  });

  it("no domain is mapped to an invalid owner", async () => {
    const { WRITE_LANE_MATRIX } = await import("@/services/writeLane");
    const validOwners = new Set(["forge", "atlas", "dais", "dossier", "os", "pilot"]);
    for (const owner of Object.values(WRITE_LANE_MATRIX)) {
      expect(validOwners.has(owner as string)).toBe(true);
    }
  });
});
