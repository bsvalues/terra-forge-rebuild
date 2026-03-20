// TerraFusion OS — County Meta Hook (Constitutional: DB access only in hooks)
// Used by TopSystemBar and ScopeHeaders to fetch county name/state for display.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

export interface CountyMeta {
  name: string;
  state: string;
}

/** Short display name: "Salt Lake County" → "Salt Lake" */
function shortName(name: string): string {
  return name.replace(/\s*County$/i, "").trim();
}

export function useCountyMeta(): CountyMeta & { shortName: string } | null {
  const countyId = useActiveCountyId();

  const { data } = useQuery<(CountyMeta & { shortName: string }) | null>({
    queryKey: ["county-meta", countyId],
    queryFn: async () => {
      if (!countyId) return null;

      const { data, error } = await supabase
        .from("counties")
        .select("name, state")
        .eq("id", countyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return { ...data, shortName: shortName(data.name) } as CountyMeta & { shortName: string };
    },
    enabled: !!countyId,
    staleTime: 5 * 60 * 1000,
  });

  return data ?? null;
}
