// TerraFusion OS — Parcel Search & Filter Hooks
// Data Constitution: extracts supabase queries from ParcelSearchPanel and ParcelFilters

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

interface ParcelSearchFilters {
  address: string;
  minValue: number;
  maxValue: number;
  propertyClasses: string[];
  city: string;
  neighborhoods: string[];
}

export function useParcelSearchQuery(filters: ParcelSearchFilters, page: number, pageSize: number = 50) {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["parcels-search", countyId, filters, page],
    queryFn: async () => {
      if (!countyId) return { parcels: [], totalCount: 0 };

      let query = supabase
        .from("parcels")
        .select("*", { count: "exact" })
        .eq("county_id", countyId)
        .order("assessed_value", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.address.trim()) {
        query = query.ilike("address", `%${filters.address}%`);
      }
      if (filters.city.trim()) {
        query = query.ilike("city", `%${filters.city}%`);
      }
      if (filters.minValue > 0) {
        query = query.gte("assessed_value", filters.minValue);
      }
      if (filters.maxValue < 5000000) {
        query = query.lte("assessed_value", filters.maxValue);
      }
      if (filters.propertyClasses.length > 0) {
        query = query.in("property_class", filters.propertyClasses);
      }
      if (filters.neighborhoods.length > 0) {
        query = query.in("neighborhood_code", filters.neighborhoods);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { parcels: data || [], totalCount: count || 0 };
    },
    enabled: !!countyId,
    staleTime: 30000,
  });
}

export function useParcelFilterOptions() {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["parcel-filter-options", countyId],
    queryFn: async () => {
      if (!countyId) return { cities: [] as string[] };

      const { data: cityData } = await supabase
        .from("parcels")
        .select("city")
        .eq("county_id", countyId)
        .not("city", "is", null)
        .limit(1000);

      const cities = [...new Set((cityData || []).map((p) => p.city).filter(Boolean))] as string[];
      return { cities };
    },
    enabled: !!countyId,
    staleTime: 60000,
  });
}

export function useParcelFilterDistincts() {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["parcel-filter-distincts", countyId],
    queryFn: async () => {
      if (!countyId) {
        return { neighborhoods: [] as string[], propertyClasses: [] as string[], cities: [] as string[] };
      }

      const [nbhResult, classResult, cityResult] = await Promise.all([
        supabase
          .from("parcels")
          .select("neighborhood_code")
          .eq("county_id", countyId)
          .not("neighborhood_code", "is", null)
          .limit(500),
        supabase
          .from("parcels")
          .select("property_class")
          .eq("county_id", countyId)
          .not("property_class", "is", null)
          .limit(100),
        supabase
          .from("parcels")
          .select("city")
          .eq("county_id", countyId)
          .not("city", "is", null)
          .limit(100),
      ]);

      const neighborhoods = nbhResult.data
        ? [...new Set(nbhResult.data.map((p) => p.neighborhood_code))].filter(Boolean).sort() as string[]
        : [];
      const propertyClasses = classResult.data
        ? [...new Set(classResult.data.map((p) => p.property_class))].filter(Boolean).sort() as string[]
        : [];
      const cities = cityResult.data
        ? [...new Set(cityResult.data.map((p) => p.city))].filter(Boolean).sort() as string[]
        : [];

      return { neighborhoods, propertyClasses, cities };
    },
    enabled: !!countyId,
    staleTime: 120_000,
  });
}
