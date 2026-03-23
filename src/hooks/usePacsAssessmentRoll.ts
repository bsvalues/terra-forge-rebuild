import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PacsAssessmentRollEntry {
  id: string;
  county_id: string;
  prop_id: number;
  geo_id: string | null;
  owner_id: number | null;
  owner_name: string | null;
  imprv_hstd_val: number | null;
  imprv_non_hstd_val: number | null;
  land_hstd_val: number | null;
  land_non_hstd_val: number | null;
  timber_market: number | null;
  ag_market: number | null;
  appraised_classified: number | null;
  appraised_non_classified: number | null;
  taxable_classified: number | null;
  taxable_non_classified: number | null;
  tax_area_id: number | null;
  tax_area_desc: string | null;
  situs_display: string | null;
  property_use_cd: string | null;
  state_cd: string | null;
  roll_year: number | null;
}

export function usePacsAssessmentRoll(propId: number | null) {
  return useQuery({
    queryKey: ["pacs-assessment-roll", propId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacs_assessment_roll")
        .select("*")
        .eq("prop_id", propId!)
        .order("roll_year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PacsAssessmentRollEntry[];
    },
    enabled: !!propId,
    staleTime: 60000,
  });
}

export function usePacsAssessmentRollByGeo(geoId: string | null) {
  return useQuery({
    queryKey: ["pacs-assessment-roll-geo", geoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacs_assessment_roll")
        .select("*")
        .eq("geo_id", geoId!)
        .order("roll_year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PacsAssessmentRollEntry[];
    },
    enabled: !!geoId,
    staleTime: 60000,
  });
}
