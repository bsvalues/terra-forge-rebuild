import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCountyId } from "@/hooks/useActiveCounty";
import type { RatioStatistics } from "./useRatioAnalysis";

export interface YearlyRatioStats extends RatioStatistics {
  year: number;
}

/**
 * Compute ratio statistics for multiple tax years to build trend data.
 * Queries the compute_ratio_statistics RPC for each year that has assessments.
 */
export function useHistoricalRatioTrend(
  salesStartDate: string,
  salesEndDate: string,
  yearsBack: number = 4
) {
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ["historical-ratio-trend", salesStartDate, salesEndDate, yearsBack],
    queryFn: async () => {
      // Get available tax years
      const { data: yearData, error: yearError } = await supabase
        .from("assessments")
        .select("tax_year")
        .order("tax_year", { ascending: false });

      if (yearError) throw yearError;

      const availableYears = [...new Set(yearData?.map((d) => d.tax_year) || [])]
        .sort((a, b) => b - a)
        .slice(0, yearsBack);

      if (availableYears.length === 0) return [];

      // Query ratio stats for each year in parallel
      const results = await Promise.all(
        availableYears.map(async (year) => {
          const { data, error } = await supabase.rpc("compute_ratio_statistics", {
            p_tax_year: year,
            p_sales_start_date: salesStartDate,
            p_sales_end_date: salesEndDate,
            p_outlier_method: "iqr",
          } as any);

          if (error) return null;
          const stats = Array.isArray(data) ? data[0] : data;
          if (!stats || stats.sample_size === 0) return null;

          return {
            year,
            ...stats,
          } as YearlyRatioStats;
        })
      );

      return results
        .filter((r): r is YearlyRatioStats => r !== null && r.sample_size > 0)
        .sort((a, b) => a.year - b.year);
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Compute real appeals rates by value tier.
 * Joins appeals against parcels to determine value-tier-based appeal clustering.
 */
export function useAppealsByValueTier(taxYear: number) {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["appeals-by-value-tier", countyId, taxYear],
    queryFn: async () => {
      // Get all parcels with their assessed values for tier classification
      let pq = supabase.from("parcels").select("id, assessed_value");
      if (countyId) pq = pq.eq("county_id", countyId);
      const { data: parcels, error: pError } = await pq;

      if (pError) throw pError;

      // Get appeals for this tax year
      let aq = supabase.from("appeals").select("id, parcel_id, status").eq("tax_year", taxYear);
      if (countyId) aq = aq.eq("county_id", countyId);
      const { data: appeals, error: aError } = await aq;

      if (aError) throw aError;

      // Classify parcels into tiers based on assessed value
      const classifyTier = (value: number): string => {
        if (value < 150000) return "Q1 (Low)";
        if (value < 300000) return "Q2";
        if (value < 500000) return "Q3";
        return "Q4 (High)";
      };

      // Build tier counts
      const tierCounts: Record<string, number> = {
        "Q1 (Low)": 0, "Q2": 0, "Q3": 0, "Q4 (High)": 0,
      };
      const parcelTierMap: Record<string, string> = {};

      (parcels || []).forEach((p) => {
        const tier = classifyTier(p.assessed_value);
        tierCounts[tier]++;
        parcelTierMap[p.id] = tier;
      });

      // Count appeals per tier
      const appealCounts: Record<string, number> = {
        "Q1 (Low)": 0, "Q2": 0, "Q3": 0, "Q4 (High)": 0,
      };
      (appeals || []).forEach((a) => {
        const tier = parcelTierMap[a.parcel_id] || "Q2";
        appealCounts[tier]++;
      });

      // Calculate rates
      return Object.entries(tierCounts).map(([tier, total]) => ({
        tier,
        count: appealCounts[tier] || 0,
        total,
        rate: total > 0 ? ((appealCounts[tier] || 0) / total) * 100 : 0,
      }));
    },
  });
}
