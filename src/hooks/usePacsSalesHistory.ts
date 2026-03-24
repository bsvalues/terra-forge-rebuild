import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PacsSale {
  id: string;
  county_id: string;
  chg_of_owner_id: number | null;
  prop_id: number;
  geo_id: string | null;
  sale_price: number | null;
  sale_date: string | null;
  sale_type_cd: string | null;
  ratio_cd: string | null;
  ratio_type_cd: string | null;
  market_value: number | null;
  hood_cd: string | null;
  ratio: number | null;
}

export function usePacsSalesHistory(propId: number | null) {
  return useQuery({
    queryKey: ["pacs-sales", propId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("pacs_sales")
        .select("*")
        .eq("prop_id", propId!)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PacsSale[];
    },
    enabled: !!propId,
    staleTime: 60000,
  });
}

export function usePacsNeighborhoodSales(hoodCd: string | null) {
  return useQuery({
    queryKey: ["pacs-hood-sales", hoodCd],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("pacs_sales")
        .select("*")
        .eq("hood_cd", hoodCd!)
        .not("ratio", "is", null)
        .order("sale_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as PacsSale[];
    },
    enabled: !!hoodCd,
    staleTime: 60000,
  });
}
