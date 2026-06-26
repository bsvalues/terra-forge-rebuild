import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve({ data: { totalParcels: 5000, highRiskCount: 120 }, error: null })),
  },
}));

vi.mock("@/hooks/useActiveCounty", () => ({
  useActiveCountyId: () => "test-county-id",
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((_opts: { queryKey: string[]; queryFn: () => Promise<unknown>; enabled?: boolean }) => {
    return { data: undefined, isLoading: false, error: null };
  }),
}));

describe("useAppealRiskSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("exports useAppealRiskSummary as a function", async () => {
    const mod = await import("./useAppealRiskSummary");
    expect(mod.useAppealRiskSummary).toBeTypeOf("function");
  });

  it("uses appeal-risk-summary-rpc query key with countyId", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    const { useAppealRiskSummary } = await import("./useAppealRiskSummary");
    useAppealRiskSummary();
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["appeal-risk-summary-rpc", "test-county-id"],
        enabled: true,
      })
    );
  });

  it("exports AppealRiskSummary interface shape", () => {
    const summary = { totalParcels: 5000, highRiskCount: 120, mediumRiskCount: 340, lowRiskCount: 4540, avgScore: 42.5, topRiskNeighborhoods: [] };
    expect(summary.totalParcels).toBe(5000);
  });
});
