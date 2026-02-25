// TerraFusion OS — Geometry Health Report Hook
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GeometryIssue {
  type: string;
  severity: "critical" | "warning" | "info" | "error";
  count: number;
  description: string;
}

export interface WGS84BackfillStatus {
  completed: number;
  total_eligible: number;
  remaining: number;
  pct_done: number;
}

export interface CoordinateQuality {
  usable_wgs84: number;
  raw_present: number;
  raw_any_present: number;
  null_coordinates: number;
  zero_coordinates: number;
  invalid_wgs84: number;
  convertible_wkid_2927: number;
  out_of_conus_bounds: number;
  duplicate_coordinate_groups: number;
}

export interface GeometryHealthDefinitions {
  usable_wgs84: string;
  raw_present: string;
  raw_any_present: string;
  convertible_wkid_2927: string;
  null_coordinates: string;
  out_of_conus_bounds: string;
  duplicate_coordinate_groups: string;
  zero_severity_denominator: string;
  effective_coord_rule: string;
  backfill_completed: string;
  backfill_eligible: string;
}

export interface GeometryHealthReport {
  schema_version: number;
  county_id: string;
  total_parcels: number;
  generated_at: string;
  definitions: GeometryHealthDefinitions;
  sections: {
    coordinate_quality: CoordinateQuality;
    wgs84_backfill: WGS84BackfillStatus;
  };
  issues: GeometryIssue[];
}

export interface BackfillResult {
  county_id: string;
  updated: number;
  skipped_unknown: number;
  limit: number;
  assumed_projected_wkid: number;
}

export function useGeometryHealth() {
  return useQuery<GeometryHealthReport>({
    queryKey: ["geometry-health-report"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_geometry_health_report");
      if (error) throw error;
      return data as unknown as GeometryHealthReport;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useBackfillWGS84() {
  const qc = useQueryClient();
  return useMutation<BackfillResult, Error, { countyId: string; limit?: number }>({
    mutationFn: async ({ countyId, limit = 5000 }) => {
      const { data, error } = await supabase.rpc("backfill_parcel_wgs84_from_raw", {
        p_county_id: countyId,
        p_limit: limit,
      });
      if (error) throw error;
      return data as unknown as BackfillResult;
    },
    onSuccess: (result) => {
      toast.success(`SRID backfill complete`, {
        description: `${result.updated} converted, ${result.skipped_unknown} skipped`,
      });
      qc.invalidateQueries({ queryKey: ["geometry-health-report"] });
    },
    onError: (err) => {
      toast.error("Backfill failed", { description: err.message });
    },
  });
}
