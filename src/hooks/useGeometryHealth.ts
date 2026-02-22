// TerraFusion OS — Geometry Health Report Hook
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GeometryIssue {
  type: string;
  severity: "critical" | "warning" | "info";
  count: number;
  description: string;
}

export interface WGS84BackfillStatus {
  total_with_raw: number;
  backfilled: number;
  raw_wgs84: number;
  converted_2286: number;
  unknown: number;
  pct: number;
}

export interface SectionData {
  issues: GeometryIssue[];
  [key: string]: unknown;
}

export interface GeometryHealthReport {
  report_time: string;
  county_id: string;
  overall_severity: "healthy" | "critical" | "degraded" | "warning";
  total_issues: number;
  sections: {
    parcel_coordinates: SectionData & {
      total_parcels: number;
      with_coordinates: number;
      missing_coordinates: number;
      coverage_pct: number;
      out_of_conus_bounds: number;
      zero_coordinates: number;
      duplicate_locations: number;
      invalid_latitude: number;
      invalid_longitude: number;
      wgs84_backfill: WGS84BackfillStatus;
    };
    gis_features: SectionData & {
      total_layers: number;
      total_features: number;
      orphan_features: number;
      missing_centroids: number;
      empty_coordinates: number;
      distinct_srids: number;
      parcels_with_features: number;
      features_without_parcel: number;
    };
    neighborhood_coverage: SectionData & {
      total_neighborhoods: number;
      parcels_without_neighborhood: number;
      neighborhoods_without_geometry: number;
    };
  };
}

export interface BackfillResult {
  county_id: string;
  updated: number;
  skipped_unknown: number;
  already_done: number;
  remaining: number;
  batch_limit: number;
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
        description: `${result.updated} converted, ${result.remaining} remaining`,
      });
      qc.invalidateQueries({ queryKey: ["geometry-health-report"] });
    },
    onError: (err) => {
      toast.error("Backfill failed", { description: err.message });
    },
  });
}
