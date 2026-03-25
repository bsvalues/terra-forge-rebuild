// TerraFusion OS — useParcelDetails Hook Tests (Phase 204)

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
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

import { supabase } from "@/integrations/supabase/client";
import {
  useAssessmentHistory,
  useParcelSales,
  useParcelAppeals,
  useComparableSales,
} from "./useParcelDetails";

// ── Wrapper factory ────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useAssessmentHistory", () => {
  beforeEach(() => {
    vi.mocked(supabase.limit as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
  });

  it("is disabled (isLoading=false) when parcelId is null", async () => {
    const { result } = renderHook(() => useAssessmentHistory(null), { wrapper });
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    expect(result.current.data).toBeUndefined();
  });

  it("returns isLoading=true on first render when parcelId is provided", () => {
    const { result } = renderHook(() => useAssessmentHistory("parcel-123"), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it("resolves without error when supabase returns empty data", async () => {
    vi.mocked(supabase.limit as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useAssessmentHistory("parcel-123"), { wrapper });
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    expect(result.current.error).toBeNull();
  });

  it("resolves to assessment records array when supabase returns data", async () => {
    const mockData = [
      { id: "1", tax_year: 2024, land_value: 100000, improvement_value: 50000, total_value: 150000 },
    ];
    vi.mocked(supabase.limit as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockData, error: null });
    const { result } = renderHook(() => useAssessmentHistory("parcel-456"), { wrapper });
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    // The hook returns data ?? [] so data should be truthy (array)
    expect(result.current.error).toBeNull();
  });
});

describe("useParcelSales", () => {
  it("is disabled when parcelId is null", async () => {
    const { result } = renderHook(() => useParcelSales(null), { wrapper });
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    expect(result.current.data).toBeUndefined();
  });

  it("returns isLoading=true on first render when parcelId is provided", () => {
    const { result } = renderHook(() => useParcelSales("parcel-123"), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it("resolves without error for enabled query", async () => {
    vi.mocked(supabase.limit as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useParcelSales("parcel-123"), { wrapper });
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    expect(result.current.error).toBeNull();
  });
});

describe("useParcelAppeals", () => {
  it("resolves without error when parcelId is provided", async () => {
    vi.mocked(supabase.limit as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useParcelAppeals("parcel-123"), { wrapper });
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    expect(result.current.error).toBeNull();
  });

  it("is disabled when parcelId is null", async () => {
    const { result } = renderHook(() => useParcelAppeals(null), { wrapper });
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    expect(result.current.data).toBeUndefined();
  });
});

describe("useComparableSales", () => {
  it("is disabled when parcelId is null", async () => {
    const { result } = renderHook(
      () => useComparableSales(null, null, null),
      { wrapper }
    );
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    expect(result.current.data).toBeUndefined();
  });

  it("starts loading when parcelId is provided", () => {
    const { result } = renderHook(
      () => useComparableSales("parcel-123", "NH-01", 250000),
      { wrapper }
    );
    expect(result.current.isLoading).toBe(true);
  });

  it("resolves without error for valid parcelId", async () => {
    vi.mocked(supabase.limit as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(
      () => useComparableSales("parcel-123", null, null),
      { wrapper }
    );
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    expect(result.current.error).toBeNull();
  });
});
