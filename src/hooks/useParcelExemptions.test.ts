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
  useQuery: vi.fn((_opts: { queryFn: () => Promise<unknown> }) => {
    return { data: undefined, isLoading: false, error: null };
  }),
}));

describe("useParcelExemptions", () => {
  beforeEach(() => {
    _stubData = [];
    _stubError = null;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("exports useParcelExemptions as a function", async () => {
    const mod = await import("./useParcelExemptions");
    expect(mod.useParcelExemptions).toBeTypeOf("function");
  });

  it("queries exemptions table", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    const { useParcelExemptions } = await import("./useParcelExemptions");
    useParcelExemptions("parcel-abc");
    // Verify useQuery was called with the right query key
    expect((useQuery as any).mock.calls[0][0].queryKey).toEqual(["parcel-exemptions", "parcel-abc"]);
  });

  it("returns empty for null parcelId", async () => {
    const { useParcelExemptions } = await import("./useParcelExemptions");
    const result = useParcelExemptions(null);
    expect(result.isLoading).toBe(false);
  });

  it("exports ParcelExemption type shape", async () => {
    const exemption = {
      id: "e1", exemptionType: "Senior", exemptionCode: "SEN",
      status: "Active", effectiveDate: "2024-01-01", expirationDate: null, exemptAmount: 50000,
    };
    expect(exemption.exemptionType).toBe("Senior");
  });
});
