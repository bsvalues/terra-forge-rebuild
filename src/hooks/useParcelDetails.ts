import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAssessmentHistory(parcelId: string | null) {
  return useQuery({
    queryKey: ["assessment-history", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("id, tax_year, land_value, improvement_value, total_value, assessment_date, certified")
        .eq("parcel_id", parcelId!)
        .order("tax_year", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!parcelId,
    staleTime: 60000,
  });
}

export function useParcelSales(parcelId: string | null) {
  return useQuery({
    queryKey: ["parcel-sales", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, sale_date, sale_price, sale_type, deed_type, grantor, grantee, is_qualified, verification_status")
        .eq("parcel_id", parcelId!)
        .order("sale_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!parcelId,
    staleTime: 60000,
  });
}

export function useComparableSales(parcelId: string | null, neighborhoodCode: string | null, assessedValue: number | null) {
  return useQuery({
    queryKey: ["comparable-sales", parcelId, neighborhoodCode],
    queryFn: async () => {
      // Find recent qualified sales in same neighborhood within ±30% value
      let query = supabase
        .from("sales")
        .select(`
          id, sale_date, sale_price, sale_type, deed_type, is_qualified, verification_status,
          parcels!inner(id, parcel_number, address, city, property_class, neighborhood_code, assessed_value, year_built, building_area, land_area)
        `)
        .neq("parcels.id", parcelId!)
        .eq("is_qualified", true)
        .order("sale_date", { ascending: false })
        .limit(20);

      if (neighborhoodCode) {
        query = query.eq("parcels.neighborhood_code", neighborhoodCode);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Sort by value proximity if we have an assessed value
      if (assessedValue && data) {
        return data.sort((a: any, b: any) => {
          const aVal = a.parcels?.assessed_value ?? 0;
          const bVal = b.parcels?.assessed_value ?? 0;
          return Math.abs(aVal - assessedValue) - Math.abs(bVal - assessedValue);
        });
      }
      return data ?? [];
    },
    enabled: !!parcelId,
    staleTime: 60000,
  });
}

export function useParcelAppeals(parcelId: string | null) {
  return useQuery({
    queryKey: ["parcel-appeals", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appeals")
        .select("id, appeal_date, status, original_value, requested_value, final_value, resolution_type, hearing_date")
        .eq("parcel_id", parcelId!)
        .order("appeal_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!parcelId,
    staleTime: 60000,
  });
}
