import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(function(this: unknown) { return this; }),
        order: vi.fn(function(this: unknown) { return this; }),
        neq: vi.fn(function(this: unknown) { return this; }),
        abortSignal: vi.fn(() => Promise.resolve({ data: [], error: null })),
        limit: vi.fn(function(this: unknown) { return this; }),
      })),
    })),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((_opts: { queryFn: () => Promise<unknown>; enabled?: boolean }) => {
    return { data: undefined, isLoading: false, error: null };
  }),
}));

describe("useComparableSales", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports useComparableSales function", async () => {
    const mod = await import("./useComparableSales");
    expect(mod.useComparableSales).toBeTypeOf("function");
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

  it("exports ComparableSale type shape", () => {
    const sale = {
      id: "s1", parcelId: "p1", parcelNumber: "12345", address: "123 Main",
      saleDate: "2025-06-15", salePrice: 350000, pricePerSqft: 195,
      propertyClass: "R", sqft: 1800, yearBuilt: 2005, neighborhoodCode: "N-042", qualified: true,
    };
    expect(sale.pricePerSqft).toBe(195);
  });
  it("requests canonical parcel fields and scopes class and exclusion before limiting", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    const { supabase } = await import("@/integrations/supabase/client");
    const { useComparableSales } = await import("./useComparableSales");
    useComparableSales({ neighborhoodCode: "14061", propertyClass: "11", countyId: "county-benton", excludeParcelId: "subject", limit: 15 });
    const options = vi.mocked(useQuery).mock.calls[0][0] as unknown as { queryFn: () => Promise<unknown>; queryKey: unknown[] };
    await options.queryFn();
    const query = vi.mocked(supabase.from).mock.results[0].value;
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("address"));
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("building_area"));
    expect(query.select).not.toHaveBeenCalledWith(expect.stringContaining("site_address"));
    const filter = vi.mocked(query.select).mock.results[0].value as any;
    expect(filter.eq).toHaveBeenCalledWith("county_id", "county-benton");
    expect(filter.eq).toHaveBeenCalledWith("is_qualified", true);
    expect(filter.eq).toHaveBeenCalledWith("parcels.property_class", "11");
    expect(filter.neq).toHaveBeenCalledWith("parcel_id", "subject");
    expect(filter.limit).toHaveBeenCalledWith(15);
    expect(options.queryKey).toContain("subject");
  });
});
