// TerraFusion OS — Phase 89: IAAO Ratio Study Hook
// Computes IAAO-compliant statistics from assessment_ratios table.
// Query Key: ["ratio-study", studyPeriodId] • Stale: 30s

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RatioStudyStats {
  totalRatios: number;
  medianRatio: number;
  meanRatio: number;
  cod: number; // Coefficient of Dispersion
  prd: number; // Price-Related Differential
  prb: number; // Price-Related Bias (simplified)
  minRatio: number;
  maxRatio: number;
  outlierCount: number;
  ratiosByTier: Record<string, { count: number; median: number; cod: number }>;
}

function computeMedian(sorted: number[]): number {
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeStats(ratios: number[]): { median: number; mean: number; cod: number } {
  if (!ratios.length) return { median: 0, mean: 0, cod: 0 };
  const sorted = [...ratios].sort((a, b) => a - b);
  const median = computeMedian(sorted);
  const mean = ratios.reduce((s, r) => s + r, 0) / ratios.length;
  const avgAbsDev = ratios.reduce((s, r) => s + Math.abs(r - median), 0) / ratios.length;
  const cod = median > 0 ? (avgAbsDev / median) * 100 : 0;
  return { median, mean, cod };
}

export function useRatioStudy(studyPeriodId?: string) {
  return useQuery<RatioStudyStats | null>({
    queryKey: ["ratio-study", studyPeriodId],
    queryFn: async () => {
      if (!studyPeriodId) return null;

      const { data, error } = await supabase
        .from("assessment_ratios")
        .select("ratio, sale_price, assessed_value, is_outlier, value_tier")
        .eq("study_period_id", studyPeriodId)
        .not("ratio", "is", null);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const allRatios = data.map((d) => d.ratio as number);
      const validRatios = data.filter((d) => !d.is_outlier).map((d) => d.ratio as number);

      const { median, mean, cod } = computeStats(validRatios);

      // PRD = mean ratio / weighted mean ratio
      const totalAssessed = data.reduce((s, d) => s + (d.assessed_value ?? 0), 0);
      const totalSalePrice = data.reduce((s, d) => s + (d.sale_price ?? 0), 0);
      const weightedMean = totalSalePrice > 0 ? totalAssessed / totalSalePrice : 0;
      const prd = weightedMean > 0 ? mean / weightedMean : 1;

      // Simplified PRB (sign of regression coefficient of ln(value) on ratio)
      const prb = prd > 1.03 ? -1 : prd < 0.98 ? 1 : 0;

      // By value tier
      const tiers: Record<string, number[]> = {};
      data.filter((d) => !d.is_outlier).forEach((d) => {
        const tier = d.value_tier || "unknown";
        (tiers[tier] ??= []).push(d.ratio as number);
      });
      const ratiosByTier: Record<string, { count: number; median: number; cod: number }> = {};
      for (const [tier, vals] of Object.entries(tiers)) {
        const stats = computeStats(vals);
        ratiosByTier[tier] = { count: vals.length, median: stats.median, cod: stats.cod };
      }

      const sorted = [...allRatios].sort((a, b) => a - b);

      return {
        totalRatios: data.length,
        medianRatio: median,
        meanRatio: mean,
        cod,
        prd,
        prb,
        minRatio: sorted[0] ?? 0,
        maxRatio: sorted[sorted.length - 1] ?? 0,
        outlierCount: data.filter((d) => d.is_outlier).length,
        ratiosByTier,
      };
    },
    enabled: !!studyPeriodId,
    staleTime: 30_000,
  });
}
