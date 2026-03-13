// TerraFusion OS — IDS Inventory Metrics Hook
// Data Constitution: extracts supabase queries from InventoryPillar component

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useParcelsCount() {
  return useQuery({
    queryKey: ["ids-inventory-parcels"],
    queryFn: async () => {
      const { count } = await supabase.from("parcels").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });
}

export function useSalesCount() {
  return useQuery({
    queryKey: ["ids-inventory-sales"],
    queryFn: async () => {
      const { count } = await supabase.from("sales").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });
}

export function useAssessmentsCount() {
  return useQuery({
    queryKey: ["ids-inventory-assessments"],
    queryFn: async () => {
      const { count } = await supabase.from("assessments").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });
}

export function useLatestDataSource() {
  return useQuery({
    queryKey: ["ids-inventory-sources"],
    queryFn: async () => {
      const { data } = await supabase
        .from("data_sources")
        .select("*")
        .order("last_sync_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
  });
}
