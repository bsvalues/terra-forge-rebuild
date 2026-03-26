// TerraFusion OS — useRevaluationProgress Hook Tests (Phase 219)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRpcResult = {
  data: {
    cycle_id: "cycle-001",
    cycle_name: "2026 Residential Reval",
    tax_year: 2026,
    status: "launched",
    launched_at: "2026-01-15T00:00:00Z",
    total_parcels: 12000,
    total_assessed: 8500,
    total_certified: 4200,
    calibration_pct: 85,
    assessment_pct: 71,
    certification_pct: 35,
    neighborhoods: [
      { hood_cd: "N01", parcel_count: 500, assessed_count: 400, certified_count: 200, calibration_status: "complete", r_squared: 0.92, avg_value: 350000, phase: "valued" },
      { hood_cd: "N02", parcel_count: 300, assessed_count: 300, certified_count: 300, calibration_status: "complete", r_squared: 0.95, avg_value: 425000, phase: "certified" },
    ],
  },
  error: null,
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve(mockRpcResult)),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/services/terraTrace", () => ({
  emitTraceEventAsync: vi.fn(),
}));

import { useRevaluationProgress } from "./useRevaluationProgress";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useRevaluationProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports useRevaluationProgress as a function", () => {
    expect(useRevaluationProgress).toBeTypeOf("function");
  });

  it("calls get_revaluation_progress RPC with p_cycle_id", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { result } = renderHook(() => useRevaluationProgress("cycle-001"), { wrapper });
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    expect(supabase.rpc).toHaveBeenCalledWith("get_revaluation_progress", {
      p_cycle_id: "cycle-001",
    });
  });

  it("is disabled when cycleId is null", () => {
    const { result } = renderHook(() => useRevaluationProgress(null), { wrapper });
    // When disabled, isLoading should be false and data should be undefined
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("returns typed RevaluationProgress shape with neighborhoods", async () => {
    const { result } = renderHook(() => useRevaluationProgress("cycle-001"), { wrapper });
    await waitFor(() => result.current.data !== undefined, { timeout: 3000 });
    expect(result.current.data).toEqual(
      expect.objectContaining({
        cycle_id: "cycle-001",
        total_parcels: expect.any(Number),
        neighborhoods: expect.any(Array),
        calibration_pct: expect.any(Number),
      })
    );
    expect(result.current.data?.neighborhoods).toHaveLength(2);
  });
});
