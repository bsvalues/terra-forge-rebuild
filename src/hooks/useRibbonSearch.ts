// TerraFusion OS — Ribbon Search Hook (Constitutional: DB access only in hooks)
// Used by ContextRibbon for parcel search and study period selection.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

export interface RibbonParcelResult {
  id: string;
  parcel_number: string;
  address: string;
  city: string | null;
  property_class: string | null;
  assessed_value: number;
  latitude: number | null;
  longitude: number | null;
  neighborhood_code: string | null;
}

export interface RibbonStudyPeriod {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  description: string | null;
}

export function useRibbonParcelSearch(query: string) {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["parcel-search", countyId, query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      let q = supabase
        .from("parcels")
        .select("id, parcel_number, address, city, property_class, assessed_value, latitude, longitude, neighborhood_code")
        .or(`parcel_number.ilike.%${query}%,address.ilike.%${query}%`)
        .order("assessed_value", { ascending: false })
        .limit(10);
      if (countyId) q = q.eq("county_id", countyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as RibbonParcelResult[];
    },
    enabled: query.length >= 2,
    staleTime: 30000,
  });
}

export function useRibbonStudyPeriods() {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["study-periods-ribbon", countyId],
    queryFn: async () => {
      let q = supabase
        .from("study_periods")
        .select("id, name, status, start_date, end_date, description")
        .order("start_date", { ascending: false })
        .limit(10);
      if (countyId) q = q.eq("county_id", countyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as RibbonStudyPeriod[];
    },
    staleTime: 60000,
  });
}

export function useWorkflowParcelSearch(query: string) {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["parcels-search-workflow", countyId, query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      let q = supabase
        .from("parcels")
        .select("id, parcel_number, address, city, assessed_value")
        .or(`parcel_number.ilike.%${query}%,address.ilike.%${query}%`)
        .limit(10);
      if (countyId) q = q.eq("county_id", countyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: query.length >= 2,
  });
}
