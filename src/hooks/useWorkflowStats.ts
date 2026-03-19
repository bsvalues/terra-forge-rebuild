// TerraFusion OS — Workflow Stats Hook
// Data Constitution: live DB queries for all DAIS workflow categories

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

      return { pending: pendingCount || 0, total: totalCount || 0 };
    },
  });
}

export function usePermitsStats() {
  return useQuery({
    queryKey: ["permits-stats"],
    queryFn: async () => {
      const { count: pendingCount } = await supabase
        .from("assessments")
        .select("*", { count: "exact", head: true })
        .eq("certified", false);

      const { count: totalCount } = await supabase
        .from("assessments")
        .select("*", { count: "exact", head: true });

      return { pending: pendingCount || 0, total: totalCount || 0 };
    },
  });
}

export function useExemptionsStats() {
  return useQuery({
    queryKey: ["exemptions-stats"],
    queryFn: async () => {
      const { count: pendingCount } = await supabase
        .from("exemptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: totalCount } = await supabase
        .from("exemptions")
        .select("*", { count: "exact", head: true });

      return { pending: pendingCount || 0, total: totalCount || 0 };
    },
  });
}

export function useNoticesStats() {
  return useQuery({
    queryKey: ["notices-stats"],
    queryFn: async () => {
      const { count: pendingCount } = await supabase
        .from("batch_notice_jobs")
        .select("*", { count: "exact", head: true })
        .in("status", ["queued", "processing"]);

      const { count: totalCount } = await supabase
        .from("batch_notice_jobs")
        .select("*", { count: "exact", head: true });

      return { pending: pendingCount || 0, total: totalCount || 0 };
    },
  });
}
