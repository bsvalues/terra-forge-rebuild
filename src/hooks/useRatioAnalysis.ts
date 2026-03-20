import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RatioStatistics {
  sample_size: number;
  median_ratio: number | null;
  mean_ratio: number | null;
  cod: number | null;
  prd: number | null;
  prb: number | null;
  low_tier_median: number | null;
  mid_tier_median: number | null;
  high_tier_median: number | null;
  tier_slope: number | null;
}

export type OutlierMethod = "bounds" | "iqr";

export interface RatioAnalysisParams {
  taxYear?: number;
  salesStartDate?: string;
  salesEndDate?: string;
  neighborhoodCode?: string | null;
  outlierMethod?: OutlierMethod;
}

/**
 * Compute ratio statistics on-demand using the database function
 * No longer tied to study periods - works with any tax year and sales window
 */
export function useRatioAnalysis(params: RatioAnalysisParams = {}) {
  const currentYear = new Date().getFullYear();
  const {
    taxYear = currentYear,
    salesStartDate = new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 24 months ago
    salesEndDate = new Date().toISOString().split('T')[0],
    neighborhoodCode = null,
    outlierMethod = "bounds",
  } = params;

  return useQuery({
    queryKey: ["ratio-analysis", taxYear, salesStartDate, salesEndDate, neighborhoodCode, outlierMethod],
    staleTime: 2 * 60 * 1000, // 2 min — refresh after data imports or calibration runs
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as Function)("compute_ratio_statistics", {
        p_tax_year: taxYear,
        p_sales_start_date: salesStartDate,
        p_sales_end_date: salesEndDate,
        p_neighborhood_code: neighborhoodCode,
        p_outlier_method: outlierMethod,
      });

      if (error) throw error;
      
      // RPC returns an array, we want the first result
      const result = Array.isArray(data) ? data[0] : data;
      const stats = result as RatioStatistics;

      // Emit model_receipt for TerraTrace audit trail (fire-and-forget)
      if (stats && stats.sample_size > 0) {
        const { data: userData } = await supabase.auth.getUser();
        const operatorId = userData?.user?.id;
        if (operatorId) {
          supabase.from("model_receipts").insert([{
            model_type: "ratio_study",
            model_version: `vei-ondemand-${outlierMethod}-v1`,
            operator_id: operatorId,
            inputs: JSON.parse(JSON.stringify({
              tax_year: taxYear,
              sales_start_date: salesStartDate,
              sales_end_date: salesEndDate,
              neighborhood_code: neighborhoodCode,
              outlier_method: outlierMethod,
            })),
            outputs: JSON.parse(JSON.stringify({
              sample_size: stats.sample_size,
              median_ratio: stats.median_ratio,
              cod: stats.cod,
              prd: stats.prd,
              prb: stats.prb,
              tier_slope: stats.tier_slope,
            })),
            metadata: JSON.parse(JSON.stringify({ source: "VEIDashboard", computed_at: new Date().toISOString() })),
          }]).then(() => {});
        }
      }

      return stats;
    },
  });
}

/**
 * Get available tax years from assessments table
 */
export function useTaxYears() {
  return useQuery({
    queryKey: ["tax-years"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("tax_year")
        .order("tax_year", { ascending: false });

      if (error) throw error;

      // Get unique years
      const years = [...new Set(data?.map((d) => d.tax_year) || [])];
      return years;
    },
  });
}

/**
 * Get assessment history for a specific parcel
 */
export function useParcelAssessmentHistory(parcelId: string | null) {
  return useQuery({
    queryKey: ["parcel-assessments", parcelId],
    queryFn: async () => {
      if (!parcelId) return [];

      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("parcel_id", parcelId)
        .order("tax_year", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!parcelId,
  });
}

/**
 * Get data sources for tracking import origins
 */
export function useDataSources() {
  return useQuery({
    queryKey: ["data-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_sources")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Get external valuations for comparison
 */
export function useExternalValuations(parcelId: string | null) {
  return useQuery({
    queryKey: ["external-valuations", parcelId],
    queryFn: async () => {
      if (!parcelId) return [];

      const { data, error } = await supabase
        .from("external_valuations")
        .select("*")
        .eq("parcel_id", parcelId)
        .order("valuation_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!parcelId,
  });
}

/**
 * Compute ratio statistics for multiple neighborhoods for comparison
 */
export function useNeighborhoodRatioComparison(
  taxYear: number,
  salesStartDate: string,
  salesEndDate: string
) {
  return useQuery({
    queryKey: ["neighborhood-ratio-comparison", taxYear, salesStartDate, salesEndDate],
    queryFn: async () => {
      // Get unique neighborhood codes
      const { data: neighborhoods, error: nbError } = await supabase
        .from("parcels")
        .select("neighborhood_code")
        .not("neighborhood_code", "is", null);

      if (nbError) throw nbError;

      const uniqueCodes = [...new Set(neighborhoods?.map((n) => n.neighborhood_code) || [])];

      // Compute stats for each neighborhood
      const results = await Promise.all(
        uniqueCodes.slice(0, 20).map(async (code) => {
          const { data, error } = await (supabase.rpc as Function)("compute_ratio_statistics", {
            p_tax_year: taxYear,
            p_sales_start_date: salesStartDate,
            p_sales_end_date: salesEndDate,
            p_neighborhood_code: code,
            p_outlier_method: "iqr",
          });

          if (error) return null;
          const stats = Array.isArray(data) ? data[0] : data;
          return {
            neighborhood_code: code,
            ...stats,
          };
        })
      );

      return results.filter((r) => r && r.sample_size && r.sample_size >= 3);
    },
  });
}
