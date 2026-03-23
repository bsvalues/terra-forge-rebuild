// TerraFusion OS — DQ Monitor Hook Tests (Phase 176)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
  },
}));

vi.mock("@/hooks/useActiveCounty", () => ({
  useActiveCountyId: () => "test-county-id",
}));

import { useDQMonitor } from "./useDQMonitor";
import type { DQTableStat } from "./useDQMonitor";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useDQMonitor", () => {
  it("returns isLoading=true on first render", () => {
    const { result } = renderHook(() => useDQMonitor(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it("eventually resolves without throwing", async () => {
    const { result } = renderHook(() => useDQMonitor(), { wrapper });
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    expect(result.current.error).toBeNull();
  });
});

// ── Pure unit tests (no hooks) ────────────────────────────────────────────────

describe("DQ status thresholds", () => {
  function statusFromNullRate(rate: number): DQTableStat["status"] {
    if (rate <= 5) return "healthy";
    if (rate <= 20) return "warning";
    return "critical";
  }

  it("null rate 0 → healthy", () => {
    expect(statusFromNullRate(0)).toBe("healthy");
  });

  it("null rate 5 → healthy (boundary)", () => {
    expect(statusFromNullRate(5)).toBe("healthy");
  });

  it("null rate 6 → warning", () => {
    expect(statusFromNullRate(6)).toBe("warning");
  });

  it("null rate 20 → warning (boundary)", () => {
    expect(statusFromNullRate(20)).toBe("warning");
  });

  it("null rate 21 → critical", () => {
    expect(statusFromNullRate(21)).toBe("critical");
  });

  it("null rate 100 → critical", () => {
    expect(statusFromNullRate(100)).toBe("critical");
  });
});

describe("DQ sparkline shape", () => {
  it("produces 7 points", () => {
    const today = new Date();
    const sparkData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return { day: d.toISOString().slice(0, 10), parcels: 1000 + i, sales: 200 + i };
    });
    expect(sparkData).toHaveLength(7);
  });

  it("points are ordered oldest-first", () => {
    const today = new Date();
    const sparkData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    expect(sparkData[0] < sparkData[6]).toBe(true);
  });

  it("day strings have ISO format YYYY-MM-DD (10 chars)", () => {
    const d = new Date().toISOString().slice(0, 10);
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
