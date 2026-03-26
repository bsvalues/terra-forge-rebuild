// TerraFusion OS — useAppealRiskSummary Hook Tests (Phase 218)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRpcResult = {
  data: {
    totalParcels: 5000,
    highRiskCount: 120,
    mediumRiskCount: 340,
    lowRiskCount: 4540,
    avgScore: 42.5,
    topRiskNeighborhoods: [
      { code: "N01", avgScore: 78.2, count: 35 },
      { code: "N12", avgScore: 65.1, count: 22 },
    ],
  },
  error: null,
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve(mockRpcResult)),
  },
}));

vi.mock("@/hooks/useActiveCounty", () => ({
  useActiveCountyId: () => "test-county-id",
}));

import { useAppealRiskSummary } from "./useAppealRiskSummary";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useAppealRiskSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports useAppealRiskSummary as a function", () => {
    expect(useAppealRiskSummary).toBeTypeOf("function");
  });

  it("calls get_appeal_risk_summary RPC with county_id", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { result } = renderHook(() => useAppealRiskSummary(), { wrapper });
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    expect(supabase.rpc).toHaveBeenCalledWith("get_appeal_risk_summary", {
      p_county_id: "test-county-id",
    });
  });

  it("returns typed AppealRiskSummary shape", async () => {
    const { result } = renderHook(() => useAppealRiskSummary(), { wrapper });
    await waitFor(() => result.current.data !== undefined, { timeout: 3000 });
    expect(result.current.data).toEqual(
      expect.objectContaining({
        totalParcels: expect.any(Number),
        highRiskCount: expect.any(Number),
        mediumRiskCount: expect.any(Number),
        lowRiskCount: expect.any(Number),
      })
    );
  });

  it("returns isLoading true on initial render", () => {
    const { result } = renderHook(() => useAppealRiskSummary(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });
});
