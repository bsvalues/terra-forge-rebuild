// TerraFusion OS — Sync Engine Tests (Delta Detection + Workflow Runners)

import { describe, it, expect, vi } from "vitest";
import { detectDeltas, runBulkImport } from "./syncEngine";

describe("detectDeltas", () => {
  it("detects inserts (in source, not in target)", () => {
    const source = [{ id: "1", name: "A" }, { id: "2", name: "B" }];
    const target = [{ id: "1", name: "A" }];

    const result = detectDeltas(source, target, "id", "parcels");

    expect(result.inserts).toHaveLength(1);
    expect(result.inserts[0].id).toBe("2");
    expect(result.updates).toHaveLength(0);
    expect(result.deletes).toHaveLength(0);
  });

  it("detects updates (same key, different fields)", () => {
    const source = [{ id: "1", name: "Updated" }];
    const target = [{ id: "1", name: "Original" }];

    const result = detectDeltas(source, target, "id", "parcels");

    expect(result.updates).toHaveLength(1);
    expect(result.updates[0].changedFields).toContain("name");
  });

  it("detects deletes (in target, not in source)", () => {
    const source = [{ id: "1", name: "A" }];
    const target = [{ id: "1", name: "A" }, { id: "2", name: "B" }];

    const result = detectDeltas(source, target, "id", "parcels");

    expect(result.deletes).toHaveLength(1);
    expect(result.deletes[0].id).toBe("2");
  });

  it("returns zero changes when records match", () => {
    const records = [{ id: "1", name: "A" }];

    const result = detectDeltas(records, records, "id", "parcels");

    expect(result.totalChanges).toBe(0);
  });

  it("handles empty source and target", () => {
    const result = detectDeltas([], [], "id", "parcels");
    expect(result.totalChanges).toBe(0);
  });

  it("respects compareFields filter", () => {
    const source = [{ id: "1", name: "Same", extra: "changed" }];
    const target = [{ id: "1", name: "Same", extra: "original" }];

    // Only compare "name" — should find no updates
    const result = detectDeltas(source, target, "id", "parcels", ["name"]);
    expect(result.updates).toHaveLength(0);

    // Compare "extra" — should find update
    const result2 = detectDeltas(source, target, "id", "parcels", ["extra"]);
    expect(result2.updates).toHaveLength(1);
  });
});

describe("runBulkImport", () => {
  it("completes a full import pipeline", async () => {
    const records = [{ parcel_number: "001", address: "123 Main" }];
    const validateFn = (r: Record<string, unknown>[]) => ({ valid: r, errors: [] as string[] });
    const importFn = async (r: Record<string, unknown>[]) => ({ imported: r.length, errors: [] as string[] });

    const result = await runBulkImport(records, "parcels", validateFn, importFn);

    expect(result.status).toBe("completed");
    expect(result.context.importedCount).toBe(1);
    expect(result.context.integrityCheck).toBe("pass");
  });

  it("fails and compensates when all records invalid", async () => {
    const records = [{ bad: true }];
    const validateFn = () => ({ valid: [] as Record<string, unknown>[], errors: ["invalid"] });
    const importFn = async () => ({ imported: 0, errors: [] as string[] });

    const result = await runBulkImport(records, "parcels", validateFn, importFn);

    expect(result.status).toBe("compensated");
    expect(result.error).toContain("failed validation");
  });

  it("fails on empty records", async () => {
    const validateFn = (r: Record<string, unknown>[]) => ({ valid: r, errors: [] as string[] });
    const importFn = async (r: Record<string, unknown>[]) => ({ imported: r.length, errors: [] as string[] });

    const result = await runBulkImport([], "parcels", validateFn, importFn);

    expect(result.status).toBe("compensated");
    expect(result.error).toContain("No records");
  });
});
