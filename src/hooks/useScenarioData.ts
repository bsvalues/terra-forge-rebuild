// TerraFusion OS — Scenario Mode Data Hook
// Extracts direct supabase queries from ScenarioMode component (Data Constitution)

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useScenarioParcels(neighborhoodCode: string | null) {
  return useQuery({
    queryKey: ["scenario-parcels", neighborhoodCode],
    queryFn: async () => {
      let query = supabase
        .from("parcels")
        .select("id, parcel_number, address, assessed_value, land_value, improvement_value, neighborhood_code")
        .gt("assessed_value", 0);
      if (neighborhoodCode) {
        query = query.eq("neighborhood_code", neighborhoodCode);
      }
      const { data } = await query.limit(500);
      return data || [];
    },
    staleTime: 120_000,
  });
}

export function useScenarioSales(neighborhoodCode: string | null) {
  return useQuery({
    queryKey: ["scenario-sales", neighborhoodCode],
    queryFn: async () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const query = supabase
        .from("sales")
        .select("parcel_id, sale_price")
        .eq("is_qualified", true)
        .gt("sale_price", 0)
        .gte("sale_date", twoYearsAgo.toISOString().split("T")[0]);
      const { data } = await query.limit(1000);
      return data || [];
    },
    staleTime: 120_000,
  });
}
