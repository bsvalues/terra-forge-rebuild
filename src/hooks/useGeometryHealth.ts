// TerraFusion OS — Geometry Health Report Hook
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GeometryIssue {
  type: string;
  severity: "critical" | "warning" | "info";
  count: number;
  description: string;
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

export function useGeometryHealth() {
  return useQuery<GeometryHealthReport>({
    queryKey: ["geometry-health-report"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_geometry_health_report");
      if (error) throw error;
      return data as unknown as GeometryHealthReport;
    },
    staleTime: 60_000, // 1 minute — this is a diagnostic scan
    refetchOnWindowFocus: false,
  });
}
