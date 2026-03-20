// TerraFusion OS — Quality Pillar Data Hook
// Extracts direct supabase queries from QualityPillar (Data Constitution)

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

export function useQualityParcels() {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["quality-parcels", countyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("parcels")
        .select("id, parcel_number, address, assessed_value, latitude, longitude, neighborhood_code, year_built, building_area")
        .eq("county_id", countyId!)
        .limit(1000);
      return data || [];
    },
    enabled: !!countyId,
  });
}

export function useQualityPipelineEvents() {
  return useQuery({
    queryKey: ["quality-pipeline-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pipeline_events")
        .select("*")
        .eq("stage", "quality_scored")
        .order("created_at", { ascending: false })
        .limit(10);
      return (data || []) as any[];
    },
  });
}

export function useQualityIngestJobs() {
  return useQuery({
    queryKey: ["quality-ingest-jobs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ingest_jobs")
        .select("id, file_name, target_table, status, row_count, rows_imported, rows_failed, validation_results, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });
}

export function useQualityMetrics(parcels: any[] | undefined) {
  return {
    totalRecords: parcels?.length || 0,
    matchedRecords: parcels?.filter(p => p.latitude && p.longitude).length || 0,
    unmatchedRecords: parcels?.filter(p => !p.latitude || !p.longitude).length || 0,
    matchRate: parcels?.length ? ((parcels.filter(p => p.latitude && p.longitude).length / parcels.length) * 100) : 0,
    valuesMissing: parcels?.filter(p => !p.assessed_value || p.assessed_value === 0).length || 0,
    addressMissing: parcels?.filter(p => !p.address).length || 0,
    yearBuiltMissing: parcels?.filter(p => !p.year_built).length || 0,
    buildingAreaMissing: parcels?.filter(p => !p.building_area).length || 0,
    neighborhoodMissing: parcels?.filter(p => !p.neighborhood_code).length || 0,
  };
}
