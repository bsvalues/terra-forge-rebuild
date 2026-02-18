// TerraFusion OS — Parcel Search Hook (Constitutional)
// Extracted from SuiteHub to comply with Data Constitution Rule 1:
// "No supabase.from() in UI components."

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useParcelSearch(searchTerm: string) {
  return useQuery({
    queryKey: ["hub-parcel-search", searchTerm],
    queryFn: async () => {
      const term = searchTerm.trim();
      if (term.length < 2) return [];
      const { data } = await supabase
        .from("parcels")
        .select("id, parcel_number, address, city, assessed_value, neighborhood_code")
        .or(`parcel_number.ilike.%${term}%,address.ilike.%${term}%`)
        .limit(8);
      return data || [];
    },
    enabled: searchTerm.trim().length >= 2,
    staleTime: 10_000,
  });
}
