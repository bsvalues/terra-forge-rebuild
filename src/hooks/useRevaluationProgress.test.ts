import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve({ data: { cycle_id: "cycle-001", total_parcels: 12000, neighborhoods: [] }, error: null })),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/services/terraTrace", () => ({
  emitTraceEventAsync: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((opts: { queryKey: string[]; queryFn: () => Promise<unknown>; enabled?: boolean }) => {
    return { data: undefined, isLoading: false, error: null, fetchStatus: opts.enabled === false ? "idle" : "fetching" };
  }),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isLoading: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

describe("useRevaluationProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("exports useRevaluationProgress as a function", async () => {
    const mod = await import("./useRevaluationProgress");
    expect(mod.useRevaluationProgress).toBeTypeOf("function");
  });

  it("uses revaluation-progress query key with cycleId", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    const { useRevaluationProgress } = await import("./useRevaluationProgress");
    useRevaluationProgress("cycle-001");
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["revaluation-progress", "cycle-001"],
        enabled: true,
      })
    );
  });

  it("is disabled when cycleId is null", async () => {
    const { useQuery } = await import("@tanstack/react-query");
    const { useRevaluationProgress } = await import("./useRevaluationProgress");
    useRevaluationProgress(null);
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });
});
