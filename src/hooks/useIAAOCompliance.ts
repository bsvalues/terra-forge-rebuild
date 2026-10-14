// TerraFusion OS — IAAO Compliance Hook
// Aggregates per-neighborhood ratio statistics and grades them against IAAO standards.
// Agent Librarian: "My COD is within spec but my brain is out of bounds" 🎯📊

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

// IAAO Standard Thresholds (residential)
export const IAAO_THRESHOLDS = {
  cod: { excellent: 10, acceptable: 15, label: "COD" },
  prd: { low: 0.98, high: 1.03, label: "PRD" },
  prb: { bound: 0.05, label: "PRB" },
  medianRatio: { low: 0.90, high: 1.10, label: "Median Ratio" },
} as const;

export type ComplianceGrade = "pass" | "marginal" | "fail";

export interface NeighborhoodCompliance {
  neighborhood_code: string;
  sample_size: number;
  median_ratio: number | null;
  mean_ratio: number | null;
  cod: number | null;
  prd: number | null;
  prb: number | null;
  cod_grade: ComplianceGrade;
  prd_grade: ComplianceGrade;
  prb_grade: ComplianceGrade;
  median_grade: ComplianceGrade;
  overall_grade: ComplianceGrade;
}

export interface IAAOComplianceSummary {
  neighborhoods: NeighborhoodCompliance[];
  totalNeighborhoods: number;
  passingCount: number;
  marginalCount: number;
  failingCount: number;
  overallScore: number | null; // 0-100; null when no neighborhood had enough sales to grade
  countyMedianRatio: number | null;
  countyCOD: number | null;
  countyPRD: number | null;
  countyPRB: number | null;
}

function gradeCOD(cod: number | null): ComplianceGrade {
  if (cod === null) return "fail";
  if (cod <= IAAO_THRESHOLDS.cod.excellent) return "pass";
  if (cod <= IAAO_THRESHOLDS.cod.acceptable) return "marginal";
  return "fail";
}

function gradePRD(prd: number | null): ComplianceGrade {
  if (prd === null) return "fail";
  if (prd >= IAAO_THRESHOLDS.prd.low && prd <= IAAO_THRESHOLDS.prd.high) return "pass";
  if (prd >= 0.95 && prd <= 1.05) return "marginal";
  return "fail";
}

function gradePRB(prb: number | null): ComplianceGrade {
  if (prb === null) return "fail";
  if (Math.abs(prb) <= IAAO_THRESHOLDS.prb.bound) return "pass";
  if (Math.abs(prb) <= 0.10) return "marginal";
  return "fail";
}

function gradeMedian(ratio: number | null): ComplianceGrade {
  if (ratio === null) return "fail";
  if (ratio >= IAAO_THRESHOLDS.medianRatio.low && ratio <= IAAO_THRESHOLDS.medianRatio.high) return "pass";
  if (ratio >= 0.85 && ratio <= 1.15) return "marginal";
  return "fail";
}

function overallGrade(n: NeighborhoodCompliance): ComplianceGrade {
  const grades = [n.cod_grade, n.prd_grade, n.prb_grade, n.median_grade];
  if (grades.every((g) => g === "pass")) return "pass";
  if (grades.some((g) => g === "fail")) return "fail";
  return "marginal";
}

/** Runs async jobs with bounded concurrency so large counties don't flood the API. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

/** Share of graded neighborhoods passing (marginal counts half); null when nothing was gradable. */
export function complianceScore(passing: number, marginal: number, total: number): number | null {
  return total > 0 ? Math.round(((passing + marginal * 0.5) / total) * 100) : null;
}

export function useIAAOCompliance(taxYear?: number) {
  const countyId = useActiveCountyId();
  const year = taxYear || new Date().getFullYear();
  const salesStart = new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const salesEnd = new Date().toISOString().split("T")[0];

  return useQuery<IAAOComplianceSummary>({
    queryKey: ["iaao-compliance", countyId, year, salesStart, salesEnd],
    enabled: !!countyId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const stats = (code: string | null) =>
        (supabase.rpc as any)("compute_ratio_statistics_county", {
          p_county_id: countyId,
          p_tax_year: year,
          p_sales_start_date: salesStart,
          p_sales_end_date: salesEnd,
          p_neighborhood_code: code,
          p_outlier_method: "iqr",
        }).abortSignal(AbortSignal.timeout(30000));

      const { data: codeRows, error: cErr } = await (supabase.rpc as any)("county_neighborhood_codes", { p_county_id: countyId })
        .abortSignal(AbortSignal.timeout(30000));
      if (cErr) throw cErr;
      const codes = ((codeRows ?? []) as { neighborhood_code: string }[]).map((r) => r.neighborhood_code);

      const results = await mapLimit(codes, 6, async (code) => {
        const { data, error } = await stats(code);
        if (error) return null;
        const st = Array.isArray(data) ? data[0] : data;
        if (!st || !st.sample_size || st.sample_size < 3) return null;
        const n: NeighborhoodCompliance = {
          neighborhood_code: code,
          sample_size: st.sample_size,
          median_ratio: st.median_ratio,
          mean_ratio: st.mean_ratio,
          cod: st.cod,
          prd: st.prd,
          prb: st.prb,
          cod_grade: gradeCOD(st.cod),
          prd_grade: gradePRD(st.prd),
          prb_grade: gradePRB(st.prb),
          median_grade: gradeMedian(st.median_ratio),
          overall_grade: "pass",
        };
        n.overall_grade = overallGrade(n);
        return n;
      });

      const neighborhoods = results.filter(Boolean) as NeighborhoodCompliance[];
      const { data: countyData, error: countyErr } = await stats(null);
      if (countyErr) throw countyErr;
      const countyStats = Array.isArray(countyData) ? countyData[0] : countyData;
      const hasCounty = !!countyStats?.sample_size;

      const passingCount = neighborhoods.filter((n) => n.overall_grade === "pass").length;
      const marginalCount = neighborhoods.filter((n) => n.overall_grade === "marginal").length;
      const failingCount = neighborhoods.filter((n) => n.overall_grade === "fail").length;
      const total = neighborhoods.length;

      return {
        neighborhoods,
        totalNeighborhoods: total,
        passingCount,
        marginalCount,
        failingCount,
        overallScore: complianceScore(passingCount, marginalCount, total),
        countyMedianRatio: hasCounty ? countyStats.median_ratio : null,
        countyCOD: hasCounty ? countyStats.cod : null,
        countyPRD: hasCounty ? countyStats.prd : null,
        countyPRB: hasCounty ? countyStats.prb : null,
      };
    },
  });
}
