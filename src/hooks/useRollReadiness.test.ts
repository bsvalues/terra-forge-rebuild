// TerraFusion OS — Roll Readiness Hook Tests (Phase 179)

import { describe, it, expect } from "vitest";
import type { ReadinessCheck } from "../useRollReadiness";

// ── Pure unit tests — no DB calls ────────────────────────────────────────────

function gradeFromIndex(i: number): "ready" | "partial" | "at_risk" {
  if (i >= 80) return "ready";
  if (i >= 50) return "partial";
  return "at_risk";
}

function verdictFromScore(score: number): "GO" | "CAUTION" | "NO_GO" {
  if (score >= 90) return "GO";
  if (score >= 60) return "CAUTION";
  return "NO_GO";
}

function weightedScore(checks: ReadinessCheck[]): number {
  let total = 0;
  for (const c of checks) {
    if (c.status === "pass") total += c.weight;
    else if (c.status === "warn") total += c.weight * 0.5;
  }
  return Math.round(total);
}

describe("gradeFromIndex", () => {
  it("80 → ready", () => expect(gradeFromIndex(80)).toBe("ready"));
  it("79 → partial", () => expect(gradeFromIndex(79)).toBe("partial"));
  it("50 → partial", () => expect(gradeFromIndex(50)).toBe("partial"));
  it("49 → at_risk", () => expect(gradeFromIndex(49)).toBe("at_risk"));
  it("0 → at_risk", () => expect(gradeFromIndex(0)).toBe("at_risk"));
  it("100 → ready", () => expect(gradeFromIndex(100)).toBe("ready"));
});

describe("verdictFromScore", () => {
  it("100 → GO", () => expect(verdictFromScore(100)).toBe("GO"));
  it("90 → GO (boundary)", () => expect(verdictFromScore(90)).toBe("GO"));
  it("89 → CAUTION", () => expect(verdictFromScore(89)).toBe("CAUTION"));
  it("60 → CAUTION (boundary)", () => expect(verdictFromScore(60)).toBe("CAUTION"));
  it("59 → NO_GO", () => expect(verdictFromScore(59)).toBe("NO_GO"));
  it("0 → NO_GO", () => expect(verdictFromScore(0)).toBe("NO_GO"));
});

describe("weightedScore calculation", () => {
  it("all-pass returns sum of weights", () => {
    const checks: ReadinessCheck[] = [
      { id: "a", label: "A", description: "", status: "pass", metric: "100%", weight: 30 },
      { id: "b", label: "B", description: "", status: "pass", metric: "100%", weight: 70 },
    ];
    expect(weightedScore(checks)).toBe(100);
  });

  it("warn contributes 50% of weight", () => {
    const checks: ReadinessCheck[] = [
      { id: "a", label: "A", description: "", status: "warn", metric: "75%", weight: 40 },
    ];
    expect(weightedScore(checks)).toBe(20);
  });

  it("fail contributes 0", () => {
    const checks: ReadinessCheck[] = [
      { id: "a", label: "A", description: "", status: "fail", metric: "0%", weight: 50 },
    ];
    expect(weightedScore(checks)).toBe(0);
  });

  it("mixed pass/warn/fail sums correctly", () => {
    const checks: ReadinessCheck[] = [
      { id: "a", label: "A", description: "", status: "pass", metric: "", weight: 30 },
      { id: "b", label: "B", description: "", status: "warn", metric: "", weight: 20 },
      { id: "c", label: "C", description: "", status: "fail", metric: "", weight: 50 },
    ];
    // 30 + 10 + 0 = 40
    expect(weightedScore(checks)).toBe(40);
  });
});
