// TerraFusion OS — Neighborhood Factor Calibration Tests (Phase 178)

import { describe, it, expect } from "vitest";
import { calcCalibrationStats } from "./NeighborhoodFactorCalibration";

// ── Sample data ───────────────────────────────────────────────────────────────

const SALES_IAAO_COMPLIANT = [
  { salePrice: 320000, assessedValue: 310000 },
  { salePrice: 280000, assessedValue: 275000 },
  { salePrice: 350000, assessedValue: 345000 },
  { salePrice: 300000, assessedValue: 295000 },
  { salePrice: 290000, assessedValue: 285000 },
];

const SALES_HIGH_COD = [
  { salePrice: 100000, assessedValue: 50000 },
  { salePrice: 100000, assessedValue: 150000 },
  { salePrice: 100000, assessedValue: 200000 },
];

// ── calcCalibrationStats ──────────────────────────────────────────────────────

describe("calcCalibrationStats", () => {
  it("returns null for fewer than 3 sales", () => {
    expect(calcCalibrationStats([])).toBeNull();
    expect(calcCalibrationStats([{ salePrice: 300000, assessedValue: 290000 }])).toBeNull();
    expect(calcCalibrationStats([
      { salePrice: 300000, assessedValue: 290000 },
      { salePrice: 310000, assessedValue: 305000 },
    ])).toBeNull();
  });

  it("returns null when sale prices are 0", () => {
    const zero = [
      { salePrice: 0, assessedValue: 100000 },
      { salePrice: 0, assessedValue: 200000 },
      { salePrice: 0, assessedValue: 150000 },
    ];
    expect(calcCalibrationStats(zero)).toBeNull();
  });

  it("calculates n correctly", () => {
    const result = calcCalibrationStats(SALES_IAAO_COMPLIANT);
    expect(result!.n).toBe(5);
  });

  it("median ratio is near 1.0 for well-assessed properties", () => {
    const result = calcCalibrationStats(SALES_IAAO_COMPLIANT);
    expect(result!.medianRatio).toBeGreaterThan(0.95);
    expect(result!.medianRatio).toBeLessThan(1.05);
  });

  it("COD is low for well-calibrated data (IAAO ≤10%)", () => {
    const result = calcCalibrationStats(SALES_IAAO_COMPLIANT);
    expect(result!.cod).toBeLessThan(10);
  });

  it("COD is high for dispersed data", () => {
    const result = calcCalibrationStats(SALES_HIGH_COD);
    expect(result!.cod).toBeGreaterThan(20);
  });

  it("PRD is near 1.0 for uniform assessment", () => {
    const uniform = [
      { salePrice: 300000, assessedValue: 300000 },
      { salePrice: 300000, assessedValue: 300000 },
      { salePrice: 300000, assessedValue: 300000 },
    ];
    const result = calcCalibrationStats(uniform);
    expect(result!.prd).toBeCloseTo(1.0, 2);
  });

  it("meanRatio equals medianRatio for symmetric uniform data", () => {
    const symmetric = [
      { salePrice: 100000, assessedValue: 95000 },
      { salePrice: 100000, assessedValue: 100000 },
      { salePrice: 100000, assessedValue: 105000 },
    ];
    const result = calcCalibrationStats(symmetric);
    expect(result!.meanRatio).toBeCloseTo(result!.medianRatio, 1);
  });
});

// ── Status thresholds ─────────────────────────────────────────────────────────

describe("COD status thresholds", () => {
  function codStatus(cod: number): "healthy" | "warning" | "critical" {
    if (cod <= 10) return "healthy";
    if (cod <= 15) return "warning";
    return "critical";
  }

  it("10.0 → healthy (boundary)", () => expect(codStatus(10)).toBe("healthy"));
  it("10.1 → warning", () => expect(codStatus(10.1)).toBe("warning"));
  it("15.0 → warning (boundary)", () => expect(codStatus(15)).toBe("warning"));
  it("15.1 → critical", () => expect(codStatus(15.1)).toBe("critical"));
});

describe("PRD status thresholds", () => {
  function prdStatus(prd: number): "healthy" | "warning" | "critical" {
    if (prd >= 0.98 && prd <= 1.03) return "healthy";
    if (prd >= 0.95 && prd <= 1.05) return "warning";
    return "critical";
  }

  it("1.0 → healthy", () => expect(prdStatus(1.0)).toBe("healthy"));
  it("0.98 → healthy (lower bound)", () => expect(prdStatus(0.98)).toBe("healthy"));
  it("1.03 → healthy (upper bound)", () => expect(prdStatus(1.03)).toBe("healthy"));
  it("0.97 → warning", () => expect(prdStatus(0.97)).toBe("warning"));
  it("0.94 → critical", () => expect(prdStatus(0.94)).toBe("critical"));
  it("1.06 → critical", () => expect(prdStatus(1.06)).toBe("critical"));
});
