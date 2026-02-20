// TerraFusion OS — County Meta Hook (Constitutional: DB access only in hooks)
// Used by TopSystemBar to fetch county name/state for display.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CountyMeta {
  name: string;
  state: string;
}

export function useCountyMeta(): CountyMeta | null {
  const { data } = useQuery<CountyMeta | null>({
    queryKey: ["county-meta"],
    queryFn: async () => {
      const { data } = await supabase
        .from("counties")
        .select("name, state")
        .limit(1)
        .maybeSingle();
      return data as CountyMeta | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return data ?? null;
}
