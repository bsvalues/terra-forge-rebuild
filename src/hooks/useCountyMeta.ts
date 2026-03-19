// TerraFusion OS — County Meta Hook (Constitutional: DB access only in hooks)
// Used by TopSystemBar and ScopeHeaders to fetch county name/state for display.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CountyMeta {
  name: string;
  state: string;
}

/** Short display name: "Salt Lake County" → "Salt Lake" */
function shortName(name: string): string {
  return name.replace(/\s*County$/i, "").trim();
}

export function useCountyMeta(): CountyMeta & { shortName: string } | null {
  const { data } = useQuery<(CountyMeta & { shortName: string }) | null>({
    queryKey: ["county-meta"],
    queryFn: async () => {
      // Prefer Salt Lake County (SLCO) as the active dev server county
      const { data } = await supabase
        .from("counties")
        .select("name, state")
        .eq("fips_code", "49035")
        .maybeSingle();
      if (data) return { ...data, shortName: shortName(data.name) } as CountyMeta & { shortName: string };
      // Fallback to first county
      const { data: fallback } = await supabase
        .from("counties")
        .select("name, state")
        .limit(1)
        .maybeSingle();
      if (fallback) return { ...fallback, shortName: shortName(fallback.name) } as CountyMeta & { shortName: string };
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return data ?? null;
}
