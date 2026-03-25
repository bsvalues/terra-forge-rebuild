// TerraFusion OS — Parcel Characteristics Hook (Phase 209)
// Fetches building characteristics with PACS staging primary, Ascend fallback.

import { useQuery } from "@tanstack/react-query";

// Unified building characteristics from PACS (primary) or Ascend (fallback)
export interface BuildingCharacteristics {
  yearBuilt: number | null;
  finishedAreaSqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  conditionCode: string | null;
  conditionDesc: string | null;
  constructionClass: string | null;
  frameType: string | null;
  foundation: string | null;
  numStories: number | null;
  garageAreaSqft: number | null;
  basementAreaSqft: number | null;
  source: "pacs" | "ascend" | "parcels" | null;
  sourceYear: number | null; // year the data was last updated
}

export function useParcelCharacteristics(
  parcelId: string | null,
  lrsn: number | null
) {
  return useQuery<BuildingCharacteristics | null>({
    queryKey: ["parcel-characteristics", parcelId, lrsn],
    enabled: !!(parcelId || lrsn),
    staleTime: 300_000,
    queryFn: async () => {
      // 1. Try PACS staging (pacs_improvements) — untyped table, use (supabase.from as any)
      if (parcelId) {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: parcelData } = await supabase
          .from("parcels")
          .select("source_parcel_id, year_built, bedrooms, bathrooms, building_area")
          .eq("id", parcelId)
          .maybeSingle();

        const propId = parcelData?.source_parcel_id
          ? Number(parcelData.source_parcel_id)
          : null;

        if (propId) {
          const { data: pacsImpr, error: pacsErr } = await (supabase.from as any)(
            "pacs_improvements"
          )
            .select("*")
            .eq("prop_id", propId)
            .order("prop_val_yr", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!pacsErr && pacsImpr) {
            return {
              yearBuilt: pacsImpr.yr_built ?? null,
              finishedAreaSqft: pacsImpr.area_sqft ?? null,
              bedrooms: parcelData?.bedrooms ?? null,
              bathrooms: parcelData?.bathrooms ?? null,
              conditionCode: pacsImpr.condition_cd ?? null,
              conditionDesc: null,
              constructionClass: pacsImpr.const_class ?? null,
              frameType: null,
              foundation: null,
              numStories: pacsImpr.num_stories ?? null,
              garageAreaSqft: null,
              basementAreaSqft: null,
              source: "pacs" as const,
              sourceYear: pacsImpr.prop_val_yr ?? null,
            };
          }
        }

        // Fallback: return from parcels table basics if available
        if (parcelData && (parcelData.year_built || parcelData.building_area)) {
          return {
            yearBuilt: parcelData.year_built ?? null,
            finishedAreaSqft: parcelData.building_area ?? null,
            bedrooms: parcelData.bedrooms ?? null,
            bathrooms: parcelData.bathrooms ?? null,
            conditionCode: null,
            conditionDesc: null,
            constructionClass: null,
            frameType: null,
            foundation: null,
            numStories: null,
            garageAreaSqft: null,
            basementAreaSqft: null,
            source: "parcels" as const,
            sourceYear: null,
          };
        }
      }

      // 2. Ascend fallback (if lrsn available)
      if (lrsn) {
        const { getImprovements } = await import("@/services/ascendConnector");
        const improvements = await getImprovements(lrsn);
        if (improvements.length > 0) {
          const primary = improvements[0]; // most recent or primary improvement
          return {
            yearBuilt: primary.yr_built ?? null,
            finishedAreaSqft: primary.fin_size ?? null,
            bedrooms: primary.num_rooms ?? null,
            bathrooms: null,
            conditionCode: primary.cond_code ?? null,
            conditionDesc: primary.cond_desc ?? null,
            constructionClass: primary.const_frame ?? null,
            frameType: primary.const_frame ?? null,
            foundation: primary.foundation ?? null,
            numStories: primary.stories ? parseFloat(primary.stories) : null,
            garageAreaSqft: primary.att_gar_sf
              ? parseFloat(primary.att_gar_sf)
              : null,
            basementAreaSqft: primary.bsmt_area
              ? parseFloat(primary.bsmt_area)
              : null,
            source: "ascend" as const,
            sourceYear: null,
          };
        }
      }

      return null;
    },
  });
}
