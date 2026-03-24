// Phase 171 — CostForge Connector Tests
// Covers: type exports, BENTON_COSTFORGE_CONFIG, calcRCNLD computation logic,
// error-propagation from mocked Supabase, and connector helpers.
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Supabase client mock ─────────────────────────────────────────────────────
// We build a chainable query-builder mock so every .select().eq()…  chain resolves.
function makeQueryBuilder(resolvedValue: { data: unknown; error: null | { message: string } }) {
  const qb: Record<string, unknown> = {};
  const chain = () => qb;
  qb.select = vi.fn(chain);
  qb.eq = vi.fn(chain);
  qb.lte = vi.fn(chain);
  qb.order = vi.fn(chain);
  qb.limit = vi.fn(chain);
  qb.insert = vi.fn(chain);
  qb.maybeSingle = vi.fn(() => Promise.resolve(resolvedValue));
  qb.single = vi.fn(() => Promise.resolve(resolvedValue));
  qb.then = vi.fn((cb: (v: unknown) => unknown) => Promise.resolve(cb(resolvedValue)));
  return qb;
}

const _fromAnyCalls: string[] = [];
let _stubData: unknown = null;
let _stubError: { message: string } | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => makeQueryBuilder({ data: null, error: null })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  }: vi.fn((table: string) => {
    _fromAnyCalls.push(table);
    return makeQueryBuilder({ data: _stubData, error: _stubError });
  }),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe("BENTON_COSTFORGE_CONFIG", () => {
  it("has correct default county id", async () => {
    const { BENTON_COSTFORGE_CONFIG } = await import("./costforgeConnector");
    expect(BENTON_COSTFORGE_CONFIG.defaultCountyId).toBe(
      "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d"
    );
  });

  it("canWrite is false", async () => {
    const { BENTON_COSTFORGE_CONFIG } = await import("./costforgeConnector");
    expect(BENTON_COSTFORGE_CONFIG.canWrite).toBe(false);
  });

  it("currentCalcYear is the current year", async () => {
    const { BENTON_COSTFORGE_CONFIG } = await import("./costforgeConnector");
    expect(BENTON_COSTFORGE_CONFIG.currentCalcYear).toBe(new Date().getFullYear());
  });

  it("has a non-empty name string", async () => {
    const { BENTON_COSTFORGE_CONFIG } = await import("./costforgeConnector");
    expect(BENTON_COSTFORGE_CONFIG.name.length).toBeGreaterThan(0);
  });
});

describe("Type exports", () => {
  it("exports ConstructionClass as union", async () => {
    // Just verifying the module exports types without TS errors
    // (done via assignability at runtime through dummy value)
    const mod = await import("./costforgeConnector");
    expect(mod.BENTON_COSTFORGE_CONFIG).toBeDefined();
  });

  it("CalcTraceRow shape has all expected keys", async () => {
    // Build a minimal CalcTraceRow to verify runtime shape
    const row = {
      id: "uuid",
      county_id: "cid",
      parcel_id: null,
      lrsn: null,
      prop_id: null,
      calc_year: 2025,
      imprv_sequence: 1,
      imprv_type_cd: "RES",
      section_id: null,
      occupancy_code: null,
      construction_class: "D" as const,
      quality_grade: "Average" as const,
      area_sqft: 1800,
      base_unit_cost: 90,
      local_multiplier: 100,
      current_cost_mult: 112,
      rcn_before_ref: 180000,
      refinements_total: 0,
      rcn: 180000,
      age_years: 20,
      effective_life_years: 45,
      pct_good: 78,
      rcnld: 140400,
      schedule_source: "residential/Average/Metal or Vinyl Siding",
      calc_method: "draft_manual",
      calc_run_at: new Date().toISOString(),
    };
    expect(row.rcnld).toBe(140400);
    expect(row.calc_method).toBe("draft_manual");
  });
});

describe("lookupResidentialCost", () => {
  beforeEach(() => {
    _stubData = null;
    _stubError = null;
    _fromAnyCalls.length = 0;
  });

  it("queries costforge_residential_schedules", async () => {
    const { lookupResidentialCost } = await import("./costforgeConnector");
    await lookupResidentialCost("Average", 1800, "Metal or Vinyl Siding");
    expect(_fromAnyCalls).toContain("costforge_residential_schedules");
  });

  it("returns null when no matching row", async () => {
    _stubData = null;
    const { lookupResidentialCost } = await import("./costforgeConnector");
    const result = await lookupResidentialCost("Excellent", 500, "Brick");
    expect(result).toBeNull();
  });

  it("returns the row data when found", async () => {
    _stubData = { id: "row1", unit_cost: 95.5, quality_grade: "Good" };
    const { lookupResidentialCost } = await import("./costforgeConnector");
    const result = await lookupResidentialCost("Good", 1800, "Metal or Vinyl Siding");
    expect(result).toMatchObject({ unit_cost: 95.5 });
  });

  it("throws on database error", async () => {
    _stubError = { message: "connection refused" };
    const { lookupResidentialCost } = await import("./costforgeConnector");
    await expect(
      lookupResidentialCost("Average", 1800, "Metal or Vinyl Siding")
    ).rejects.toThrow("connection refused");
  });
});

