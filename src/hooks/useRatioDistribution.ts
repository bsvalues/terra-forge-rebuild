import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RatioDistributionBucket {
  range_label: string;
  range_min: number;
  range_max: number;
  parcel_count: number;
  percentage: number;
}

/**
 * Fetch real COD distribution data from compute_ratio_distribution RPC.
 * Returns deviation-from-median buckets for the COD drilldown histogram.
 */
export function useRatioDistribution(
  taxYear: number,
  salesStartDate: string,
  salesEndDate: string,
  outlierMethod: string = "bounds",
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["ratio-distribution", taxYear, salesStartDate, salesEndDate, outlierMethod],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as Function)("compute_ratio_distribution", {
        p_tax_year: taxYear,
        p_sales_start_date: salesStartDate,
        p_sales_end_date: salesEndDate,
        p_outlier_method: outlierMethod,
      });

      if (error) throw error;
      return (data as RatioDistributionBucket[]) || [];
    },
    enabled,
  });
}
