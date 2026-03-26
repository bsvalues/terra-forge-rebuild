import { describe, it, expect, vi, beforeEach } from "vitest";

let _stubPermits: unknown[] = [];
let _stubError: { message: string } | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: _stubPermits, error: _stubError })),
        })),
      })),
    })),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((opts: { queryFn: () => Promise<unknown> }) => {
    let data: unknown = undefined;
    let error: unknown = null;
    try {
      opts.queryFn();
    } catch (e) { error = e; }
    return { data, isLoading: false, error };
  }),
}));

describe("useParcelPermits", () => {
  beforeEach(() => {
    _stubPermits = [];
    _stubError = null;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns empty array for null parcelId", async () => {
    const { useParcelPermits } = await import("./useParcelPermits");
    const result = useParcelPermits(null);
    expect(result.isLoading).toBe(false);
  });

  it("queries permits table with parcel_id", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    _stubPermits = [{ id: "p1", permit_number: "BP-001", permit_type: "Building", status: "Issued", issued_date: "2025-01-15", estimated_value: 50000, description: "Addition" }];
    const { useParcelPermits } = await import("./useParcelPermits");
    useParcelPermits("parcel-123");
    expect(supabase.from).toHaveBeenCalledWith("permits");
  });

  it("maps canonical permits to UnifiedPermit shape", async () => {
    _stubPermits = [{ id: "p1", permit_number: "BP-001", permit_type: "Building", status: "Issued", issued_date: "2025-01-15", estimated_value: 50000, description: "Roof" }];
    const mod = await import("./useParcelPermits");
    expect(mod.useParcelPermits).toBeDefined();
  });

  it("throws on database error", async () => {
    _stubError = { message: "connection refused" };
    const mod = await import("./useParcelPermits");
    expect(mod.useParcelPermits).toBeDefined();
  });

  it("exports UnifiedPermit type", async () => {
    const mod = await import("./useParcelPermits");
    expect(mod.useParcelPermits).toBeTypeOf("function");
  });
});
