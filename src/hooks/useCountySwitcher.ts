// TerraFusion OS — County Switcher Hook (Constitutional: DB access only in hooks)
// Phase 96: Enhanced with parcel counts + localStorage persistence

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LAST_COUNTY_KEY = "tf_last_county_id";

export interface County {
  id: string;
  name: string;
  state: string;
  fips_code: string;
}

export interface CountyWithStats extends County {
  parcel_count: number;
  study_period_count: number;
}

export function useAllCounties() {
  return useQuery({
    queryKey: ["all-counties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counties")
        .select("id, name, state, fips_code")
        .order("name");
      if (error) throw error;
      return data as County[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Enhanced county list with parcel counts and study period counts */
export function useCountyList() {
  return useQuery({
    queryKey: ["county-list-stats"],
    queryFn: async (): Promise<CountyWithStats[]> => {
      const { data: counties, error } = await supabase
        .from("counties")
        .select("id, name, state, fips_code")
        .order("name");
      if (error) throw error;
      if (!counties) return [];

      const stats = await Promise.all(
        counties.map(async (county) => {
          const [parcels, periods] = await Promise.all([
            supabase.from("parcels").select("id", { count: "exact", head: true }).eq("county_id", county.id),
            supabase.from("study_periods").select("id", { count: "exact", head: true }).eq("county_id", county.id),
          ]);
          return {
            ...county,
            parcel_count: parcels.count ?? 0,
            study_period_count: periods.count ?? 0,
          };
        }),
      );
      return stats;
    },
    staleTime: 60_000,
  });
}

export function useCurrentCounty(countyId: string | undefined | null) {
  return useQuery({
    queryKey: ["current-county", countyId],
    queryFn: async () => {
      if (!countyId) return null;
      const { data } = await supabase
        .from("counties")
        .select("id, name, state, fips_code")
        .eq("id", countyId)
        .single();
      return data as County | null;
    },
    enabled: !!countyId,
  });
}

export function useSwitchCounty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, countyId }: { userId: string; countyId: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ county_id: countyId })
        .eq("user_id", userId);
      if (error) throw error;
      localStorage.setItem(LAST_COUNTY_KEY, countyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error("Failed to switch county", { description: err.message });
    },
  });
}

/** Get last-used county from localStorage */
export function getLastCountyId(): string | null {
  return localStorage.getItem(LAST_COUNTY_KEY);
}
