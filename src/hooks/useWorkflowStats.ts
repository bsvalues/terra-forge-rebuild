// TerraFusion OS — Workflow Stats Hook
// Data Constitution: extracts supabase queries from WorkflowStats component

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAppealsStats() {
  return useQuery({
    queryKey: ["appeals-stats"],
    queryFn: async () => {
      const { count: pendingCount } = await supabase
        .from("appeals")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "scheduled"]);

      const { count: totalCount } = await supabase
        .from("appeals")
        .select("*", { count: "exact", head: true });

      return {
        pending: pendingCount || 0,
        total: totalCount || 0,
      };
    },
  });
}
