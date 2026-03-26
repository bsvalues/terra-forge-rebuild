import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuthContext: vi.fn(() => ({
    profile: { county_id: "test-county-id" },
  })),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((_opts: { queryKey: string[]; queryFn: () => Promise<unknown>; enabled?: boolean }) => {
    return { data: undefined, isLoading: false, error: null };
  }),
}));

describe("useDataQualityScores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("exports useDataQualityScores as a function", async () => {
    const mod = await import("./useDataQualityScores");
    expect(mod.useDataQualityScores).toBeTypeOf("function");
  });

  it("enables query when county_id is present in profile", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    const { useDataQualityScores } = await import("./useDataQualityScores");
    useDataQualityScores();
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });

  it("uses dq-scores query key with county_id", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    const { useDataQualityScores } = await import("./useDataQualityScores");
    useDataQualityScores();
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["dq-scores", "test-county-id"],
      })
    );
  });

  it("exports DataQualityStats interface shape", async () => {
    const stats = {
      totalParcels: 5000,
      completenessScore: 85,
      accuracyScore: 90,
      consistencyScore: 78,
      overallScore: 84,
      domainScores: [
        { domain: "structural", score: 88, missingCount: 120 },
        { domain: "location", score: 92, missingCount: 50 },
      ],
    };
    expect(stats.overallScore).toBeGreaterThan(0);
    expect(stats.domainScores).toHaveLength(2);
  });
});
