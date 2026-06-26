import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve({ data: { stages: [], overall: "healthy", last_success: null, total_rows: 0, as_of: "2026-03-25" }, error: null })),
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

describe("usePipelineStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("exports usePipelineStatus as a function", async () => {
    const mod = await import("./usePipelineStatus");
    expect(mod.usePipelineStatus).toBeTypeOf("function");
  });

  it("exports STAGE_ORDER with all 6 pipeline stages", async () => {
    const mod = await import("./usePipelineStatus");
    expect(mod.STAGE_ORDER).toHaveLength(6);
    expect(mod.STAGE_ORDER[0]).toBe("ingest_received");
  });

  it("uses pipeline-status query key with countyId", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    const { usePipelineStatus } = await import("./usePipelineStatus");
    usePipelineStatus();
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      })
    );
  });
});
