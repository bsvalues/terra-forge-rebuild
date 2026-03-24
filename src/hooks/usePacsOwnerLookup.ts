import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PacsOwner {
  id: string;
  county_id: string;
  prop_id: number;
  owner_id: number;
  owner_name: string | null;
  pct_ownership: number | null;
  owner_tax_yr: number | null;
  sup_num: number | null;
}

export function usePacsOwnerLookup(propId: number | null) {
  return useQuery({
    queryKey: ["pacs-owners", propId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("pacs_owners")
        .select("id, county_id, prop_id, owner_id, owner_name, pct_ownership, owner_tax_yr, sup_num")
        .eq("prop_id", propId!)
        .order("owner_tax_yr", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PacsOwner[];
    },
    enabled: !!propId,
    staleTime: 60000,
  });
}

export function usePacsOwnerSearch(searchTerm: string | null) {
  return useQuery({
    queryKey: ["pacs-owner-search", searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacs_owners")
        .select("id, prop_id, owner_id, owner_name, pct_ownership, owner_tax_yr")
        .ilike("owner_name", `%${searchTerm}%`)
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PacsOwner[];
    },
    enabled: !!searchTerm && searchTerm.length >= 3,
    staleTime: 30000,
  });
}
