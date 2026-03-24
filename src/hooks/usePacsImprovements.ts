import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PacsImprovement {
  id: string;
  county_id: string;
  prop_id: number;
  prop_val_yr: number;
  sup_num: number | null;
  imprv_id: number;
  imprv_type_cd: string | null;
  imprv_desc: string | null;
  imprv_val: number | null;
  flat_val: number | null;
  imprv_val_source: string | null;
  economic_pct: number | null;
  physical_pct: number | null;
  functional_pct: number | null;
}

export interface PacsImprovementDetail {
  id: string;
  county_id: string;
  prop_id: number;
  prop_val_yr: number;
  sup_num: number | null;
  imprv_id: number;
  imprv_det_id: number;
  imprv_det_type_cd: string | null;
  imprv_det_class_cd: string | null;
  imprv_det_area: number | null;
  imprv_det_val: number | null;
  actual_year_built: number | null;
  yr_remodel: number | null;
  condition_cd: string | null;
  quality_cd: string | null;
  living_area: number | null;
  num_bedrooms: number | null;
  total_bath: number | null;
}

export function usePacsImprovements(propId: number | null) {
  return useQuery({
    queryKey: ["pacs-improvements", propId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("pacs_improvements")
        .select("*")
        .eq("prop_id", propId!)
        .order("prop_val_yr", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PacsImprovement[];
    },
    enabled: !!propId,
    staleTime: 60000,
  });
}

export function usePacsImprovementDetails(propId: number | null, imprvId: number | null) {
  return useQuery({
    queryKey: ["pacs-improvement-details", propId, imprvId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacs_improvement_details")
        .select("*")
        .eq("prop_id", propId!)
        .eq("imprv_id", imprvId!)
        .order("imprv_det_id", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PacsImprovementDetail[];
    },
    enabled: !!propId && !!imprvId,
    staleTime: 60000,
  });
}
