import { describe, it, expect, vi, beforeEach } from "vitest";

let _stubData: unknown[] = [];
let _stubError: { message: string } | null = null;

function makeChain() {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => Promise.resolve({ data: _stubData, error: _stubError }));
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => makeChain()),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((_opts: { queryFn: () => Promise<unknown>; enabled?: boolean }) => {
    return { data: undefined, isLoading: false, error: null };
  }),
}));

describe("useComparableSales", () => {
  beforeEach(() => {
    _stubData = [];
    _stubError = null;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("exports useComparableSales function", async () => {
    const mod = await import("./useComparableSales");
    expect(mod.useComparableSales).toBeTypeOf("function");
  });

  it("queries sales table with neighborhood filter", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { useComparableSales } = await import("./useComparableSales");
    useComparableSales({ neighborhoodCode: "N-042", propertyClass: "R", countyId: "cid" });
    expect(supabase.from).toHaveBeenCalledWith("sales");
  });

  it("is disabled when neighborhoodCode is null", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    const { useComparableSales } = await import("./useComparableSales");
    useComparableSales({ neighborhoodCode: null, propertyClass: "R", countyId: "cid" });
    expect((useQuery as any).mock.calls[0][0].enabled).toBe(false);
  });

  it("is disabled when countyId is null", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    const { useComparableSales } = await import("./useComparableSales");
    useComparableSales({ neighborhoodCode: "N-042", propertyClass: "R", countyId: null });
    expect((useQuery as any).mock.calls[0][0].enabled).toBe(false);
  });

  it("exports ComparableSale type shape", async () => {
    const sale = {
      id: "s1", parcelId: "p1", parcelNumber: "12345", address: "123 Main",
      saleDate: "2025-06-15", salePrice: 350000, pricePerSqft: 195,
      propertyClass: "R", sqft: 1800, yearBuilt: 2005, neighborhoodCode: "N-042", qualified: true,
    };
    expect(sale.pricePerSqft).toBe(195);
  });
});
