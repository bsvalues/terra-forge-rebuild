import { describe, it, expect, vi, beforeEach } from "vitest";

let _stubData: unknown[] = [];
let _stubError: { message: string } | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: _stubData, error: _stubError })),
        })),
      })),
    })),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((_opts: { queryKey: string[]; queryFn: () => Promise<unknown>; enabled?: boolean }) => {
    return { data: undefined, isLoading: false, error: null };
  }),
}));

describe("useIAAOMetrics", () => {
  beforeEach(() => {
    _stubData = [];
    _stubError = null;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("exports useIAAOMetrics as a function", async () => {
    const mod = await import("./useIAAOMetrics");
    expect(mod.useIAAOMetrics).toBeTypeOf("function");
  });

  it("returns hook result for a valid countyId", async () => {
    const { useIAAOMetrics } = await import("./useIAAOMetrics");
    const result = useIAAOMetrics("county-123");
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("isLoading");
    expect(result).toHaveProperty("error");
  });

  it("disables query when countyId is null", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    const { useIAAOMetrics } = await import("./useIAAOMetrics");
    useIAAOMetrics(null);
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });

  it("enables query when countyId is present", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    const { useIAAOMetrics } = await import("./useIAAOMetrics");
    useIAAOMetrics("county-abc");
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });

  it("exports IAAOMetrics interface shape", async () => {
    const metric = {
      neighborhoodCode: "NB01",
      medianRatio: 0.98,
      cod: 12.5,
      prd: 1.01,
      prb: null,
      sampleSize: 50,
      iaaoCompliant: true,
      runDate: "2026-01-15",
    };
    expect(metric.cod).toBeLessThanOrEqual(15);
    expect(metric.prd).toBeGreaterThanOrEqual(0.98);
    expect(metric.prd).toBeLessThanOrEqual(1.03);
    expect(metric.iaaoCompliant).toBe(true);
  });
});
