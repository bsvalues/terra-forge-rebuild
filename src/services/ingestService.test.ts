// TerraFusion OS — ingestService Tests (Phase 204)

import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockUpsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
      upsert: mockUpsert,
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      or: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ error: null }),
    storage: {
      from: vi.fn(() => ({
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

import { batchInsertParcels, upsertParcels } from "./ingestService";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("batchInsertParcels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("returns { success: 0, failed: 0 } for empty array", async () => {
    const result = await batchInsertParcels([]);
    expect(result).toEqual({ success: 0, failed: 0 });
  });

  it("returns { success: 1, failed: 0 } for single record", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    const result = await batchInsertParcels([{ parcel_number: "R-001" }]);
    expect(result).toEqual({ success: 1, failed: 0 });
  });

  it("returns { success: 0, failed: 1 } when supabase returns an error", async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: "DB error", code: "23505" } });
    const result = await batchInsertParcels([{ parcel_number: "R-001" }]);
    expect(result).toEqual({ success: 0, failed: 1 });
  });

  it("calls insert the correct number of times for batching with batchSize=2 and 5 records", async () => {
    const records = Array.from({ length: 5 }, (_, i) => ({ parcel_number: `R-00${i}` }));
    await batchInsertParcels(records, 2);
    // 5 records / batchSize 2 = 3 batches: [0-1], [2-3], [4]
    expect(mockInsert).toHaveBeenCalledTimes(3);
  });

  it("calls onProgress callback when provided", async () => {
    const onProgress = vi.fn();
    await batchInsertParcels([{ parcel_number: "R-001" }], 50, onProgress);
    expect(onProgress).toHaveBeenCalled();
  });

  it("counts failed records correctly when partial batch errors", async () => {
    const records = Array.from({ length: 4 }, (_, i) => ({ parcel_number: `R-00${i}` }));
    // First batch succeeds, second fails
    mockInsert
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "constraint violation" } });

    const result = await batchInsertParcels(records, 2);
    expect(result.success).toBe(2);
    expect(result.failed).toBe(2);
  });
});

describe("upsertParcels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("returns { imported: 1, failed: 0 } for single record", async () => {
    mockUpsert.mockResolvedValueOnce({ error: null });
    const result = await upsertParcels([{ parcel_number: "R-001" }]);
    expect(result).toEqual({ imported: 1, failed: 0 });
  });

  it("returns { imported: 0, failed: 1 } when supabase returns an error", async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: "upsert failed" } });
    const result = await upsertParcels([{ parcel_number: "R-001" }]);
    expect(result).toEqual({ imported: 0, failed: 1 });
  });

  it("returns { imported: 0, failed: 0 } for empty array", async () => {
    const result = await upsertParcels([]);
    expect(result).toEqual({ imported: 0, failed: 0 });
  });
});
