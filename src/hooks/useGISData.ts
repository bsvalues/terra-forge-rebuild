import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

export interface GISDataSource {
  id: string;
  name: string;
  source_type: "ftp" | "arcgis" | "file_upload";
  connection_url: string | null;
  last_sync_at: string | null;
  sync_status: "pending" | "syncing" | "success" | "error";
  sync_error: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GISLayer {
  id: string;
  data_source_id: string | null;
  name: string;
  layer_type: "parcel" | "boundary" | "point" | "line" | "polygon";
  file_format: "shapefile" | "geojson" | "csv" | "kml" | "gdb" | null;
  feature_count: number;
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null;
  srid: number;
  properties_schema: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GISFeature {
  id: string;
  layer_id: string;
  parcel_id: string | null;
  geometry_type: "Point" | "LineString" | "Polygon" | "MultiPolygon";
  coordinates: any;
  properties: Record<string, any>;
  centroid_lat: number | null;
  centroid_lng: number | null;
  created_at: string;
}

export interface ParcelWithGeometry {
  id: string;
  parcel_number: string;
  address: string;
  assessed_value: number;
  neighborhood_code: string | null;
  latitude: number | null;
  longitude: number | null;
  ratio?: number;
  geometry?: GISFeature;
}

export function useGISDataSources() {
  return useQuery({
    queryKey: ["gis-data-sources"],
    queryFn: async (): Promise<GISDataSource[]> => {
      const { data, error } = await supabase
        .from("gis_data_sources")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as GISDataSource[];
    },
  });
}

export function useGISLayers(dataSourceId?: string) {
  return useQuery({
    queryKey: ["gis-layers", dataSourceId],
    queryFn: async (): Promise<GISLayer[]> => {
      let query = supabase
        .from("gis_layers")
        .select("*")
        .order("created_at", { ascending: false });

      if (dataSourceId) {
        query = query.eq("data_source_id", dataSourceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as GISLayer[];
    },
  });
}

export function useGISFeatures(layerId: string | undefined) {
  return useQuery({
    queryKey: ["gis-features", layerId],
    queryFn: async (): Promise<GISFeature[]> => {
      if (!layerId) return [];

      const { data, error } = await supabase
        .from("gis_features")
        .select("*")
        .eq("layer_id", layerId)
        .limit(5000);

      if (error) throw error;
      return (data || []) as GISFeature[];
    },
    enabled: !!layerId,
  });
}

export function useParcelsWithGeometry(studyPeriodId?: string, limit = 500) {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["parcels-with-geometry", countyId, studyPeriodId, limit],
    queryFn: async (): Promise<ParcelWithGeometry[]> => {
      if (!countyId) return [];

      const query = supabase
        .from("parcels")
        .select(`
          id,
          parcel_number,
          address,
          assessed_value,
          neighborhood_code,
          latitude,
          longitude
        `)
        .eq("county_id", countyId)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(limit);

      const { data: parcels, error: parcelError } = await query;
      if (parcelError) throw parcelError;

      if (studyPeriodId && parcels && parcels.length > 0) {
        const parcelIds = parcels.map((p) => p.id);
        const { data: ratios } = await supabase
          .from("assessment_ratios")
          .select("parcel_id, ratio")
          .eq("study_period_id", studyPeriodId)
          .in("parcel_id", parcelIds);

        const ratioMap = new Map(ratios?.map((r) => [r.parcel_id, r.ratio]) || []);

        return parcels.map((p) => ({
          ...p,
          ratio: ratioMap.get(p.id) || undefined,
        }));
      }

      return parcels || [];
    },
    enabled: !!countyId,
  });
}

export function useCreateDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (source: Partial<GISDataSource>) => {
      const { data, error } = await supabase
        .from("gis_data_sources")
        .insert([{ name: source.name!, source_type: source.source_type!, ...source }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gis-data-sources"] });
      toast.success("Data source created");
    },
    onError: (error: any) => {
      toast.error(`Failed to create data source: ${error.message}`);
    },
  });
}

export function useSyncDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sourceId: string) => {
      const { data, error } = await supabase.functions.invoke("gis-sync", {
        body: { sourceId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gis-data-sources"] });
      queryClient.invalidateQueries({ queryKey: ["gis-layers"] });
      toast.success("Sync initiated");
    },
    onError: (error: any) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });
}

export function useParseGISFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, layerName }: { file: File; layerName: string }) => {
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("gis-files")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase.functions.invoke("gis-parse", {
        body: { fileName, layerName },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gis-layers"] });
      queryClient.invalidateQueries({ queryKey: ["gis-features"] });
      toast.success("GIS file parsed successfully");
    },
    onError: (error: any) => {
      toast.error(`Parse failed: ${error.message}`);
    },
  });
}

export function useNeighborhoodGeoStats(studyPeriodId?: string) {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["neighborhood-geo-stats", countyId, studyPeriodId],
    queryFn: async () => {
      if (!studyPeriodId || !countyId) return [];

      const { data, error } = await supabase
        .from("assessment_ratios")
        .select(`
          ratio,
          parcels!inner (
            county_id,
            neighborhood_code,
            latitude,
            longitude
          )
        `)
        .eq("study_period_id", studyPeriodId)
        .eq("is_outlier", false)
        .eq("parcels.county_id", countyId);

      if (error) throw error;

      const neighborhoods: Record<string, { ratios: number[]; lats: number[]; lngs: number[] }> = {};

      (data || []).forEach((item: any) => {
        const parcel = Array.isArray(item.parcels) ? item.parcels[0] : item.parcels;
        const nbhd = parcel?.neighborhood_code || "Unknown";
        if (!neighborhoods[nbhd]) {
          neighborhoods[nbhd] = { ratios: [], lats: [], lngs: [] };
        }
        if (item.ratio) neighborhoods[nbhd].ratios.push(item.ratio);
        if (parcel?.latitude) neighborhoods[nbhd].lats.push(parcel.latitude);
        if (parcel?.longitude) neighborhoods[nbhd].lngs.push(parcel.longitude);
      });

      return Object.entries(neighborhoods)
        .filter(([, stats]) => stats.ratios.length > 0)
        .map(([code, stats]) => {
          const avgRatio = stats.ratios.reduce((a, b) => a + b, 0) / stats.ratios.length;
          const centerLat = stats.lats.reduce((a, b) => a + b, 0) / stats.lats.length;
          const centerLng = stats.lngs.reduce((a, b) => a + b, 0) / stats.lngs.length;
          const median = [...stats.ratios].sort((a, b) => a - b)[Math.floor(stats.ratios.length / 2)];
          const avgDeviation = stats.ratios.reduce((a, r) => a + Math.abs(r - median), 0) / stats.ratios.length;
          const cod = (avgDeviation / median) * 100;

          return {
            code,
            count: stats.ratios.length,
            avgRatio,
            median,
            cod,
            centerLat,
            centerLng,
            deviation: avgRatio - 1.0,
          };
        });
    },
    enabled: !!studyPeriodId && !!countyId,
  });
}
