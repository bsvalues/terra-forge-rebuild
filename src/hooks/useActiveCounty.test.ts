// TerraFusion OS — useActiveCounty Hook Tests (Phase 204)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseAuthContext = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

import { useActiveCountyId, useHasActiveCounty } from "./useActiveCounty";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useActiveCountyId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the county_id when profile has one", () => {
    mockUseAuthContext.mockReturnValue({ profile: { county_id: "test-county-123" } });
    const { result } = renderHook(() => useActiveCountyId());
    expect(result.current).toBe("test-county-123");
  });

  it("returns null when profile is null", () => {
    mockUseAuthContext.mockReturnValue({ profile: null });
    const { result } = renderHook(() => useActiveCountyId());
    expect(result.current).toBeNull();
  });

  it("returns null when profile has no county_id", () => {
    mockUseAuthContext.mockReturnValue({ profile: {} });
    const { result } = renderHook(() => useActiveCountyId());
    expect(result.current).toBeNull();
  });

  it("returns the latest county_id when profile updates", () => {
    mockUseAuthContext.mockReturnValue({ profile: { county_id: "benton-wa" } });
    const { result } = renderHook(() => useActiveCountyId());
    expect(result.current).toBe("benton-wa");
  });
});

describe("useHasActiveCounty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when county_id is present", () => {
    mockUseAuthContext.mockReturnValue({ profile: { county_id: "benton-wa" } });
    const { result } = renderHook(() => useHasActiveCounty());
    expect(result.current).toBe(true);
  });

  it("returns false when profile is null", () => {
    mockUseAuthContext.mockReturnValue({ profile: null });
    const { result } = renderHook(() => useHasActiveCounty());
    expect(result.current).toBe(false);
  });

  it("returns false when county_id is empty string", () => {
    mockUseAuthContext.mockReturnValue({ profile: { county_id: "" } });
    const { result } = renderHook(() => useHasActiveCounty());
    expect(result.current).toBe(false);
  });
});
