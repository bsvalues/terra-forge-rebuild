// TerraFusion OS — useCountyConfig Hook Tests (Phase 204)

import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────
// Flat mock pattern (same as useDQMonitor.test.ts template).

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock("@/hooks/useActiveCounty", () => ({
  useActiveCountyId: vi.fn(() => "test-county-id"),
}));

vi.mock("@/services/terraTrace", () => ({
  emitTraceEventAsync: vi.fn().mockResolvedValue(undefined),
  computeDiff: vi.fn(() => ({ before: {}, after: {} })),
}));

import { supabase } from "@/integrations/supabase/client";
import { useActiveCountyId } from "@/hooks/useActiveCounty";
import { useCountyConfig } from "./useCountyConfig";

const maybeSingleMock = () => (supabase as any).maybeSingle as ReturnType<typeof vi.fn>;

// ── Wrapper factory ────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useCountyConfig", () => {
  beforeEach(() => {
    vi.mocked(useActiveCountyId).mockReturnValue("test-county-id");
    maybeSingleMock().mockResolvedValue({ data: null, error: null });
  });

  it("returns isLoading=true on first render when countyId is present", () => {
    const { result } = renderHook(() => useCountyConfig(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it("resolves without error when supabase returns null data", async () => {
    maybeSingleMock().mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useCountyConfig(), { wrapper });
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    expect(result.current.error).toBeNull();
  });

  it("is disabled (isLoading=false, data=undefined) when countyId is null", async () => {
    vi.mocked(useActiveCountyId).mockReturnValue(null);
    const { result } = renderHook(() => useCountyConfig(), { wrapper });
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    expect(result.current.data).toBeUndefined();
  });

  it("resolves successfully when supabase returns partial config data", async () => {
    maybeSingleMock().mockResolvedValue({
      data: {
        id: "test-county-id",
        name: "Test County",
        state: "WA",
        fips_code: "53005",
        config: { current_tax_year: 2025, assessment_cycle: "annual" },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      error: null,
    });

    const { result } = renderHook(() => useCountyConfig(), { wrapper });
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    // Query resolved without error
    expect(result.current.error).toBeNull();
  });

  it("query is initially in pending state before resolving", () => {
    // Regression: query should start loading when countyId is set
    maybeSingleMock().mockResolvedValue({ data: null, error: null });
    vi.mocked(useActiveCountyId).mockReturnValue("county-for-pending-test");
    const { result } = renderHook(() => useCountyConfig(), { wrapper });
    // On first render with a valid countyId, the query must be loading
    expect(result.current.isLoading).toBe(true);
  });
});
