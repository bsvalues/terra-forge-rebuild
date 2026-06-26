// TerraFusion OS — Unified Parcel Sales History Hook
// Merges sales from three sources: canonical `sales` table,
// `ascend_sales` (pre-2015), and `pacs_sales` (current PACS).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UnifiedSale {
  id: string;
  saleDate: string | null;
  salePrice: number | null;
  grantor: string | null;
  grantee: string | null;
  deedType: string | null;
  saleType: string | null;
  sourceSystem: "canonical" | "ascend" | "pacs";
  qualified: boolean | null;
  exciseNumber: string | null;
}

export function useParcelSalesHistory(
  parcelId: string | null,
  parcelNumber: string | null
) {
  return useQuery<UnifiedSale[]>({
    queryKey: ["parcel-sales-history", parcelId, parcelNumber],
    enabled: !!(parcelId || parcelNumber),
    staleTime: 300_000,
    queryFn: async () => {
      const allSales: UnifiedSale[] = [];

      // 1. Canonical sales table
      if (parcelId) {
        const { data: canonical } = await supabase
          .from("sales")
          .select(
            "id, sale_date, sale_price, sale_type, deed_type, grantor, grantee, is_qualified"
          )
          .eq("parcel_id", parcelId)
          .order("sale_date", { ascending: false });

        for (const s of canonical ?? []) {
          allSales.push({
            id: s.id,
            saleDate: s.sale_date,
            salePrice: s.sale_price,
            grantor: s.grantor ?? null,
            grantee: s.grantee ?? null,
            deedType: s.deed_type ?? null,
            saleType: s.sale_type ?? null,
            sourceSystem: "canonical",
            qualified: s.is_qualified ?? null,
            exciseNumber: null,
          });
        }
      }

      // 2. Ascend sales (pre-2015) — look up lrsn from ascend_property by pin
      if (parcelNumber) {
        try {
          const { getPropertyByPin, getSales } = await import(
            "@/services/ascendConnector"
          );
          const ascendProp = await getPropertyByPin(parcelNumber);
          if (ascendProp?.lrsn) {
            const ascendSales = await getSales(ascendProp.lrsn);
            for (const s of ascendSales) {
              // Avoid duplicates — skip if we already have a canonical sale within 30 days of same price
              const isDuplicate = allSales.some(
                (existing) =>
                  existing.salePrice === s.sale_price &&
                  existing.saleDate &&
                  s.sale_date &&
                  Math.abs(
                    new Date(existing.saleDate).getTime() -
                      new Date(s.sale_date).getTime()
                  ) <
                    30 * 86400 * 1000
              );
              if (!isDuplicate) {
                allSales.push({
                  id: s.id,
                  saleDate: s.sale_date,
                  salePrice: s.sale_price,
                  grantor: s.grantor ?? null,
                  grantee: null,
                  deedType: null,
                  saleType:
                    s.source === "excise" ? "Excise" : "Land Record",
                  sourceSystem: "ascend",
                  qualified: null,
                  exciseNumber: s.excise_number ?? null,
                });
              }
            }
          }
        } catch {
          // Ascend tables may not exist — silently skip
        }
      }

      // 3. PACS sales
      if (parcelId) {
        try {
          // Get source_parcel_id (prop_id) from parcels
          const { data: parcel } = await supabase
            .from("parcels")
            .select("source_parcel_id")
            .eq("id", parcelId)
            .maybeSingle();

          const propId = parcel?.source_parcel_id;
          if (propId) {
            const { data: pacsSales } = await (supabase.from as any)(
              "pacs_sales"
            )
              .select("*")
              .eq("prop_id", Number(propId))
              .order("sale_date", { ascending: false });

            for (const s of pacsSales ?? []) {
              const isDuplicate = allSales.some(
                (existing) =>
                  existing.salePrice === s.sl_price &&
                  existing.saleDate &&
                  s.sl_dt &&
                  Math.abs(
                    new Date(existing.saleDate).getTime() -
                      new Date(s.sl_dt).getTime()
                  ) <
                    30 * 86400 * 1000
              );
              if (!isDuplicate) {
                allSales.push({
                  id: s.chg_of_owner_id ?? crypto.randomUUID(),
                  saleDate: s.sl_dt ?? null,
                  salePrice: s.sl_price ?? null,
                  grantor: null,
                  grantee: null,
                  deedType: s.sl_type ?? null,
                  saleType: "PACS",
                  sourceSystem: "pacs",
                  qualified: null,
                  exciseNumber: null,
                });
              }
            }
          }
        } catch {
          // PACS sales table may not exist
        }
      }

      // Sort by date descending
      allSales.sort((a, b) => {
        if (!a.saleDate && !b.saleDate) return 0;
        if (!a.saleDate) return 1;
        if (!b.saleDate) return -1;
        return (
          new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
        );
      });

      return allSales;
    },
  });
}