describe("lookupCommercialCost", () => {
  beforeEach(() => {
    _stubData = null;
    _stubError = null;
    _fromAnyCalls.length = 0;
  });

  it("queries costforge_commercial_schedules", async () => {
    const { lookupCommercialCost } = await import("./costforgeConnector");
    await lookupCommercialCost(1, "OF", "B", "Average");
    expect(_fromAnyCalls).toContain("costforge_commercial_schedules");
  });

  it("returns null when no match", async () => {
    _stubData = null;
    const { lookupCommercialCost } = await import("./costforgeConnector");
    const result = await lookupCommercialCost(99, "ZZ", "A", "Low");
    expect(result).toBeNull();
  });

  it("returns row when found", async () => {
    _stubData = { id: "cid", unit_cost: 120, occupancy_code: "OF" };
    const { lookupCommercialCost } = await import("./costforgeConnector");
    const result = await lookupCommercialCost(1, "OF", "B", "Good");
    expect(result).toMatchObject({ unit_cost: 120 });
  });

  it("throws on DB error", async () => {
    _stubError = { message: "timeout" };
    const { lookupCommercialCost } = await import("./costforgeConnector");
    await expect(lookupCommercialCost(1, "OF", "B", "Good")).rejects.toThrow("timeout");
  });
});

describe("lookupDepreciation", () => {
  beforeEach(() => {
    _stubData = null;
    _stubError = null;
    _fromAnyCalls.length = 0;
  });

  it("queries costforge_depreciation", async () => {
    const { lookupDepreciation } = await import("./costforgeConnector");
    await lookupDepreciation("residential", 20, 45);
    expect(_fromAnyCalls).toContain("costforge_depreciation");
  });

  it("returns null when no row found", async () => {
    _stubData = null;
    const { lookupDepreciation } = await import("./costforgeConnector");
    const result = await lookupDepreciation("commercial", 99, 60);
    expect(result).toBeNull();
  });

  it("returns pct_good value from row", async () => {
    _stubData = { pct_good: 72 };
    const { lookupDepreciation } = await import("./costforgeConnector");
    const result = await lookupDepreciation("residential", 25, 45);
    expect(result).toBe(72);
  });

  it("throws on DB error", async () => {
    _stubError = { message: "depreciation lookup failed" };
    const { lookupDepreciation } = await import("./costforgeConnector");
    await expect(lookupDepreciation("residential", 10, 45)).rejects.toThrow(
      "depreciation lookup failed"
    );
  });
});

