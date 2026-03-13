// TerraFusion OS — Comp Grid Data Hook
// Extracts direct supabase queries from CompMode component (Data Constitution)

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompGridParcel {
  id: string;
  parcel_number: string;
  address: string;
  assessed_value: number;
  building_area: number | null;
  year_built: number | null;
  sale_price: number | null;
  sale_date: string | null;
  ratio: number | null;
}

export function useCompGrid(neighborhoodCode: string | null) {
  return useQuery<CompGridParcel[]>({
    queryKey: ["comp-grid", neighborhoodCode],
    enabled: !!neighborhoodCode,
    queryFn: async () => {
      const { data: p, error } = await supabase
        .from("parcels")
        .select("id, parcel_number, address, assessed_value, building_area, year_built")
        .eq("neighborhood_code", neighborhoodCode!)
        .order("parcel_number")
        .limit(200);
      if (error) throw error;
      if (!p?.length) return [];

      const ids = p.map((x) => x.id);
      const { data: sales } = await supabase
        .from("sales")
        .select("parcel_id, sale_price, sale_date")
        .in("parcel_id", ids)
        .eq("is_qualified", true)
        .gt("sale_price", 0)
        .order("sale_date", { ascending: false });

      const latestSale = new Map<string, { sale_price: number; sale_date: string }>();
      for (const s of sales || []) {
        if (!latestSale.has(s.parcel_id)) latestSale.set(s.parcel_id, s);
      }

      return p.map((parcel) => {
        const sale = latestSale.get(parcel.id);
        const ratio = sale ? parcel.assessed_value / sale.sale_price : null;
        return { ...parcel, sale_price: sale?.sale_price ?? null, sale_date: sale?.sale_date ?? null, ratio };
      });
    },
  });
}
