import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invalidateCertification } from "@/lib/queryInvalidation";

export interface Assessment {
  id: string;
  parcel_id: string;
  tax_year: number;
  land_value: number;
  improvement_value: number;
  total_value: number;
  assessment_date: string | null;
  assessment_reason: string | null;
  certified: boolean;
  certified_at: string | null;
  data_source_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all assessments for a tax year with parcel info
 */
export function useAssessmentsByTaxYear(taxYear: number) {
  return useQuery({
    queryKey: ["assessments", "by-year", taxYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select(`
          *,
          parcels (
            id,
            parcel_number,
            address,
            city,
            property_class,
            neighborhood_code
          )
        `)
        .eq("tax_year", taxYear)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Get assessment summary stats by tax year
 */
export function useAssessmentSummary(taxYear: number) {
  return useQuery({
    queryKey: ["assessments", "summary", taxYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("land_value, improvement_value, certified")
        .eq("tax_year", taxYear);

      if (error) throw error;

      const totalLand = data?.reduce((sum, a) => sum + (a.land_value || 0), 0) || 0;
      const totalImprovement = data?.reduce((sum, a) => sum + (a.improvement_value || 0), 0) || 0;
      const certifiedCount = data?.filter((a) => a.certified).length || 0;

      return {
        totalParcels: data?.length || 0,
        totalLandValue: totalLand,
        totalImprovementValue: totalImprovement,
        totalAssessedValue: totalLand + totalImprovement,
        certifiedCount,
        certificationRate: data?.length ? (certifiedCount / data.length) * 100 : 0,
      };
    },
  });
}

/**
 * Get value changes between tax years
 */
export function useValueChanges(currentYear: number, priorYear: number) {
  return useQuery({
    queryKey: ["assessments", "changes", currentYear, priorYear],
    queryFn: async () => {
      // Get current year assessments
      const { data: current, error: currError } = await supabase
        .from("assessments")
        .select("parcel_id, land_value, improvement_value")
        .eq("tax_year", currentYear);

      if (currError) throw currError;

      // Get prior year assessments
      const { data: prior, error: priorError } = await supabase
        .from("assessments")
        .select("parcel_id, land_value, improvement_value")
        .eq("tax_year", priorYear);

      if (priorError) throw priorError;

      // Create lookup map for prior values
      const priorMap = new Map(
        prior?.map((p) => [p.parcel_id, p.land_value + p.improvement_value]) || []
      );

      // Calculate changes
      const changes = current?.map((c) => {
        const currentTotal = c.land_value + c.improvement_value;
        const priorTotal = priorMap.get(c.parcel_id) || 0;
        const change = priorTotal > 0 ? ((currentTotal - priorTotal) / priorTotal) * 100 : 0;
        return {
          parcel_id: c.parcel_id,
          current_value: currentTotal,
          prior_value: priorTotal,
          change_amount: currentTotal - priorTotal,
          change_percent: change,
        };
      }) || [];

      // Aggregate stats
      const increases = changes.filter((c) => c.change_percent > 0);
      const decreases = changes.filter((c) => c.change_percent < 0);
      const unchanged = changes.filter((c) => c.change_percent === 0);

      return {
        totalParcels: changes.length,
        increases: {
          count: increases.length,
          avgChange: increases.length > 0 
            ? increases.reduce((sum, c) => sum + c.change_percent, 0) / increases.length 
            : 0,
        },
        decreases: {
          count: decreases.length,
          avgChange: decreases.length > 0 
            ? decreases.reduce((sum, c) => sum + c.change_percent, 0) / decreases.length 
            : 0,
        },
        unchanged: unchanged.length,
        topIncreases: changes.sort((a, b) => b.change_percent - a.change_percent).slice(0, 10),
        topDecreases: changes.sort((a, b) => a.change_percent - b.change_percent).slice(0, 10),
      };
    },
  });
}

/**
 * Create or update an assessment
 */
export function useUpsertAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessment: Partial<Assessment> & { parcel_id: string; tax_year: number }) => {
      const { data, error } = await supabase
        .from("assessments")
        .upsert(assessment, { onConflict: "parcel_id,tax_year" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      invalidateCertification(queryClient);
    },
  });
}

/**
 * Certify assessments for a tax year
 */
export function useCertifyAssessments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taxYear, parcelIds }: { taxYear: number; parcelIds?: string[] }) => {
      let query = supabase
        .from("assessments")
        .update({ certified: true, certified_at: new Date().toISOString() })
        .eq("tax_year", taxYear);

      if (parcelIds && parcelIds.length > 0) {
        query = query.in("parcel_id", parcelIds);
      }

      const { data, error } = await query.select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateCertification(queryClient);
    },
  });
}