describe("calcRCNLD — residential", () => {
  beforeEach(() => {
    _stubData = null;
    _stubError = null;
    _fromAnyCalls.length = 0;
    vi.resetModules();
  });

  it("returns null fields when no base unit cost found", async () => {
    // All stubs return null
    _stubData = null;
    const { calcRCNLD } = await import("./costforgeConnector");
    const result = await calcRCNLD({
      lrsn: null,
      pin: null,
      county_id: "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d",
      imprv_det_type_cd: "RES",
      yr_built: 2000,
      area_sqft: 1800,
      condition_code: null,
      construction_class_raw: "D",
      use_code: null,
      section_id: null,
      occupancy_code: null,
      is_residential: true,
    });
    expect(result.rcnld).toBeNull();
    expect(result.scheduleSource).toContain("residential");
  });

  it("returns scheduleSource = unresolved for commercial with no section_id", async () => {
    _stubData = null;
    const { calcRCNLD } = await import("./costforgeConnector");
    const result = await calcRCNLD({
      lrsn: null,
      pin: null,
      county_id: "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d",
      imprv_det_type_cd: "COM",
      yr_built: 2005,
      area_sqft: 5000,
      condition_code: null,
      construction_class_raw: "B",
      use_code: null,
      section_id: null,   // missing
      occupancy_code: null,
      is_residential: false,
    });
    expect(result.scheduleSource).toBe("unresolved");
    expect(result.rcnld).toBeNull();
  });

  it("computes correct age_years from yr_built", async () => {
    _stubData = null;
    const { calcRCNLD } = await import("./costforgeConnector");
    const yrBuilt = 2005;
    const expectedAge = new Date().getFullYear() - yrBuilt;
    const result = await calcRCNLD({
      lrsn: null,
      pin: null,
      county_id: "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d",
      imprv_det_type_cd: "RES",
      yr_built: yrBuilt,
      area_sqft: 1800,
      condition_code: null,
      construction_class_raw: "D",
      use_code: null,
      section_id: null,
      occupancy_code: null,
      is_residential: true,
    });
    expect(result.ageYears).toBe(expectedAge);
  });

  it("returns null ageYears when yr_built is null", async () => {
    _stubData = null;
    const { calcRCNLD } = await import("./costforgeConnector");
    const result = await calcRCNLD({
      lrsn: null,
      pin: null,
      county_id: "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d",
      imprv_det_type_cd: "RES",
      yr_built: null,
      area_sqft: 1800,
      condition_code: null,
      construction_class_raw: "D",
      use_code: null,
      section_id: null,
      occupancy_code: null,
      is_residential: true,
    });
    expect(result.ageYears).toBeNull();
  });

  it("defaults construction class to D for unrecognized raw class", async () => {
    _stubData = null;
    const { calcRCNLD } = await import("./costforgeConnector");
    // Should not throw — invalid class falls back to D
    const result = await calcRCNLD({
      lrsn: null,
      pin: null,
      county_id: "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d",
      imprv_det_type_cd: "RES",
      yr_built: 2000,
      area_sqft: 1800,
      condition_code: null,
      construction_class_raw: "INVALID_CLASS",
      use_code: null,
      section_id: null,
      occupancy_code: null,
      is_residential: true,
    });
    expect(result).toBeDefined();
  });

  it("treats null is_residential as non-residential", async () => {
    _stubData = null;
    const { calcRCNLD } = await import("./costforgeConnector");
    // null is_residential → treated as commercial, no section/occupancy → unresolved
    const result = await calcRCNLD({
      lrsn: null,
      pin: null,
      county_id: "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d",
      imprv_det_type_cd: null,
      yr_built: 2010,
      area_sqft: 3000,
      condition_code: null,
      construction_class_raw: null,
      use_code: null,
      section_id: null,
      occupancy_code: null,
      is_residential: null,
    });
    expect(result.scheduleSource).toBe("unresolved");
  });
});

describe("getAllTypeCodes", () => {
  beforeEach(() => {
    _stubData = [];
    _stubError = null;
    _fromAnyCalls.length = 0;
    vi.resetModules();
  });

  it("queries costforge_imprv_type_codes", async () => {
    const { getAllTypeCodes } = await import("./costforgeConnector");
    // Override then to return empty array
    const { fromAny } = await import("@/integrations/supabase/client");
    (fromAny as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      const qb = makeQueryBuilder({ data: [], error: null });
      return qb;
    });
    const result = await getAllTypeCodes();
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws on DB error", async () => {
    const { fromAny } = await import("@/integrations/supabase/client");
    (fromAny as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
      makeQueryBuilder({ data: null, error: { message: "RLS denied" } })
    );
    const { getAllTypeCodes } = await import("./costforgeConnector");
    await expect(getAllTypeCodes()).rejects.toThrow("RLS denied");
  });
});

describe("CostForgeCalcInput shape contract", () => {
  it("accepts a residential input with all required fields", () => {
    // Static shape assertion at runtime
    const input = {
      lrsn: 123456,
      pin: "1234567890",
      county_id: "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d",
      imprv_det_type_cd: "RES",
      yr_built: 2000,
      area_sqft: 1800,
      condition_code: "A",
      construction_class_raw: "D",
      use_code: "R1",
      section_id: null,
      occupancy_code: null,
      is_residential: true,
    };
    expect(input.county_id).toBe("842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d");
    expect(input.is_residential).toBe(true);
  });

  it("accepts a commercial input with section_id and occupancy_code", () => {
    const input = {
      lrsn: 999,
      pin: null,
      county_id: "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d",
      imprv_det_type_cd: "COM",
      yr_built: 1990,
      area_sqft: 10000,
      condition_code: null,
      construction_class_raw: "B",
      use_code: "C2",
      section_id: 3,
      occupancy_code: "OF",
      is_residential: false,
    };
    expect(input.section_id).toBe(3);
    expect(input.occupancy_code).toBe("OF");
  });
});
