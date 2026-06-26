// TerraFusion OS — useReadinessScore Hook Tests (Phase 204)

import { vi, describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

import { getComboLabel, getFieldLabel, useReadinessScore } from "./useReadinessScore";

// ── Wrapper factory ────────────────────────────────────────────────────────────

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

// ── Pure function tests ───────────────────────────────────────────────────────

describe("getComboLabel", () => {
  it("parses bitmask combo key 'no_coords,no_gla' into readable label", () => {
    const label = getComboLabel("no_coords,no_gla");
    expect(label).toContain("No Coords");
    expect(label).toContain("No GLA");
  });

  it("returns legacy label for known single pattern 'no_building_record'", () => {
    const label = getComboLabel("no_building_record");
    expect(label).toBe("No Building Record (missing GLA + year built)");
  });

  it("returns legacy label for 'gis_only_no_address'", () => {
    const label = getComboLabel("gis_only_no_address");
    expect(label).toBe("GIS-Only (coords but no situs address)");
  });

  it("falls back to the raw key for unknown patterns", () => {
    const label = getComboLabel("some_unknown_field");
    // Unknown parts are returned as-is (trimmed)
    expect(label).toContain("some_unknown_field");
  });

  it("handles comma-separated multiple parts", () => {
    const label = getComboLabel("no_coords,no_yr,no_nh");
    expect(label).toContain("No Coords");
    expect(label).toContain("No Year Built");
    expect(label).toContain("No Neighborhood");
  });

  it("returns empty pattern as-is", () => {
    const label = getComboLabel("");
    expect(label).toBe("");
  });
});

describe("getFieldLabel", () => {
  it("returns 'Effective Coordinates' for 'effective_coords'", () => {
    expect(getFieldLabel("effective_coords")).toBe("Effective Coordinates");
  });

  it("returns 'Building Area (GLA)' for 'building_area'", () => {
    expect(getFieldLabel("building_area")).toBe("Building Area (GLA)");
  });

  it("returns 'Year Built' for 'year_built'", () => {
    expect(getFieldLabel("year_built")).toBe("Year Built");
  });

  it("returns the key as identity fallback for unknown fields", () => {
    expect(getFieldLabel("some_unknown_field")).toBe("some_unknown_field");
  });

  it("returns 'Assessed Value' for 'assessed_value'", () => {
    expect(getFieldLabel("assessed_value")).toBe("Assessed Value");
  });
});

// ── Hook tests ────────────────────────────────────────────────────────────────

describe("useReadinessScore", () => {
  it("returns isLoading=true on first render", () => {
    const { result } = renderHook(() => useReadinessScore(), { wrapper: makeWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  it("resolves without error when RPC returns null data", async () => {
    const { result } = renderHook(() => useReadinessScore(), { wrapper: makeWrapper() });
    await waitFor(() => result.current.isLoading === false, { timeout: 3000 });
    // react-query v5 sets error to null (not undefined) when there is no error
    expect(result.current.error).toBeNull();
  });
});
