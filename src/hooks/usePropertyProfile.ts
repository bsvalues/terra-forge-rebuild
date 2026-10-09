import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PacsPropertyProfile } from "@/types/pacs";

export type PropertyProfileRow = PacsPropertyProfile;

export function usePropertyProfile(propId: number | null) {
  return useQuery({
    queryKey: ["pacs-property-profile", propId],
    queryFn: async () => {
      // Using typed client - PACS tables require (supabase as any) until types are regenerated
      // but we add proper TypeScript types via @/types/pacs
      const { data, error } = await (supabase as any)
        .from("pacs_property_profiles")
        .select("*")
        .eq("prop_id", propId!)
        .order("prop_val_yr", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as PropertyProfileRow | null;
    },
    enabled: !!propId,
    staleTime: 300000,
  });
}

export function usePropertyProfileHistory(propId: number | null) {
  return useQuery({
    queryKey: ["pacs-property-profile-history", propId],
    queryFn: async () => {
      // Using typed client - PACS tables require (supabase as any) until types are regenerated
      // but we add proper TypeScript types via @/types/pacs
      const { data, error } = await (supabase as any)
        .from("pacs_property_profiles")
        .select("*")
        .eq("prop_id", propId!)
        .order("prop_val_yr", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PropertyProfileRow[];
    },
    enabled: !!propId,
    staleTime: 300000,
  });
}