// TerraFusion OS — Feature Completeness / Readiness Score Hook (v2)
// Dual indices: model_readiness vs roll_readiness
// Calls compute_readiness_score RPC for always-on data quality metrics

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReadinessSummary {
  total_parcels: number;
  model_readiness_index: number;
  roll_readiness_index: number;
  model_ready: number;
  model_partial: number;
  model_at_risk: number;
  roll_ready: number;
  model_ready_after_backfill: number;
  convertible_2927_count: number;
}

export interface FieldCoverage {
  effective_coords: number;
  building_area: number;
  year_built: number;
  property_class: number;
  land_area: number;
  situs_address: number;
  assessed_value: number;
  bedrooms: number;
  bathrooms: number;
  neighborhood: number;
}

export interface NeighborhoodReadiness {
  code: string;
  parcel_count: number;
  readiness_index: number;
  parcels_ready: number;
  parcels_at_risk: number;
  worst_field: string | null;
  worst_field_pct: number | null;
}

export interface MissingCombo {
  pattern: string;
  count: number;
}

export interface ReadinessScoreData {
  schema_version: number;
  county_id: string;
  computed_at: string;
  summary: ReadinessSummary;
  field_coverage: FieldCoverage;
  neighborhoods: NeighborhoodReadiness[];
  missing_combos: MissingCombo[];
  weights: {
    model: Record<string, number>;
    roll: Record<string, number>;
  };
  definitions: Record<string, string>;
}

const COMBO_LABELS: Record<string, string> = {
  // Legacy single-label patterns
  no_building_record: "No Building Record (missing GLA + year built)",
  gis_only_no_address: "GIS-Only (coords but no situs address)",
  value_no_characteristics: "Value Without Characteristics",
  address_only_no_coords: "Address Only (no coordinates)",
  coords_no_neighborhood: "Coordinates Without Neighborhood",
};

/** Format bitmask combo keys like "no_coords,no_gla" into readable labels */
export function getComboLabel(pattern: string): string {
  // Check legacy labels first
  if (COMBO_LABELS[pattern]) return COMBO_LABELS[pattern];

  // Parse bitmask keys
  const PART_LABELS: Record<string, string> = {
    no_coords: "No Coords",
    no_gla: "No GLA",
    no_yr: "No Year Built",
    no_land: "No Land Area",
    no_nh: "No Neighborhood",
    no_situs: "No Situs",
  };

  const parts = pattern.split(",").filter(Boolean);
  if (parts.length === 0) return pattern;
  return parts.map((p) => PART_LABELS[p.trim()] || p.trim()).join(" + ");
}

const FIELD_LABELS: Record<string, string> = {
  effective_coords: "Effective Coordinates",
  building_area: "Building Area (GLA)",
  year_built: "Year Built",
  property_class: "Property Class",
  land_area: "Land Area",
  situs_address: "Situs Address",
  assessed_value: "Assessed Value",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  neighborhood: "Neighborhood",
};

export function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}

export function useReadinessScore() {
  return useQuery({
    queryKey: ["readiness-score"],
    queryFn: async (): Promise<ReadinessScoreData> => {
      const { data, error } = await supabase.rpc("compute_readiness_score" as any);
      if (error) throw error;
      return data as unknown as ReadinessScoreData;
    },
    staleTime: 5 * 60_000, // 5 min cache
  });
}
