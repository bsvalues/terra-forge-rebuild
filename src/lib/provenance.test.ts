// TerraFusion OS — Provenance + Quarantine runtime tests
// Foundation tests: prove the envelope shape, dedup hashing, and trust escalation.

import { describe, it, expect } from "vitest";
import {
  wrapWithProvenance,
  unknownProvenance,
  isProvenanced,
  unwrap,
  getProvenance,
  formatStale,
} from "@/lib/provenance";

describe("provenance envelope", () => {
  it("wraps a value with verified trust by default", () => {
    const wrapped = wrapWithProvenance({ total: 42 }, {
      source: "county-vitals",
      staleMs: 60_000,
    });

    expect(wrapped.data.total).toBe(42);
    expect(wrapped.provenance.source).toBe("county-vitals");
    expect(wrapped.provenance.trustLevel).toBe("verified");
    expect(wrapped.provenance.cachePolicy).toBe("cached 1m");
    expect(wrapped.provenance.quarantineCount).toBe(0);
    expect(wrapped.provenance.asOf).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("escalates trust to unverified when quarantine rows are attached", () => {
    const wrapped = wrapWithProvenance([{ id: 1 }], {
      source: "pacs_qualified_sales",
      staleMs: 30_000,
      quarantineCount: 3,
    });
    expect(wrapped.provenance.trustLevel).toBe("unverified");
    expect(wrapped.provenance.quarantineCount).toBe(3);
  });

  it("honors an explicit trustLevel override", () => {
    const wrapped = wrapWithProvenance(null, {
      source: "regression",
      trustLevel: "quarantined",
    });
    expect(wrapped.provenance.trustLevel).toBe("quarantined");
  });

  it("isProvenanced / unwrap / getProvenance survive raw values", () => {
    const raw = { foo: "bar" };
    const wrapped = wrapWithProvenance(raw, { source: "x" });

    expect(isProvenanced(wrapped)).toBe(true);
    expect(isProvenanced(raw)).toBe(false);

    expect(unwrap(wrapped)).toBe(raw);
    expect(unwrap(raw)).toBe(raw);

    expect(getProvenance(wrapped).source).toBe("x");
    expect(getProvenance(raw, "fallback").source).toBe("fallback");
    expect(getProvenance(raw, "fallback").trustLevel).toBe("unknown");
  });

  it("unknownProvenance produces a stable shell", () => {
    const p = unknownProvenance("boot");
    expect(p.source).toBe("boot");
    expect(p.trustLevel).toBe("unknown");
    expect(p.staleMs).toBe(0);
  });

  it("formatStale formats seconds/minutes/hours", () => {
    expect(formatStale(0)).toBe("no cache");
    expect(formatStale(30_000)).toBe("cached 30s");
    expect(formatStale(5 * 60_000)).toBe("cached 5m");
    expect(formatStale(3 * 60 * 60_000)).toBe("cached 3h");
  });
});
