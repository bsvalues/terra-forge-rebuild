// TerraFusion OS — IAAO Compliance Hook
// Aggregates per-neighborhood ratio statistics and grades them against IAAO standards.
// Agent Librarian: "My COD is within spec but my brain is out of bounds" 🎯📊

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  overallScore: number; // 0-100
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

export function useIAAOCompliance(taxYear?: number) {
  const year = taxYear || new Date().getFullYear();
  const salesStart = new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const salesEnd = new Date().toISOString().split("T")[0];

  return useQuery<IAAOComplianceSummary>({
    queryKey: ["iaao-compliance", year, salesStart, salesEnd],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Get unique neighborhood codes
      const { data: parcels, error: pErr } = await supabase
        .from("parcels")
        .select("neighborhood_code")
        .not("neighborhood_code", "is", null);

      if (pErr) throw pErr;

      const codes = [...new Set(parcels?.map((p) => p.neighborhood_code).filter(Boolean) || [])];

      // Compute stats for each neighborhood (cap at 30)
      const results = await Promise.all(
        codes.slice(0, 30).map(async (code) => {
          const { data, error } = await (supabase.rpc as Function)("compute_ratio_statistics", {
            p_tax_year: year,
            p_sales_start_date: salesStart,
            p_sales_end_date: salesEnd,
            p_neighborhood_code: code,
            p_outlier_method: "iqr",
          });
          if (error) return null;
          const stats = Array.isArray(data) ? data[0] : data;
          if (!stats || !stats.sample_size || stats.sample_size < 3) return null;

          const n: NeighborhoodCompliance = {
            neighborhood_code: code!,
            sample_size: stats.sample_size,
            median_ratio: stats.median_ratio,
            mean_ratio: stats.mean_ratio,
            cod: stats.cod,
            prd: stats.prd,
            prb: stats.prb,
            cod_grade: gradeCOD(stats.cod),
            prd_grade: gradePRD(stats.prd),
            prb_grade: gradePRB(stats.prb),
            median_grade: gradeMedian(stats.median_ratio),
            overall_grade: "pass", // placeholder
          };
          n.overall_grade = overallGrade(n);
          return n;
        })
      );

      const neighborhoods = results.filter(Boolean) as NeighborhoodCompliance[];

      // County-wide stats
      const { data: countyData } = await (supabase.rpc as Function)("compute_ratio_statistics", {
        p_tax_year: year,
        p_sales_start_date: salesStart,
        p_sales_end_date: salesEnd,
        p_neighborhood_code: null,
        p_outlier_method: "iqr",
      });
      const countyStats = Array.isArray(countyData) ? countyData[0] : countyData;

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
        overallScore: total > 0 ? Math.round(((passingCount + marginalCount * 0.5) / total) * 100) : 0,
        countyMedianRatio: countyStats?.median_ratio ?? null,
        countyCOD: countyStats?.cod ?? null,
        countyPRD: countyStats?.prd ?? null,
        countyPRB: countyStats?.prb ?? null,
      };
    },
  });
}
