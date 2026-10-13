import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ComparableSale {
  id: string;
  parcelId: string | null;
  parcelNumber: string | null;
  address: string | null;
  saleDate: string | null;
  salePrice: number | null;
  pricePerSqft: number | null;
  propertyClass: string | null;
  sqft: number | null;
  yearBuilt: number | null;
  neighborhoodCode: string | null;
  qualified: boolean;
}

interface UseComparableSalesOpts {
  neighborhoodCode: string | null;
  propertyClass: string | null;
  countyId: string | null;
  excludeParcelId?: string | null;
  limit?: number;
}

export function useComparableSales(opts: UseComparableSalesOpts) {
  const { neighborhoodCode, propertyClass, countyId, excludeParcelId, limit = 20 } = opts;

  return useQuery({
    queryKey: ["comparable-sales", neighborhoodCode, propertyClass, countyId, excludeParcelId, limit],
    enabled: !!(neighborhoodCode && countyId),
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<ComparableSale[]> => {
      if (!neighborhoodCode || !countyId) return [];

      // Query qualified sales in same neighborhood
      // Use `as any` to avoid TS2589 "excessively deep" with inner join syntax
      let query = (supabase
        .from("sales")
        .select(`
          id, parcel_id, sale_date, sale_price, qualified,
          parcels!inner(parcel_number, address, property_class, neighborhood_code, year_built, building_area)
        `) as any)
        .eq("county_id", countyId)
        .eq("qualified", true)
        .eq("parcels.neighborhood_code", neighborhoodCode);
      if (propertyClass) query = query.eq("parcels.property_class", propertyClass);
      if (excludeParcelId) query = query.neq("parcel_id", excludeParcelId);
      const { data, error } = await query
        .order("sale_date", { ascending: false })
        .limit(limit)
        .abortSignal(AbortSignal.timeout(15000));
      if (error) throw new Error(error.message);

      return (data ?? [])
        .filter((s: any) => !excludeParcelId || s.parcel_id !== excludeParcelId)
        .map((s: any) => {
          const p = s.parcels;
          const sqft = p?.building_area ?? null;
          return {
            id: s.id,
            parcelId: s.parcel_id,
            parcelNumber: p?.parcel_number ?? null,
            address: p?.address ?? null,
            saleDate: s.sale_date,
            salePrice: s.sale_price,
            pricePerSqft: s.sale_price && sqft ? Math.round(s.sale_price / sqft) : null,
            propertyClass: p?.property_class ?? null,
            sqft,
            yearBuilt: p?.year_built ?? null,
            neighborhoodCode: p?.neighborhood_code ?? null,
            qualified: s.qualified ?? false,
          };
        });
    },
  });
}
