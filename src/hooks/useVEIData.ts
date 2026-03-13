import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type StudyPeriod = Tables<"study_periods">;
export type AssessmentRatio = Tables<"assessment_ratios">;
export type Appeal = Tables<"appeals">;

// Fetch all study periods ordered by start date
export function useStudyPeriods() {
  return useQuery({
    queryKey: ["study-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_periods")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data as StudyPeriod[];
    },
  });
}

// Fetch active/current study period
export function useActiveStudyPeriod() {
  return useQuery({
    queryKey: ["study-periods", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_periods")
        .select("*")
        .eq("status", "active")
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as StudyPeriod | null;
    },
  });
}

// Fetch assessment ratios grouped by tier for a study period
export function useAssessmentRatiosByTier(studyPeriodId: string | undefined) {
  return useQuery({
    queryKey: ["assessment-ratios", "by-tier", studyPeriodId],
    queryFn: async () => {
      if (!studyPeriodId) return [];

      const { data, error } = await supabase
        .from("assessment_ratios")
        .select("*")
        .eq("study_period_id", studyPeriodId)
        .eq("is_outlier", false);

      if (error) throw error;

      // Group by tier and calculate medians
      const tiers: Record<string, AssessmentRatio[]> = {};
      (data as AssessmentRatio[]).forEach((ratio) => {
        const tier = ratio.value_tier || "Unknown";
        if (!tiers[tier]) tiers[tier] = [];
        tiers[tier].push(ratio);
      });

      // Calculate median for each tier
      const tierData = Object.entries(tiers).map(([tier, ratios]) => {
        const sortedRatios = ratios
          .map((r) => r.ratio)
          .filter((r): r is number => r !== null)
          .sort((a, b) => a - b);
        
        const mid = Math.floor(sortedRatios.length / 2);
        const median = sortedRatios.length % 2 !== 0
          ? sortedRatios[mid]
          : (sortedRatios[mid - 1] + sortedRatios[mid]) / 2;

        return {
          tier,
          median: median || 0,
          count: ratios.length,
          color: getTierColor(tier),
        };
      });

      return tierData.sort((a, b) => getTierOrder(a.tier) - getTierOrder(b.tier));
    },
    enabled: !!studyPeriodId,
  });
}

// Fetch appeals statistics by tier
export function useAppealsByTier(studyPeriodId: string | undefined) {
  return useQuery({
    queryKey: ["appeals", "by-tier", studyPeriodId],
    queryFn: async () => {
      if (!studyPeriodId) return [];

      const { data: ratios, error: ratiosError } = await supabase
        .from("assessment_ratios")
        .select("parcel_id, value_tier")
        .eq("study_period_id", studyPeriodId);

      if (ratiosError) throw ratiosError;

      const { data: appeals, error: appealsError } = await supabase
        .from("appeals")
        .select("parcel_id")
        .eq("study_period_id", studyPeriodId);

      if (appealsError) throw appealsError;

      const parcelTierMap: Record<string, string> = {};
      (ratios as AssessmentRatio[]).forEach((r) => {
        parcelTierMap[r.parcel_id] = r.value_tier || "Unknown";
      });

      const tierCounts: Record<string, number> = {};
      (ratios as AssessmentRatio[]).forEach((r) => {
        const tier = r.value_tier || "Unknown";
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      });

      const appealCounts: Record<string, number> = {};
      (appeals as Appeal[]).forEach((a) => {
        const tier = parcelTierMap[a.parcel_id] || "Unknown";
        appealCounts[tier] = (appealCounts[tier] || 0) + 1;
      });

      return Object.entries(tierCounts).map(([tier, count]) => ({
        tier,
        count: appealCounts[tier] || 0,
        rate: count > 0 ? ((appealCounts[tier] || 0) / count) * 100 : 0,
      })).sort((a, b) => getTierOrder(a.tier) - getTierOrder(b.tier));
    },
    enabled: !!studyPeriodId,
  });
}

// Fetch total sample size for a study period
export function useSampleSize(studyPeriodId: string | undefined) {
  return useQuery({
    queryKey: ["assessment-ratios", "count", studyPeriodId],
    queryFn: async () => {
      if (!studyPeriodId) return 0;

      const { count, error } = await supabase
        .from("assessment_ratios")
        .select("*", { count: "exact", head: true })
        .eq("study_period_id", studyPeriodId)
        .eq("is_outlier", false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!studyPeriodId,
  });
}

// Helper functions
function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    "low": "var(--tier-q1)",
    "Q1": "var(--tier-q1)",
    "Q1 (Low)": "var(--tier-q1)",
    "medium": "var(--tier-q2)",
    "Q2": "var(--tier-q2)",
    "Q3": "var(--tier-q3)",
    "high": "var(--tier-q4)",
    "Q4": "var(--tier-q4)",
    "Q4 (High)": "var(--tier-q4)",
  };
  return colors[tier] || "var(--tf-cyan)";
}

function getTierOrder(tier: string): number {
  const order: Record<string, number> = {
    "low": 1,
    "Q1": 1,
    "Q1 (Low)": 1,
    "medium": 2,
    "Q2": 2,
    "Q3": 3,
    "high": 4,
    "Q4": 4,
    "Q4 (High)": 4,
  };
  return order[tier] || 99;
}

// Normalize tier names for display
export function normalizeTierName(tier: string): string {
  const mapping: Record<string, string> = {
    "low": "Q1 (Low)",
    "medium": "Q2/Q3",
    "high": "Q4 (High)",
  };
  return mapping[tier] || tier;
}
