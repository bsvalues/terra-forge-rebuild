// TerraFusion OS — Analytics Trends Hooks
// Extracts direct supabase queries from AnalyticsDashboard (Data Constitution)

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAssessmentTrends() {
  return useQuery({
    queryKey: ["analytics-assessment-trends"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("tax_year, total_value, land_value, improvement_value")
        .order("tax_year")
        .limit(1000);
      if (error) throw error;
      const map = new Map<number, { count: number; total: number; land: number; improvement: number }>();
      for (const a of data ?? []) {
        const entry = map.get(a.tax_year) ?? { count: 0, total: 0, land: 0, improvement: 0 };
        entry.count++;
        entry.total += a.total_value ?? 0;
        entry.land += a.land_value ?? 0;
        entry.improvement += a.improvement_value ?? 0;
        map.set(a.tax_year, entry);
      }
      return Array.from(map.entries())
        .map(([year, v]) => ({
          year,
          avgTotal: Math.round(v.total / v.count),
          avgLand: Math.round(v.land / v.count),
          avgImprovement: Math.round(v.improvement / v.count),
          count: v.count,
        }))
        .sort((a, b) => a.year - b.year);
    },
    staleTime: 120_000,
  });
}

export function useSalesVelocity() {
  return useQuery({
    queryKey: ["analytics-sales-velocity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("sale_date, sale_price, is_qualified")
        .order("sale_date")
        .limit(1000);
      if (error) throw error;
      const map = new Map<string, { count: number; qualified: number; totalPrice: number }>();
      for (const s of data ?? []) {
        const month = s.sale_date.slice(0, 7);
        const entry = map.get(month) ?? { count: 0, qualified: 0, totalPrice: 0 };
        entry.count++;
        if (s.is_qualified) entry.qualified++;
        entry.totalPrice += s.sale_price ?? 0;
        map.set(month, entry);
      }
      return Array.from(map.entries())
        .map(([month, v]) => ({
          month,
          totalSales: v.count,
          qualifiedSales: v.qualified,
          avgPrice: Math.round(v.totalPrice / v.count),
          qualificationRate: Math.round((v.qualified / v.count) * 100),
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-24);
    },
    staleTime: 120_000,
  });
}
