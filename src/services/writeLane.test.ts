import { describe, it, expect, vi, beforeEach } from "vitest";
import { WRITE_LANE_MATRIX, resolveWriteLane, assertWriteLane } from "./writeLane";

describe("Write-Lane Matrix", () => {
  it("maps all forge domains to forge", () => {
    const forgeDomains = [
      "parcel_characteristics", "valuations", "comps", "models",
      "calibration_runs", "cost_schedules", "value_adjustments", "comp_grids",
    ] as const;
    for (const d of forgeDomains) {
      expect(WRITE_LANE_MATRIX[d]).toBe("forge");
    }
  });

  it("maps all atlas domains to atlas", () => {
    for (const d of ["gis_layers", "boundaries", "spatial_annotations"] as const) {
      expect(WRITE_LANE_MATRIX[d]).toBe("atlas");
    }
  });

  it("maps all dais domains to dais", () => {
    for (const d of ["permits", "exemptions", "appeals", "notices", "workflows"] as const) {
      expect(WRITE_LANE_MATRIX[d]).toBe("dais");
    }
  });

  it("maps all dossier domains to dossier", () => {
    for (const d of ["documents", "narratives", "packets"] as const) {
      expect(WRITE_LANE_MATRIX[d]).toBe("dossier");
    }
  });

  it("maps OS domains to os", () => {
    expect(WRITE_LANE_MATRIX.trace_events).toBe("os");
    expect(WRITE_LANE_MATRIX.user_prefs).toBe("os");
  });

  it("maps pilot_profile to pilot", () => {
    expect(WRITE_LANE_MATRIX.pilot_profile).toBe("pilot");
  });

  it("every domain has exactly one owner", () => {
    const domains = Object.keys(WRITE_LANE_MATRIX);
    expect(domains.length).toBeGreaterThan(0);
    for (const d of domains) {
      expect(typeof WRITE_LANE_MATRIX[d as keyof typeof WRITE_LANE_MATRIX]).toBe("string");
    }
  });
});

describe("resolveWriteLane", () => {
  it("returns correct owner for each domain", () => {
    expect(resolveWriteLane("valuations")).toBe("forge");
    expect(resolveWriteLane("appeals")).toBe("dais");
    expect(resolveWriteLane("documents")).toBe("dossier");
    expect(resolveWriteLane("gis_layers")).toBe("atlas");
    expect(resolveWriteLane("trace_events")).toBe("os");
  });
});

describe("assertWriteLane", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("does not throw when owner matches", () => {
    expect(() => assertWriteLane("valuations", "forge")).not.toThrow();
    expect(() => assertWriteLane("appeals", "dais")).not.toThrow();
    expect(() => assertWriteLane("documents", "dossier")).not.toThrow();
    expect(() => assertWriteLane("gis_layers", "atlas")).not.toThrow();
    expect(() => assertWriteLane("trace_events", "os")).not.toThrow();
  });

  it("throws on cross-lane violation in dev", () => {
    expect(() => assertWriteLane("valuations", "dais")).toThrow(/VIOLATION/);
    expect(() => assertWriteLane("appeals", "forge")).toThrow(/VIOLATION/);
    expect(() => assertWriteLane("documents", "atlas")).toThrow(/VIOLATION/);
  });

  it("blocks field module from direct domain writes", () => {
    expect(() => assertWriteLane("valuations", "field")).toThrow(/FIELD GUARDRAIL/);
    expect(() => assertWriteLane("appeals", "field")).toThrow(/FIELD GUARDRAIL/);
  });

  it("allows field module to bypass field guardrail for trace_events but still fails owner check", () => {
    // field + trace_events skips the field guardrail (domain === "trace_events")
    // but still fails because os !== field — this is correct behavior
    expect(() => assertWriteLane("trace_events", "field")).toThrow(/VIOLATION/);
  });
});
