// TerraFusion OS — County Switcher Hook (Constitutional: DB access only in hooks)

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface County {
  id: string;
  name: string;
  state: string;
  fips_code: string;
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error("Failed to switch county", { description: err.message });
    },
  });
}
