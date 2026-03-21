// Phase 99 — Hooks Contract Tests: verify critical hooks export correct shapes
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before any hook imports
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "" } }),
      })),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  },
}));

// Mock react-query
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isLoading: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

describe("Write-Lane Contract", () => {
  it("WRITE_LANE_MATRIX has 22 domains", async () => {
    const { WRITE_LANE_MATRIX } = await import("@/services/writeLane");
    expect(Object.keys(WRITE_LANE_MATRIX)).toHaveLength(22);
  });

  it("every domain maps to a valid owner", async () => {
    const { WRITE_LANE_MATRIX } = await import("@/services/writeLane");
    const validOwners = ["forge", "atlas", "dais", "dossier", "os", "pilot"];
    for (const [domain, owner] of Object.entries(WRITE_LANE_MATRIX)) {
      expect(validOwners).toContain(owner);
    }
  });

  it("resolveWriteLane returns forge for valuations", async () => {
    const { resolveWriteLane } = await import("@/services/writeLane");
    expect(resolveWriteLane("valuations")).toBe("forge");
  });

  it("resolveWriteLane returns dais for appeals", async () => {
    const { resolveWriteLane } = await import("@/services/writeLane");
    expect(resolveWriteLane("appeals")).toBe("dais");
  });

  it("resolveWriteLane returns atlas for gis_layers", async () => {
    const { resolveWriteLane } = await import("@/services/writeLane");
    expect(resolveWriteLane("gis_layers")).toBe("atlas");
  });
});

describe("Workbench SuiteTab Contract", () => {
  it("SuiteTab includes all 7 tabs", async () => {
    const { SUITE_CONFIGS } = await import("@/components/workbench/types");
    const tabs = Object.keys(SUITE_CONFIGS);
    expect(tabs).toContain("summary");
    expect(tabs).toContain("forge");
    expect(tabs).toContain("atlas");
    expect(tabs).toContain("dais");
    expect(tabs).toContain("dossier");
    expect(tabs).toContain("pilot");
    expect(tabs).toContain("sketch");
    expect(tabs).toHaveLength(7);
  });
});

describe("TerraTrace computeDiff Contract", () => {
  it("detects changed fields", async () => {
    const { computeDiff } = await import("@/services/terraTrace");
    const result = computeDiff(
      { land: 100000, improvement: 50000 },
      { land: 105000, improvement: 50000 },
    );
    expect(result.before).toHaveProperty("land");
    expect(result.after).toHaveProperty("land");
    expect(result.before).not.toHaveProperty("improvement");
  });

  it("returns empty diffs for identical objects", async () => {
    const { computeDiff } = await import("@/services/terraTrace");
    const result = computeDiff({ a: 1, b: 2 }, { a: 1, b: 2 });
    expect(Object.keys(result.before)).toHaveLength(0);
    expect(Object.keys(result.after)).toHaveLength(0);
  });
});
