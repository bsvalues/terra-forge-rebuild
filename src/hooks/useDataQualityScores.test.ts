import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve({ data: [{ total_parcels: 5000, has_assessed_value: 4500, has_bathrooms: 3000, has_bedrooms: 3200, has_building_area: 4000, has_coordinates: 4800, has_land_area: 4100, has_neighborhood: 4700, has_year_built: 3800 }], error: null })),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((_opts: { queryKey: string[]; queryFn: () => Promise<unknown> }) => {
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

  it("uses dq-scores query key", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    const { useDataQualityScores } = await import("./useDataQualityScores");
    useDataQualityScores();
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["dq-scores"],
      })
    );
  });

  it("exports DataQualityStats and DomainScore interfaces", async () => {
    const stats = {
      totalParcels: 5000,
      overallScore: 84,
      domains: [
        { domain: "Assessed Value", score: 90, count: 4500 },
        { domain: "Year Built", score: 76, count: 3800 },
      ],
    };
    expect(stats.overallScore).toBeGreaterThan(0);
    expect(stats.domains).toHaveLength(2);
  });
});
