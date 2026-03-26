// TerraFusion OS — usePipelineStatus Hook Tests (Phase 218)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRpcResult = {
  data: {
    stages: [
      { stage: "ingest_received", status: "success", started_at: "2026-03-25T10:00:00Z", finished_at: "2026-03-25T10:01:00Z", rows_affected: 500, artifact_ref: null, error_id: null, duration_seconds: 60, details: {} },
      { stage: "quality_scored", status: "success", started_at: "2026-03-25T10:01:00Z", finished_at: "2026-03-25T10:02:00Z", rows_affected: 500, artifact_ref: null, error_id: null, duration_seconds: 60, details: {} },
    ],
    overall: "healthy",
    last_success: "2026-03-25T10:02:00Z",
    total_rows: 500,
    as_of: "2026-03-25T10:02:00Z",
  },
  error: null,
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve(mockRpcResult)),
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

vi.mock("@/hooks/useActiveCounty", () => ({
  useActiveCountyId: () => "test-county-id",
}));

import { usePipelineStatus, STAGE_ORDER } from "./usePipelineStatus";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("usePipelineStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports usePipelineStatus as a function", () => {
    expect(usePipelineStatus).toBeTypeOf("function");
  });

  it("calls get_pipeline_status RPC with county_id", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { result } = renderHook(() => usePipelineStatus(), { wrapper });
    await waitFor(() => !result.current.isLoading, { timeout: 3000 });
    expect(supabase.rpc).toHaveBeenCalledWith("get_pipeline_status", {
      p_county_id: "test-county-id",
    });
  });

  it("returns typed PipelineStatusResult shape", async () => {
    const { result } = renderHook(() => usePipelineStatus(), { wrapper });
    await waitFor(() => result.current.data !== undefined, { timeout: 3000 });
    expect(result.current.data).toEqual(
      expect.objectContaining({
        overall: expect.any(String),
        stages: expect.any(Array),
        total_rows: expect.any(Number),
      })
    );
  });

  it("exports STAGE_ORDER with all 6 pipeline stages", () => {
    expect(STAGE_ORDER).toHaveLength(6);
    expect(STAGE_ORDER[0]).toBe("ingest_received");
    expect(STAGE_ORDER[5]).toBe("readiness_updated");
  });
});
