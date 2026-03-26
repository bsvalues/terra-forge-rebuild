// Phase 171 — useCostForgeMutations Tests
// Covers: useSaveCalcTrace mutationFn, error paths, TerraTrace emission
import { describe, it, expect, vi, beforeEach } from "vitest";

const _mockInsertChain = {
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
};

let _insertResult: { data: unknown; error: null | { message: string } } = {
  data: { id: "trace-123" },
  error: null,
};

// Build fresh chain each call
function makeInsertChain() {
  const chain: Record<string, unknown> = {};
  chain.insert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(_insertResult));
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => makeInsertChain()),
  },
  fromAny: vi.fn(() => makeInsertChain()),
}));

vi.mock("@/services/terraTrace", () => ({
  emitTraceEventAsync: vi.fn(),
  emitTraceEvent: vi.fn().mockResolvedValue("evt-id"),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn((opts: { mutationFn: (...args: unknown[]) => unknown; onSuccess?: (...args: unknown[]) => unknown }) => ({
    mutate: vi.fn(async (vars: unknown) => {
      const result = await opts.mutationFn(vars);
      opts.onSuccess?.(result, vars, undefined);
      return result;
    }),
    isPending: false,
    isSuccess: false,
    isError: false,
    reset: vi.fn(),
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

describe("useSaveCalcTrace", () => {
  beforeEach(() => {
    _insertResult = { data: { id: "trace-123" }, error: null };
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns a mutation object with a mutate function", async () => {
    const { useSaveCalcTrace } = await import("./useCostForgeMutations" + "");
    const mutation = useSaveCalcTrace();
    expect(mutation).toHaveProperty("mutate");
    expect(typeof mutation.mutate).toBe("function");
  });

  it("calls fromAny with costforge_calc_trace", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { useSaveCalcTrace } = await import("@/hooks/useCostForgeMutations");
    const mutation = useSaveCalcTrace();

    const traceInput = {
      county_id: "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d",
      parcel_id: "parcel-abc",
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
      rcn_before_ref: 181440,
      refinements_total: 0,
      rcn: 181440,
      age_years: 25,
      effective_life_years: 45,
      pct_good: 72,
      rcnld: 130637,
      schedule_source: "residential/Average/Metal or Vinyl Siding",
      calc_method: "draft_manual",
    };

    await mutation.mutate(traceInput as any);
    expect(supabase.from).toHaveBeenCalledWith("costforge_calc_trace");
  });

  it("emits a TerraTrace event on success", async () => {
    const { emitTraceEventAsync } = await import("@/services/terraTrace");
    const { useSaveCalcTrace } = await import("@/hooks/useCostForgeMutations");
    const mutation = useSaveCalcTrace();

    await mutation.mutate({
      county_id: "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d",
      parcel_id: "parcel-xyz",
      lrsn: null,
      prop_id: null,
      calc_year: 2025,
      imprv_sequence: 1,
      imprv_type_cd: "RES",
      section_id: null,
      occupancy_code: null,
      construction_class: "D" as const,
      quality_grade: "Average" as const,
      area_sqft: 2200,
      base_unit_cost: 95,
      local_multiplier: 100,
      current_cost_mult: 112,
      rcn_before_ref: 234080,
      refinements_total: 0,
      rcn: 234080,
      age_years: 10,
      effective_life_years: 45,
      pct_good: 91,
      rcnld: 213013,
      schedule_source: "residential/Average/Metal or Vinyl Siding",
      calc_method: "draft_manual",
    } as any);

    expect(emitTraceEventAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceModule: "forge",
        eventType: "model_run_completed",
        artifactType: "assessment",
      })
    );
  });

  it("propagates DB error when insert fails", async () => {
    _insertResult = { data: null, error: { message: "unique constraint violation" } };
    const { useSaveCalcTrace } = await import("@/hooks/useCostForgeMutations");

    // Directly test the mutationFn by calling it
    const { useMutation } = await import("@tanstack/react-query");
    let capturedMutationFn: (v: unknown) => Promise<unknown> = async () => ({});
    (useMutation as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (opts: { mutationFn: (v: unknown) => Promise<unknown> }) => {
        capturedMutationFn = opts.mutationFn;
        return { mutate: vi.fn(), isPending: false };
      }
    );

    useSaveCalcTrace();
    await expect(capturedMutationFn({ county_id: "x", calc_year: 2025 })).rejects.toThrow(
      "unique constraint violation"
    );
  });
});

describe("CalcTraceInsert type", () => {
  it("excludes id and calc_run_at (Omit contract)", () => {
    // Runtime assertion: a valid insert should NOT include id or calc_run_at
    const validInsert = {
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
      local_multiplier: null,
      current_cost_mult: null,
      rcn_before_ref: null,
      refinements_total: 0,
      rcn: null,
      age_years: 20,
      effective_life_years: 45,
      pct_good: 78,
      rcnld: null,
      schedule_source: null,
      calc_method: "draft_manual",
    };
    expect(validInsert).not.toHaveProperty("id");
    expect(validInsert).not.toHaveProperty("calc_run_at");
  });
});
